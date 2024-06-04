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
  Nil,
  Pair,
  getTag,
  dispatchMessage,
} from "./mclulang.js";

const DEFAULT_CODE = "{@(0 add 0) does @{it + that}, 1 add 3}";

Nil.prototype.toString = function () {
  return "()";
};
Pair.prototype.toString = function () {
  return `${this.a.toString()} : ${this.b.toString()}`;
};

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
    .bindHandler(NIL_TAG, "?", (_s, o, e) => o.b.eval(e))
    .bindHandler(ANY_TAG, "?", (_s, o, e) => o.a.eval(e))
    .bindHandler(ANY_TAG, "send", (s, _o, e, m) =>
      dispatchMessage(s, m.object, e),
    )
    .bindHandler(
      PAIR_TAG,
      "send",
      (s, _o, e, m) =>
        new Pair(dispatchMessage(s.a, m, e), dispatchMessage(s.b, m, e)),
    )
    .bindHandler(SEND_TAG, "does", (s, o, e, m) => {
      const tag = getTag(s.subject.eval(e)),
        verb = s.msg.verb;
      e.parent.bindHandler(tag, verb, o);
      return o;
    });

  console.log("> ", code);
  console.log(run(code, e).toString());
}

for (const line of Bun.argv.slice(2)) {
  main(line);
}
