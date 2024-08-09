/*globals Deno*/
import { assertEquals } from "jsr:@std/assert@1";
const bin = Deno.readFileSync("./fatt.wasm"),
  {
    instance: {
      exports: {
        mem,
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

        TYPE_STR: { value: TYPE_STR },
        isStr,
        strLen,
        strFromMem,
        strGetChar,
        strEquals,
        rawStrFromMem,

        TYPE_PAIR: { value: TYPE_PAIR },
        isPair,
        newPair,
        pairGetA,
        pairGetB,

        TYPE_NAME: { value: TYPE_NAME },
        isName,
        newName,
        valGetNameStr,

        TYPE_LATER: { value: TYPE_LATER },
        isLater,
        newLater,
        laterUnwrap,
      },
    },
  } = await WebAssembly.instantiate(bin);

const { test } = Deno;

const memU8 = new Uint8Array(mem.buffer);

function copyStringToMem(s, start = 0) {
  const buf = new TextEncoder().encode(s),
    len = buf.length;
  for (let i = 0; i < len; i++) {
    memU8[start + i] = buf[i];
  }

  return { start, len };
}

function mkStr(s, start = 0) {
  const { len } = copyStringToMem(s, start);
  return strFromMem(start, len);
}

function mkRawStr(s, start = 0) {
  const { len } = copyStringToMem(s, start);
  return rawStrFromMem(start, len);
}

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

test("Str", () => {
  assertEquals(isStr(mkStr("hi!")), 1);
  assertEquals(valGetTag(mkStr("hi!")), TYPE_STR);
  assertEquals(strLen(mkStr("hi!")), 3);
  assertEquals(strGetChar(mkStr("abc"), 0), 97);
  assertEquals(strEquals(mkStr("hell"), mkStr("hello")), 0);
  assertEquals(strEquals(mkStr("hell"), mkStr("hell")), 1);
});

test("Pair", () => {
  assertEquals(isPair(newPair(NIL, NIL)), 1);
  assertEquals(valGetTag(newPair(NIL, NIL)), TYPE_PAIR);
  assertEquals(valGetI64(pairGetA(newPair(newInt(10n), newFloat(15)))), 10n);
  assertEquals(valGetF64(pairGetB(newPair(newInt(10n), newFloat(15)))), 15);
});

test("Name", () => {
  assertEquals(isName(newName(mkRawStr("foo"))), 1);
  assertEquals(valGetTag(newName(mkRawStr("foo"))), TYPE_NAME);
  assertEquals(isStr(valGetNameStr(newName(mkRawStr("foo")))), 1);
  assertEquals(
    strEquals(valGetNameStr(newName(mkRawStr("foo"))), mkStr("foo")),
    1,
  );
});

test("Later", () => {
  assertEquals(isLater(newLater(NIL)), 1);
  assertEquals(valGetTag(newLater(NIL)), TYPE_LATER);
  assertEquals(laterUnwrap(newLater(NIL)), NIL);
});
