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

        TYPE_MSG: { value: TYPE_MSG },
        isMsg,
        newRawMsg,
        newMsg,
        valGetMsgVerb,
        valGetMsgObj,

        TYPE_SEND: { value: TYPE_SEND },
        isSend,
        newSend,
        valGetSendSubj,
        valGetSendMsg,

        TYPE_BLOCK: { value: TYPE_BLOCK },
        isBlock,
        newBlock,
        blockLen,
        blockGetItem,
        blockSetItem,

        TYPE_ARRAY: { value: TYPE_ARRAY },
        isArray,
        newArray,
        arrayLen,
        arrayGetItem,
        arraySetItem,
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

test("Msg", () => {
  assertEquals(isMsg(newMsg(mkRawStr("+"), newInt(5n))), 1);
  assertEquals(valGetTag(newMsg(mkRawStr("+"), newInt(5n))), TYPE_MSG);
  assertEquals(
    strEquals(valGetMsgVerb(newMsg(mkRawStr("+"), newInt(5n))), mkStr("+")),
    1,
  );
  assertEquals(valGetI64(valGetMsgObj(newMsg(mkRawStr("+"), newInt(5n)))), 5n);
});

test("Send", () => {
  const send = newSend(newInt(4n), newRawMsg(mkRawStr("+"), newInt(5n)));
  assertEquals(isSend(send), 1);
  assertEquals(valGetTag(send), TYPE_SEND);
  assertEquals(valGetI64(valGetSendSubj(send)), 4n);
  assertEquals(isMsg(valGetSendMsg(send)), 1);
});

test("Block", () => {
  const b = newBlock(3);
  assertEquals(isBlock(b), 1);
  assertEquals(valGetTag(b), TYPE_BLOCK);
  assertEquals(blockLen(b), 3);
  assertEquals(isNil(blockGetItem(b, 0)), 1);
  blockSetItem(b, 0, newInt(40n));
  assertEquals(valGetI64(blockGetItem(b, 0)), 40n);
});

test("Array", () => {
  const b = newArray(3);
  assertEquals(isArray(b), 1);
  assertEquals(valGetTag(b), TYPE_ARRAY);
  assertEquals(arrayLen(b), 3);
  assertEquals(isNil(arrayGetItem(b, 0)), 1);
  arraySetItem(b, 0, newInt(40n));
  assertEquals(valGetI64(arrayGetItem(b, 0)), 40n);
});
