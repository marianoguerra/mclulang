#!/usr/bin/env bun
/*globals Bun*/
import {
  Pair,
  Msg,
  Send,
  NIL,
  Frame,
  run,
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

function bindReplies(replies, e = new Frame()) {
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

function toStr(v, e) {
  return e.send(v, new Msg("toStr", NIL));
}

function fwd(s, m, e) {
  return e.eval(new Send(s, m));
}

function bop(fn) {
  return (_s, _m, e) => fn(e.find("it"), e.find("that"));
}

function ternary(_s, m, e) {
  return e.eval(m.obj.a);
}

function main(code) {
  const e = bindReplies({
    [TYPE_NAME]: { eval: (s, _m, e) => e.find(s.value), toStr: (s) => s.value },
    [TYPE_MSG]: {
      eval: (s, _m, e) => new Msg(s.verb, e.eval(s.obj)),
      toStr: (s, m, e) => `\\ ${s.verb} ${fwd(s.obj, m, e)}`,
    },
    [TYPE_SEND]: {
      eval(s, _m, e) {
        const subj = e.eval(s.subj),
          msg = e.eval(s.msg);
        return e
          .down()
          .setUpLimit()
          .bind("it", subj)
          .bind("msg", msg)
          .bind("that", msg.obj)
          .send(subj, msg);
      },
      toStr: (s, m, e) =>
        `${fwd(s.subj, m, e)} ${s.msg.verb} ${fwd(s.msg.obj, m, e)}`,
    },
    [TYPE_INT]: {
      eval: (s) => s,
      "+": bop((a, b) => a + b),
      "-": bop((a, b) => a - b),
      "*": bop((a, b) => a * b),
      "/": bop((a, b) => a / b),
      "?": ternary,
      toStr: (s) => s.toString(),
    },
    [TYPE_NIL]: {
      eval: (s) => s,
      "?": (_s, m, e) => e.eval(m.obj.b),
      toStr: () => "()",
    },
    [TYPE_PAIR]: {
      eval: (s, _m, e) => new Pair(e.eval(s.a), e.eval(s.b)),
      "?": ternary,
      toStr: (s, m, e) => `${fwd(s.a, m, e)} : ${fwd(s.b, m, e)}`,
    },
    [TYPE_LATER]: {
      eval: (s) => s.value,
      toStr: (s, m, e) => fwd(s.value, m, e),
    },
    [TYPE_BLOCK]: {
      eval: (s, _m, e) => {
        let r = NIL;
        for (const item of s.value) {
          r = e.eval(item);
        }
        return r;
      },
      toStr: (s, m, e) =>
        `{${s.value.map((item) => fwd(item, m, e)).join(", ")}}`,
    },
    [TYPE_FLOAT]: {
      eval: (s) => s,
      "+": bop((a, b) => a + b),
      "?": ternary,
      toStr: (s) => JSON.stringify(s),
    },
    [TYPE_STR]: {
      eval: (s) => s,
      "+": bop((a, b) => a + b),
      "?": ternary,
      toStr: (s) => JSON.stringify(s),
      "as-type"(s, _m, e) {
        const type = Symbol(s);
        e.left.bind(
          type,
          new Frame().bind("eval", (s) => s),
        );
        return type;
      },
    },
    [TYPE_ARRAY]: {
      eval: (s, _m, e) => s.map((item) => e.eval(item)),
      "?": ternary,
      toStr: (s, m, e) => `[${s.map((item) => fwd(item, m, e)).join(", ")}]`,
    },
    [TYPE_MAP]: {
      eval: (s, _m, e) => {
        const r = new Map();
        for (const [k, v] of s.entries()) {
          r.set(e.eval(k), e.eval(v));
        }
        return r;
      },
      ".": (s, m, _e) => s.get(m.obj) ?? NIL,
      "?": ternary,
      toStr: (s, m, e) =>
        `#{${Array.from(s.entries())
          .map(([k, v], _i, _) => `${fwd(k, m, e)}: ${fwd(v, m, e)}`)
          .join(", ")}}`,
    },
    [TYPE_SYM]: {
      eval: (s) => s,
      "?": ternary,
      toStr: (s) => `(${JSON.stringify(s.description)} as-type ())`,
    },
  }).right();

  console.log("> ", code);
  console.log(toStr(run(code, e), e));
}

for (const line of Bun.argv.slice(2)) {
  main(line);
}
