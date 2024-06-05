#!/usr/bin/env bun
/*globals Bun*/
import {
  ANY_TAG,
  ARRAY_TAG,
  BLOCK_TAG,
  Env,
  FLOAT_TAG,
  getTag,
  INT_TAG,
  LATER_TAG,
  MAP_TAG,
  Msg,
  MSG_TAG,
  NAME_TAG,
  NIL,
  NIL_TAG,
  Pair,
  PAIR_TAG,
  run,
  SEND_TAG,
  STR_TAG,
  TAG_TAG,
  tagSym,
} from "./mclulang.js";

Function.prototype.handleMsg = function (e, s, m) {
  return this(s, m.obj, e, m);
};

const DEFAULT_CODE = "{@(0 add 0) does @{it + that}, 1 add 3}";

function bindReplies(replies, e = new Env()) {
  for (const tag of Object.getOwnPropertySymbols(replies)) {
    const byTag = replies[tag];
    for (const verb in byTag) {
      e.bindReply(tag, verb, byTag[verb]);
    }
  }
  return e;
}

function toStr(v, e) {
  return e.sendMsg(v, new Msg("toStr", NIL));
}

function main(code = DEFAULT_CODE) {
  const log = () => {},
    //log = console.log.bind(console),
    e = bindReplies({
      [TAG_TAG]: {
        eval: (s) => s,
        toStr: (s) => s.toString(),
      },
      [ANY_TAG]: {
        eval: (s, _o, e) => {
          log("eval any!", toStr(s, e));
          return s;
        },
        "?": (_s, o, e) => e.eval(o.a),
        send: (s, _o, e, m) => e.sendMsg(s, m.obj),
        "apply-tag": (s, o) => {
          if (typeof o === "symbol") {
            s[tagSym] = o;
          } else {
            console.warn("apply-tag: invalid tag", o);
          }
          return s;
        },
        toStr: (s) => "UNK.toStr(" + s + ")",
      },
      [NIL_TAG]: {
        eval: (s) => {
          log("eval nil!");
          return s;
        },
        "?": (_s, o, e) => e.eval(o.b),
        toStr: (_s) => "()",
      },
      [INT_TAG]: {
        eval: (s) => {
          log("eval int!", s);
          return s;
        },
        "+": (s, o) => s + o,
        toStr: (s) => s.toString(),
      },
      [FLOAT_TAG]: {
        eval: (s) => {
          log("eval float!", s);
          return s;
        },
        toStr: (s) => s.toString(),
      },
      [STR_TAG]: {
        eval: (s) => {
          log("eval str!", s);
          return s;
        },
        "as-tag": (s, _o) => Symbol(s),
        "+": (s, o) => s + o,
        "*": (s, o) => {
          const r = new Array(o);
          for (let i = 0n; i < o; i++) {
            r[i] = s;
          }
          return r.join("");
        },
        toStr: (s) => JSON.stringify(s),
      },
      [NAME_TAG]: {
        eval: (s, _o, e) => {
          const v = e.find(s.value);
          log("eval name!", s.value, "->", toStr(v, e));
          return v;
        },
        is: (s, o, e) => {
          log("bind name!", s.value, o);
          e.parent.bind(s.value, o);
          return o;
        },
        toStr: (s) => s.value,
      },
      [PAIR_TAG]: {
        eval: (s, _o, e) => {
          log("eval pair!", toStr(s, e));
          return new Pair(e.eval(s.a), e.eval(s.b));
        },
        send: (s, _o, e, m) => new Pair(e.sendMsg(s.a, m), e.sendMsg(s.b, m)),
        toStr: (s, _o, e, m) => `${e.sendMsg(s.a, m)} : ${e.sendMsg(s.b, m)}`,
      },
      [BLOCK_TAG]: {
        eval: (s, _o, e) => {
          log("eval block!", toStr(s, e));
          let r = NIL;
          for (const item of s.value) {
            r = e.eval(item);
          }
          return r;
        },
        toStr: (s, _o, e, m) =>
          `{${s.value.map((v, _i, _) => e.sendMsg(v, m)).join(", ")}}`,
      },
      [ARRAY_TAG]: {
        eval: (s, _o, e) => {
          log("eval array!", toStr(s, e));
          return s.map((v, _i, _) => e.eval(v));
        },
        send: (s, _o, e, m) =>
          // NOTE: if forwards send and not the message itself so its recursive
          s.map((v, _i, _) => e.sendMsg(v, m)),
        toStr: (s, _o, e, m) =>
          `[${s.map((v, _i, _) => e.sendMsg(v, m)).join(", ")}]`,
      },
      [MAP_TAG]: {
        eval: (s, _o, e) => {
          log("eval map!", toStr(s, e));
          const r = new Map();
          for (const [k, v] of s.entries()) {
            r.set(e.eval(k), e.eval(v));
          }
          return r;
        },
        ".": (s, o) => {
          return s.get(o) ?? NIL;
        },
        toStr: (s, _o, e, m) =>
          `#{${Array.from(s.entries())
            .map(([k, v], _i, _) => `${e.sendMsg(k, m)}: ${e.sendMsg(v, m)}`)
            .join(", ")}}`,
      },
      [MSG_TAG]: {
        eval: (s, _o, e) => {
          log("eval msg!", toStr(s, e));
          return new Msg(s.verb, e.eval(s.obj));
        },
        toStr: (s, _o, e, m) => `\\ ${s.verb} ${e.sendMsg(s.obj, m)}`,
      },
      [SEND_TAG]: {
        eval: (s, _o, e) => {
          log("eval send!", toStr(s, e));
          const subj = e.eval(s.subj),
            msg = e.eval(s.msg);
          return e
            .enter()
            .bind("it", subj)
            .bind("msg", msg)
            .bind("that", msg.obj)
            .sendMsg(subj, msg);
        },
        does: (s, o, e) => {
          const tag = getTag(e.eval(s.subj)),
            verb = s.msg.verb;
          e.parent.bindReply(tag, verb, o);
          return o;
        },
        toStr: (s, _o, e, m) =>
          `${e.sendMsg(s.subj, m)} ${s.msg.verb} ${e.sendMsg(s.msg.obj, m)}`,
      },
      [LATER_TAG]: {
        eval: (s, _o, e) => {
          log("eval later!", toStr(s, e));
          return s.value;
        },
        toStr: (s, _o, e, m) =>
          getTag(s.value) === SEND_TAG
            ? `@(${e.sendMsg(s.value, m)})`
            : `@${e.sendMsg(s.value, m)}`,
      },
    });

  console.log("> ", code);
  console.log(toStr(run(code, e), e));
}

for (const line of Bun.argv.slice(2)) {
  main(line);
}
