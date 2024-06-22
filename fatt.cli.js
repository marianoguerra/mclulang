#!/usr/bin/env bun
/*globals Bun*/
import {
  bindReplies,
  mergeToStr,
  runPhase,
  runPhases,
  toStr,
} from "./fatt.common.js";

function main(code) {
  console.log("> ", code);

  const eToStr = bindReplies(mergeToStr({})).right();
  runPhases(
    code,
    [{ name: "run", e: runPhase().right() }],
    (_phase, _input, output) => {
      console.log(toStr(output, eToStr));
      console.log("");
    },
  );
}

for (const line of Bun.argv.slice(2)) {
  main(line);
}
