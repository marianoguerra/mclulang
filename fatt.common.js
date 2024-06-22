import {
  Pair,
  Msg,
  Send,
  NIL,
  Frame,
  run,
  getType,
  TYPE_NAME,
  TYPE_MSG,
  TYPE_SEND,
  TYPE_INT,
  TYPE_NIL,
  TYPE_PAIR,
  TYPE_LATER,
  TYPE_BLOCK,
  TYPE_FLOAT,
  TYPE_STR,
  TYPE_ARRAY,
  TYPE_MAP,
  TYPE_SYM,
} from "./fatt.js";

const toStrReplies = {
  [TYPE_NAME]: {
    toStr: (s) => s.value,
  },
  [TYPE_MSG]: {
    toStr: (s, m, e) => `\\ ${s.verb} ${fwd(s.obj, m, e)}`,
  },
  [TYPE_SEND]: {
    toStr: (s, m, e) =>
      `${fwd(s.subj, m, e)} ${s.msg.verb} ${fwd(s.msg.obj, m, e)}`,
  },
  [TYPE_INT]: {
    toStr: (s) => s.toString(),
  },
  [TYPE_NIL]: {
    toStr: () => "()",
  },
  [TYPE_PAIR]: {
    toStr: (s, m, e) => `${fwd(s.a, m, e)} : ${fwd(s.b, m, e)}`,
  },
  [TYPE_LATER]: {
    toStr: (s, m, e) => fwd(s.value, m, e),
  },
  [TYPE_BLOCK]: {
    toStr: (s, m, e) =>
      `{${s.value.map((item) => fwd(item, m, e)).join(", ")}}`,
  },
  [TYPE_FLOAT]: {
    toStr: (s) => JSON.stringify(s),
  },
  [TYPE_STR]: {
    toStr: (s) => JSON.stringify(s),
  },
  [TYPE_ARRAY]: {
    toStr: (s, m, e) => `[${s.map((item) => fwd(item, m, e)).join(", ")}]`,
  },
  [TYPE_MAP]: {
    toStr: (s, m, e) =>
      `#{${Array.from(s.entries())
        .map(([k, v], _i, _) => `${fwd(k, m, e)}: ${fwd(v, m, e)}`)
        .join(", ")}}`,
  },
  [TYPE_SYM]: {
    toStr: (s) => `(${JSON.stringify(s.description)} as-type ())`,
  },
};

export function mergeToStr(replies) {
  for (const tag of Object.getOwnPropertySymbols(replies)) {
    replies[tag].toStr = toStrReplies[tag].toStr;
  }

  return replies;
}

export function bindReplies(replies, e = new Frame()) {
  for (const tag of Object.getOwnPropertySymbols(replies)) {
    const byTag = replies[tag],
      frame = new Frame();
    for (const verb in byTag) {
      frame.bind(verb, byTag[verb]);
    }
    e.bind(tag, frame);
  }
  return e;
}

export function toStr(v, e) {
  return e.send(v, new Msg("toStr", NIL));
}

export function fwd(s, m, e) {
  return e.eval(new Send(s, m));
}

export function bop(fn) {
  return (_s, _m, e) => fn(e.find("it"), e.find("that"));
}
