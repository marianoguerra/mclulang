#!/usr/bin/env bun
/*globals Bun*/
import {
  Pair,
  Msg,
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
import { bindReplies, mergeToStr, bop, toStr } from "./fatt.common.js";

function ternary(_s, m, e) {
  return e.eval(m.obj.a);
}

function main(code) {
  const e = bindReplies(
    mergeToStr({
      [TYPE_NAME]: {
        eval: (s, _m, e) => e.find(s.value),
        is(s, m, e) {
          e.up.bind(s.value, m.obj);
          return m.obj;
        },
      },
      [TYPE_MSG]: {
        eval: (s, _m, e) => new Msg(s.verb, e.eval(s.obj)),
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
        replies(s, m, e) {
          const target = e.up.eval(s.subj),
            targetType = getType(target),
            msgVerb = s.msg.verb,
            impl = m.obj,
            proto = e.up.find(targetType);

          proto.bind(msgVerb, impl);
          return NIL;
        },
      },
      [TYPE_INT]: {
        eval: (s) => s,
        "+": bop((a, b) => a + b),
        "-": bop((a, b) => a - b),
        "*": bop((a, b) => a * b),
        "/": bop((a, b) => a / b),
        "?": ternary,
      },
      [TYPE_NIL]: {
        eval: (s) => s,
        "?": (_s, m, e) => e.eval(m.obj.b),
      },
      [TYPE_PAIR]: {
        eval: (s, _m, e) => new Pair(e.eval(s.a), e.eval(s.b)),
        "?": ternary,
      },
      [TYPE_LATER]: {
        eval: (s) => s.value,
      },
      [TYPE_BLOCK]: {
        eval: (s, _m, e) => {
          let r = NIL;
          for (const item of s.value) {
            r = e.eval(item);
          }
          return r;
        },
      },
      [TYPE_FLOAT]: {
        eval: (s) => s,
        "+": bop((a, b) => a + b),
        "?": ternary,
      },
      [TYPE_STR]: {
        eval: (s) => s,
        "+": bop((a, b) => a + b),
        "?": ternary,
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
      },
      [TYPE_SYM]: {
        eval: (s) => s,
        "?": ternary,
      },
    }),
  ).right();

  console.log("> ", code);
  console.log(toStr(run(code, e), e));
}

for (const line of Bun.argv.slice(2)) {
  main(line);
}
