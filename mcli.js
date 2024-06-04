#!/usr/bin/env bun
import {
  run,
  env,
  INT_TAG,
  STR_TAG,
  NIL_TAG,
  ANY_TAG,
  SEND_TAG,
  PAIR_TAG,
  ARRAY_TAG,
  Nil,
  Pair,
  getTag,
} from "./mclulang.js";

const DEFAULT_CODE = "{@(0 add 0) does @{it + that}, 1 add 3}",
  toStrSym = Symbol("toString");

function setToStr(Cls, fn) {
  Cls.prototype[toStrSym] = fn;
}
function toStr(v) {
  return v[toStrSym]();
}

setToStr(Nil, function () {
  return "()";
});
setToStr(Pair, function () {
  return `${toStr(this.a)} : ${toStr(this.b)}`;
});
setToStr(Array, function () {
  return `[${this.map((v, _i, _) => toStr(v)).join(", ")}]`;
});
setToStr(String, function () {
  return "'" + this + "'";
});

function setDefToStr(Cls) {
  setToStr(Cls, Cls.prototype.toString);
}
setDefToStr(BigInt);
setDefToStr(Number);

function main(code = DEFAULT_CODE) {
  const e = env()
    .bindHandler(INT_TAG, "+", (s, o) => s + o)
    .bindHandler(STR_TAG, "+", (s, o) => s + o)
    .bindHandler(STR_TAG, "*", (s, o) => {
      const r = new Array(o);
      for (let i = 0n; i < o; i++) {
        r[i] = s;
      }
      return r.join("");
    })
    .bindHandler(NIL_TAG, "?", (_s, o, e) => e.eval(o.b))
    .bindHandler(ANY_TAG, "?", (_s, o, e) => e.eval(o.a))
    .bindHandler(ANY_TAG, "send", (s, _o, e, m) =>
      e.dispatchMessage(s, m.object),
    )
    .bindHandler(
      PAIR_TAG,
      "send",
      (s, _o, e, m) =>
        new Pair(e.dispatchMessage(s.a, m), e.dispatchMessage(s.b, m)),
    )
    .bindHandler(ARRAY_TAG, "send", (s, _o, e, m) =>
      // NOTE: if forwards send and not the message itself so its recursive
      s.map((v, _i, _) => e.dispatchMessage(v, m)),
    )
    .bindHandler(SEND_TAG, "does", (s, o, e, m) => {
      const tag = getTag(e.eval(s.subject)),
        verb = s.msg.verb;
      e.parent.bindHandler(tag, verb, o);
      return o;
    });

  console.log("> ", code);
  console.log(toStr(run(code, e)));
}

for (const line of Bun.argv.slice(2)) {
  main(line);
}
