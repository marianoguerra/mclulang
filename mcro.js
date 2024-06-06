#!/usr/bin/env bun
/*globals Bun*/
import {
  ANY_TAG,
  ARRAY_TAG,
  BLOCK_TAG,
  Block,
  LATER_TAG,
  Later,
  MAP_TAG,
  Msg,
  Pair,
  PAIR_TAG,
  run,
  SEND_TAG,
  Send,
  TAG_TAG,
} from "./mclulang.js";
import { toStr, TO_STR, bindReplies } from "./mcommon.js";

const DEFAULT_CODE = "{(0 add 0) does {it + that}, 1 add 3}";

function maybeLater(v) {
  return v instanceof Later ? v : new Later(v);
}

function main(code = DEFAULT_CODE) {
  const e = bindReplies(TO_STR);
  bindReplies(
    {
      [TAG_TAG]: {
        eval: (s) => s,
      },
      [ANY_TAG]: {
        eval: (s, _o, _e) => s,
      },
      [PAIR_TAG]: {
        eval: (s, _o, e) => {
          return new Pair(e.eval(s.a), e.eval(s.b));
        },
      },
      [BLOCK_TAG]: {
        eval: (s, _o, e) => {
          return new Block(s.value.map((v, _i, _) => e.eval(v)));
        },
      },
      [ARRAY_TAG]: {
        eval: (s, _o, e) => {
          return s.map((v, _i, _) => e.eval(v));
        },
      },
      [MAP_TAG]: {
        eval: (s, _o, e) => {
          const r = new Map();
          for (const [k, v] of s.entries()) {
            r.set(e.eval(k), e.eval(v));
          }
          return r;
        },
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
      },
      [LATER_TAG]: {
        eval: (s, _o, e) => {
          return new Later(e.eval(s.value));
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
