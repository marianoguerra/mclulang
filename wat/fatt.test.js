/*globals Deno*/
import { assertEquals } from "jsr:@std/assert@1";
const bin = Deno.readFileSync("./fatt.wasm"),
  {
    instance: {
      exports: {
        valGetTag,
        NIL: { value: NIL },
        TYPE_NIL: { value: TYPE_NIL },
        isNil,
        TYPE_INT: { value: TYPE_INT },
        isInt,
        newInt,
        valGetI64,

        TYPE_FLOAT: { value: TYPE_FLOAT },
        isFloat,
        newFloat,
        valGetF64,
      },
    },
  } = await WebAssembly.instantiate(bin);

const { test } = Deno;

test("NIL", () => {
  assertEquals(isNil(NIL), 1);
  assertEquals(valGetTag(NIL), TYPE_NIL);
});

test("Int", () => {
  assertEquals(isInt(newInt(42n)), 1);
  assertEquals(valGetTag(newInt(42n)), TYPE_INT);
  assertEquals(valGetI64(newInt(42n)), 42n);
});

test("Float", () => {
  assertEquals(isFloat(newFloat(42)), 1);
  assertEquals(valGetTag(newFloat(42)), TYPE_FLOAT);
  assertEquals(valGetF64(newFloat(42)), 42);
});
