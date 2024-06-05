#!/usr/bin/env bun
/*globals Bun*/
import {
  ANY_TAG,
  ARRAY_TAG,
  BLOCK_TAG,
  Block,
  Env,
  FLOAT_TAG,
  getTag,
  INT_TAG,
  LATER_TAG,
  Later,
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
  Send,
  STR_TAG,
  TAG_TAG,
} from "./mclulang.js";

Function.prototype.handleMsg = function (e, s, m) {
  return this(s, m.obj, e, m);
};

const DEFAULT_CODE = "{(0 add 0) does {it + that}, 1 add 3}";

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

function maybeLater(v) {
  return v instanceof Later ? v : new Later(v);
}

function main(code = DEFAULT_CODE) {
  const e = bindReplies({
    [TAG_TAG]: {
      eval: (s) => s,
      toStr: (s) => s.toString(),
    },
    [ANY_TAG]: {
      eval: (s, _o, _e) => s,
      toStr: (s) => "UNK.toStr(" + s + ")",
    },
    [NIL_TAG]: {
      toStr: (_s) => "()",
    },
    [INT_TAG]: {
      toStr: (s) => s.toString(),
    },
    [FLOAT_TAG]: {
      toStr: (s) => s.toString(),
    },
    [STR_TAG]: {
      toStr: (s) => JSON.stringify(s),
    },
    [NAME_TAG]: {
      toStr: (s) => s.value,
    },
    [PAIR_TAG]: {
      eval: (s, _o, e) => {
        return new Pair(e.eval(s.a), e.eval(s.b));
      },
      toStr: (s, _o, e, m) => `${e.sendMsg(s.a, m)} : ${e.sendMsg(s.b, m)}`,
    },
    [BLOCK_TAG]: {
      eval: (s, _o, e) => {
        return new Block(s.value.map((v, _i, _) => e.eval(v)));
      },
      toStr: (s, _o, e, m) =>
        `{${s.value.map((v, _i, _) => e.sendMsg(v, m)).join(", ")}}`,
    },
    [ARRAY_TAG]: {
      eval: (s, _o, e) => {
        return s.map((v, _i, _) => e.eval(v));
      },
      toStr: (s, _o, e, m) =>
        `[${s.map((v, _i, _) => e.sendMsg(v, m)).join(", ")}]`,
    },
    [MAP_TAG]: {
      eval: (s, _o, e) => {
        const r = new Map();
        for (const [k, v] of s.entries()) {
          r.set(e.eval(k), e.eval(v));
        }
        return r;
      },
      toStr: (s, _o, e, m) =>
        `#{${Array.from(s.entries())
          .map(([k, v], _i, _) => `${e.sendMsg(k, m)}: ${e.sendMsg(v, m)}`)
          .join(", ")}}`,
    },
    [MSG_TAG]: {
      toStr: (s, _o, e, m) => `\\ ${s.verb} ${e.sendMsg(s.obj, m)}`,
    },
    [SEND_TAG]: {
      eval: (s, _o, e, _m) => {
        if (s.msg.verb === "does") {
          return new Send(
            maybeLater(e.eval(s.subj)),
            new Msg(s.msg.verb, maybeLater(e.eval(s.msg.obj))),
          );
        } else {
          return new Send(
            e.eval(s.subj),
            new Msg(s.msg.verb, e.eval(s.msg.obj)),
          );
        }
      },
      toStr: (s, _o, e, m) =>
        `${e.sendMsg(s.subj, m)} ${s.msg.verb} ${e.sendMsg(s.msg.obj, m)}`,
    },
    [LATER_TAG]: {
      eval: (s, _o, e) => {
        return new Later(e.eval(s.value));
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
