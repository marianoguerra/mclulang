/*globals Deno*/
import { assertEquals } from "jsr:@std/assert@1";
const bin = Deno.readFileSync("./fatt.wasm"),
  {
    instance: {
      exports: {
        NIL: { value: NIL },
        TYPE_NIL: { value: TYPE_NIL },
        valGetTag,
        isNil,
      },
    },
  } = await WebAssembly.instantiate(bin);

const { test } = Deno;

test("NIL", () => {
  assertEquals(isNil(NIL), 1);
  assertEquals(valGetTag(NIL), TYPE_NIL);
});
