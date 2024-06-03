#!/usr/bin/env bun

import {
  run,
  env,
  INT_TAG,
  NIL_TAG,
  ANY_TAG,
  SEND_TAG,
  getTag,
} from "./mclulang.js";

const DEFAULT_CODE = "{@(0 add 0) does @{it + that}, 1 add 3}";

function main(code = DEFAULT_CODE) {
  const e = env()
    .bindHandler(INT_TAG, "+", (s, o) => s + o)
    .bindHandler(NIL_TAG, "?", (_s, o, e) => o.b.eval(e))
    .bindHandler(ANY_TAG, "?", (_s, o, e) => o.a.eval(e))
    .bindHandler(SEND_TAG, "does", (s, o, e, m) => {
      const tag = getTag(s.subject.eval(e)),
        verb = s.msg.verb;
      e.parent.bindHandler(tag, verb, o);
      return o;
    });

  console.log("> ", code);
  console.log(run(code, e));
}

for (const line of Bun.argv.slice(2)) {
  main(line);
}
