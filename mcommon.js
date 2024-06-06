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

export function bindReplies(replies, e = new Env()) {
  for (const tag of Object.getOwnPropertySymbols(replies)) {
    const byTag = replies[tag];
    for (const verb in byTag) {
      e.bindReply(tag, verb, byTag[verb]);
    }
  }
  return e;
}

export function toStr(v, e) {
  return e.sendMsg(v, new Msg("toStr", NIL));
}

export const TO_STR = {
  [TAG_TAG]: {
    toStr: (s) => s.toString(),
  },
  [ANY_TAG]: {
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
    toStr: (s, _o, e, m) => `${e.sendMsg(s.a, m)} : ${e.sendMsg(s.b, m)}`,
  },
  [BLOCK_TAG]: {
    toStr: (s, _o, e, m) =>
      `{${s.value.map((v, _i, _) => e.sendMsg(v, m)).join(", ")}}`,
  },
  [ARRAY_TAG]: {
    toStr: (s, _o, e, m) =>
      `[${s.map((v, _i, _) => e.sendMsg(v, m)).join(", ")}]`,
  },
  [MAP_TAG]: {
    toStr: (s, _o, e, m) =>
      `#{${Array.from(s.entries())
        .map(([k, v], _i, _) => `${e.sendMsg(k, m)}: ${e.sendMsg(v, m)}`)
        .join(", ")}}`,
  },
  [MSG_TAG]: {
    toStr: (s, _o, e, m) => `\\ ${s.verb} ${e.sendMsg(s.obj, m)}`,
  },
  [SEND_TAG]: {
    toStr: (s, _o, e, m) =>
      `${e.sendMsg(s.subj, m)} ${s.msg.verb} ${e.sendMsg(s.msg.obj, m)}`,
  },
  [LATER_TAG]: {
    toStr: (s, _o, e, m) =>
      getTag(s.value) === SEND_TAG
        ? `@(${e.sendMsg(s.value, m)})`
        : `@${e.sendMsg(s.value, m)}`,
  },
};
