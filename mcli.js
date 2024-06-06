#!/usr/bin/env bun
/*globals Bun*/
import {
  ANY_TAG,
  ARRAY_TAG,
  BLOCK_TAG,
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
import { toStr, TO_STR, bindReplies } from "./mcommon.js";

const DEFAULT_CODE = "{@(0 add 0) does @{it + that}, 1 add 3}";
function main(code = DEFAULT_CODE) {
  const log = () => {},
    //log = console.log.bind(console),
    e = bindReplies(TO_STR);

  bindReplies(
    {
      [TAG_TAG]: {
        eval: (s) => s,
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
      },
      [NIL_TAG]: {
        eval: (s) => {
          log("eval nil!");
          return s;
        },
        "?": (_s, o, e) => e.eval(o.b),
      },
      [INT_TAG]: {
        eval: (s) => {
          log("eval int!", s);
          return s;
        },
        "+": (s, o) => s + o,
      },
      [FLOAT_TAG]: {
        eval: (s) => {
          log("eval float!", s);
          return s;
        },
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
      },
      [PAIR_TAG]: {
        eval: (s, _o, e) => {
          log("eval pair!", toStr(s, e));
          return new Pair(e.eval(s.a), e.eval(s.b));
        },
        send: (s, _o, e, m) => new Pair(e.sendMsg(s.a, m), e.sendMsg(s.b, m)),
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
      },
      [ARRAY_TAG]: {
        eval: (s, _o, e) => {
          log("eval array!", toStr(s, e));
          return s.map((v, _i, _) => e.eval(v));
        },
        send: (s, _o, e, m) =>
          // NOTE: if forwards send and not the message itself so its recursive
          s.map((v, _i, _) => e.sendMsg(v, m)),
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
      },
      [MSG_TAG]: {
        eval: (s, _o, e) => {
          log("eval msg!", toStr(s, e));
          return new Msg(s.verb, e.eval(s.obj));
        },
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
      },
      [LATER_TAG]: {
        eval: (s, _o, e) => {
          log("eval later!", toStr(s, e));
          return s.value;
        },
      },
    },
    e,
  );

  console.log("> ", code);
  console.log(toStr(run(code, e), e));
}

for (const line of Bun.argv.slice(2)) {
  main(line);
}
