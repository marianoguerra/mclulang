/*globals Deno*/
import { assertEquals } from "jsr:@std/assert@1";
import { mkStrFns } from "./fatt.util.js";
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
        TRUE: { value: TRUE },
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

        newBindNull,
        newBindEntry,
        bindFind,

        newHandlerEntryNull,
        newHandlerEntry,
        handlerFind,
        callHandler,

        newHandlers,
        handlersGetForType,
        handlersBind,
        handlersFind,

        TYPE_FRAME: { value: TYPE_FRAME },
        newFrame,
        newFrameVal,
        isFrame,
        frameBind,
        frameFind,
        frameDown,
        frameBindHandler,
        frameFindHandler,
        frameSend,
        frameEval,

        nilEq,
        returnNil,

        intAdd,
        intSub,
        intMul,
        intEq,
        intLt,

        floatAdd,
        floatSub,
        floatMul,
        floatDiv,
        floatEq,
        floatLt,

        strSize,
        strEq,

        hPairA,
        hPairB,
      },
    },
  } = await WebAssembly.instantiate(bin);

const { test } = Deno;

function skip(name, _fn) {
  console.warn("skipping", name);
}
const memU8 = new Uint8Array(mem.buffer),
  { mkStr, mkRawStr } = mkStrFns(memU8, strFromMem, rawStrFromMem);

function newE() {
  return newFrame();
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

test("BindEntry", () => {
  const bn = newBindNull(),
    sFoo = mkRawStr("foo"),
    sBar = mkRawStr("bar"),
    v = newInt(100n),
    v1 = newFloat(42),
    b1 = newBindEntry(sFoo, v, bn),
    b2 = newBindEntry(sBar, v1, b1);

  assertEquals(bindFind(bn, sFoo), null);
  assertEquals(valGetI64(bindFind(b1, sFoo)), 100n);
  assertEquals(bindFind(b1, sBar), null);
  assertEquals(valGetF64(bindFind(b2, sBar)), 42);
  assertEquals(valGetI64(bindFind(b2, sFoo)), 100n);
});

function fnToHandler(fn) {
  return new WebAssembly.Function(
    {
      parameters: ["eqref", "eqref", "eqref", "eqref"],
      results: ["eqref"],
    },
    fn,
  );
}

function intAddJs(s, _v, o, _e) {
  return newInt(valGetI64(s) + valGetI64(o));
}

function intSubJs(s, _v, o, _e) {
  return newInt(valGetI64(s) - valGetI64(o));
}

test("HandlerEntry", () => {
  const handlerEntry = newHandlerEntry(
    mkRawStr("+"),
    intAdd,
    newHandlerEntryNull(),
  );
  assertEquals(handlerFind(handlerEntry, mkRawStr("+")), intAdd);

  assertEquals(
    valGetI64(
      callHandler(intAdd, newInt(100n), mkRawStr("+"), newInt(33n), newE()),
    ),
    133n,
  );

  assertEquals(
    valGetI64(
      callHandler(
        handlerFind(handlerEntry, mkRawStr("+")),
        newInt(100n),
        mkRawStr("+"),
        newInt(34n),
        newE(),
      ),
    ),
    134n,
  );

  assertEquals(
    valGetI64(intAddJs(newInt(100n), mkRawStr("+"), newInt(32n), newFrame())),
    132n,
  );

  const intAddJsEntry = newHandlerEntry(
    mkRawStr("+"),
    fnToHandler(intAddJs),
    newHandlerEntryNull(),
  );

  assertEquals(
    valGetI64(
      callHandler(
        handlerFind(intAddJsEntry, mkRawStr("+")),
        newInt(10n),
        mkRawStr("+"),
        newInt(34n),
        newE(),
      ),
    ),
    44n,
  );
});

test("Handlers", () => {
  const h = newHandlers();
  assertEquals(handlersGetForType(h, TYPE_NIL), null); // 0
  assertEquals(handlersGetForType(h, TYPE_INT), null); // 1
  assertEquals(handlersGetForType(h, TYPE_FLOAT), null); // 2
  assertEquals(handlersGetForType(h, TYPE_STR), null); // 3
  assertEquals(handlersGetForType(h, TYPE_PAIR), null); // 4
  assertEquals(handlersGetForType(h, TYPE_NAME), null); // 5
  assertEquals(handlersGetForType(h, TYPE_LATER), null); // 6
  assertEquals(handlersGetForType(h, TYPE_MSG), null); // 7
  assertEquals(handlersGetForType(h, TYPE_SEND), null); // 8
  assertEquals(handlersGetForType(h, TYPE_BLOCK), null); // 9
  assertEquals(handlersGetForType(h, TYPE_ARRAY), null); // 10

  const hIntAdd = fnToHandler(intAddJs),
    hIntSub = fnToHandler(intSubJs);

  handlersBind(h, TYPE_INT, mkRawStr("+"), hIntAdd);
  assertEquals(handlersFind(h, TYPE_INT, mkRawStr("+")), hIntAdd);
  handlersBind(h, TYPE_INT, mkRawStr("-"), hIntSub);
  assertEquals(handlersFind(h, TYPE_INT, mkRawStr("+")), hIntAdd);
  assertEquals(handlersFind(h, TYPE_INT, mkRawStr("-")), hIntSub);
});

test("Frame", () => {
  const f1 = newFrame(),
    vFoo = newInt(15n),
    sFoo = mkRawStr("foo");
  assertEquals(frameFind(f1, sFoo), null);
  frameBind(f1, sFoo, vFoo);
  assertEquals(valGetI64(frameFind(f1, sFoo)), 15n);
  const f2 = frameDown(f1);
  assertEquals(valGetI64(frameFind(f2, sFoo)), 15n);
});

test("frameBindHandler", () => {
  const f = newFrame(),
    hIntAdd = fnToHandler(intAddJs),
    hIntSub = fnToHandler(intSubJs);

  assertEquals(frameFindHandler(f, TYPE_INT, mkRawStr("+")), null);
  assertEquals(
    frameBindHandler(f, TYPE_INT, mkRawStr("+"), hIntAdd),
    undefined,
  );
  assertEquals(frameFindHandler(f, TYPE_INT, mkRawStr("+")), hIntAdd);
  assertEquals(
    frameBindHandler(f, TYPE_INT, mkRawStr("-"), hIntSub),
    undefined,
  );
  assertEquals(frameFindHandler(f, TYPE_INT, mkRawStr("-")), hIntSub);
});

test("frameSend", () => {
  const f = newFrame(),
    hIntAdd = fnToHandler(intAddJs);

  frameBindHandler(f, TYPE_INT, mkRawStr("+"), hIntAdd);
  assertEquals(
    valGetI64(frameSend(f, newInt(42n), mkRawStr("+"), newInt(10n), f)),
    52n,
  );
});

function nilEval(s, _v, _o, _e) {
  return s;
}

function intEval(s, _v, _o, _e) {
  return s;
}

test("frameEval", () => {
  const f = newFrame(),
    hNilEval = fnToHandler(nilEval),
    hIntEval = fnToHandler(intEval);

  frameBindHandler(f, TYPE_NIL, mkRawStr("eval"), hNilEval);
  assertEquals(frameEval(f, NIL), NIL);

  frameBindHandler(f, TYPE_INT, mkRawStr("eval"), hIntEval);
  assertEquals(valGetI64(frameEval(f, newInt(42n))), 42n);
});

test("frameVal", () => {
  assertEquals(valGetTag(newFrameVal(newFrame())), TYPE_FRAME);
  assertEquals(isFrame(newFrameVal(newFrame())), 1);
});

test("nil handlers", () => {
  assertEquals(
    valGetI64(callHandler(nilEq, NIL, mkRawStr("="), NIL, newE())),
    1n,
  );
  assertEquals(isNil(callHandler(nilEq, NIL, mkRawStr("="), TRUE, newE())), 1);

  assertEquals(
    isNil(callHandler(returnNil, NIL, mkRawStr("!"), TRUE, newE())),
    1,
  );
});

test("int handlers", () => {
  function checkRaw(f, a, op, b, r, wrapFn = (f) => f) {
    assertEquals(
      wrapFn(callHandler(f, newInt(a), mkRawStr(op), newInt(b), newE())),
      r,
    );
  }

  function check(f, a, op, b, r) {
    checkRaw(f, a, op, b, r, valGetI64);
  }

  check(intAdd, 100n, "+", 20n, 120n);
  check(intSub, 100n, "-", 20n, 80n);
  check(intMul, 100n, "*", 20n, 2000n);
  check(intEq, 100n, "=", 100n, 100n);
  check(intLt, 100n, "<", 101n, 100n);
  checkRaw(intEq, 100n, "=", 1n, NIL);
  checkRaw(intLt, 100n, "<", 1n, NIL);
});

test("float handlers", () => {
  function checkRaw(f, a, op, b, r, wrapFn = (f) => f) {
    assertEquals(
      wrapFn(callHandler(f, newFloat(a), mkRawStr(op), newFloat(b), newE())),
      r,
    );
  }

  function check(f, a, op, b, r) {
    checkRaw(f, a, op, b, r, valGetF64);
  }

  check(floatAdd, 100.5, "+", 20.3, 120.8);
  check(floatSub, 100.5, "-", 20.3, 80.2);
  check(floatMul, 100.5, "*", 20.3, 2040.15);
  check(floatDiv, 100.5, "/", 2, 50.25);
  check(floatEq, 100.5, "=", 100.5, 100.5);
  check(floatLt, 100.5, "<", 101, 100.5);
  checkRaw(floatEq, 100.5, "=", 1.2, NIL);
  checkRaw(floatLt, 100.5, "<", 1, NIL);
});

skip("str handlers", () => {
  assertEquals(strLen(mkStr("hi!")), 3);
  assertEquals(isStr(mkStr("hi!")), 1);
  const f = newFrame(),
    hStrSize = fnToHandler(strSize);

  frameBindHandler(f, TYPE_STR, mkRawStr("size"), hStrSize);
  assertEquals(
    frameEval(f, newSend(mkStr("hi!"), newRawMsg(mkRawStr("size"), NIL))),
    3n,
  );
  assertEquals(
    valGetI64(
      callHandler(strSize, mkStr("hi!"), mkRawStr("size"), NIL, newE()),
    ),
    1n,
  );
  assertEquals(
    isNil(callHandler(strEq, mkStr("hi!"), mkRawStr("="), mkStr("hi"), newE())),
    1,
  );
  assertEquals(
    valGetI64(
      callHandler(strEq, mkStr("hi"), mkRawStr("="), mkStr("hi"), newE()),
    ),
    1n,
  );
});

test("pair handlers", () => {
  assertEquals(
    valGetI64(
      callHandler(
        hPairA,
        newPair(newInt(42n), mkStr("hi!")),
        mkRawStr("a"),
        NIL,
        newE(),
      ),
    ),
    42n,
  );
  assertEquals(
    valGetI64(
      callHandler(
        hPairB,
        newPair(newInt(42n), newInt(100n)),
        mkRawStr("a"),
        NIL,
        newE(),
      ),
    ),
    100n,
  );
});
