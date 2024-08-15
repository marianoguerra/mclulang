/*globals Deno*/
import { assertStrictEquals as is } from "jsr:@std/assert@1";
import { mkUtils } from "./fatt.util.js";
const bin = Deno.readFileSync("./fatt.wasm"),
  {
    instance: { exports },
  } = await WebAssembly.instantiate(bin),
  {
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
    strGetChar,
    strEquals,

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
    handlerGetFn,
    handlerGetVal,
    callHandlerFn: callHandler,

    newHandlers,
    handlersGetForType,
    handlersBind,
    handlersFind,

    TYPE_FRAME: { value: TYPE_FRAME },
    newFrame,
    isFrame,
    newFrameVal,
    valGetFrame,
    frameBind,
    frameFind,
    frameDown,
    frameBindHandler,
    frameFindHandler,
    frameSend,
    frameEval,

    nilEq,
    returnNil,
    hReturnSubject,

    intAdd,
    intSub,
    intMul,
    intDiv,
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
    hPairEval,

    hLaterEval,

    hNameEval,
    hNameStr,

    hMsgVerb,
    hMsgObj,
    hMsgEval,

    hSendSubj,
    hSendMsg,
    hSendEval,

    hBlockEval,

    hArrayEval,
    hArraySize,
    hArrayGetItem,

    hFrameUp,
    hFrameEvalIn,
    hGetObjType,
    hFrameBindHandler,

    newPrimFrame,
  } = exports;

const { test } = Deno;

function skip(name, _fn) {
  console.warn("skipping", name);
}

const { mkStr, mkRawStr, parse, run } = mkUtils(exports);

function newE() {
  return newFrame();
}
test("NIL", () => {
  is(isNil(NIL), 1);
  is(valGetTag(NIL), TYPE_NIL);
});

test("Int", () => {
  is(isInt(newInt(42n)), 1);
  is(valGetTag(newInt(42n)), TYPE_INT);
  is(valGetI64(newInt(42n)), 42n);
});

test("Float", () => {
  is(isFloat(newFloat(42)), 1);
  is(valGetTag(newFloat(42)), TYPE_FLOAT);
  is(valGetF64(newFloat(42)), 42);
});

test("Str", () => {
  is(isStr(mkStr("hi!")), 1);
  is(valGetTag(mkStr("hi!")), TYPE_STR);
  is(strLen(mkStr("hi!")), 3);
  is(strGetChar(mkStr("abc"), 0), 97);
  is(strEquals(mkStr("hell"), mkStr("hello")), 0);
  is(strEquals(mkStr("hell"), mkStr("hell")), 1);
});

test("Pair", () => {
  is(isPair(newPair(NIL, NIL)), 1);
  is(valGetTag(newPair(NIL, NIL)), TYPE_PAIR);
  is(valGetI64(pairGetA(newPair(newInt(10n), newFloat(15)))), 10n);
  is(valGetF64(pairGetB(newPair(newInt(10n), newFloat(15)))), 15);
});

test("Name", () => {
  is(isName(newName(mkRawStr("foo"))), 1);
  is(valGetTag(newName(mkRawStr("foo"))), TYPE_NAME);
  is(isStr(valGetNameStr(newName(mkRawStr("foo")))), 1);
  is(strEquals(valGetNameStr(newName(mkRawStr("foo"))), mkStr("foo")), 1);
});

test("Later", () => {
  is(isLater(newLater(NIL)), 1);
  is(valGetTag(newLater(NIL)), TYPE_LATER);
  is(laterUnwrap(newLater(NIL)), NIL);
});

test("Msg", () => {
  is(isMsg(newMsg(mkRawStr("+"), newInt(5n))), 1);
  is(valGetTag(newMsg(mkRawStr("+"), newInt(5n))), TYPE_MSG);
  is(
    strEquals(valGetMsgVerb(newMsg(mkRawStr("+"), newInt(5n))), mkStr("+")),
    1,
  );
  is(valGetI64(valGetMsgObj(newMsg(mkRawStr("+"), newInt(5n)))), 5n);
});

test("Send", () => {
  const send = newSend(newInt(4n), newRawMsg(mkRawStr("+"), newInt(5n)));
  is(isSend(send), 1);
  is(valGetTag(send), TYPE_SEND);
  is(valGetI64(valGetSendSubj(send)), 4n);
  is(isMsg(valGetSendMsg(send)), 1);
});

test("Block", () => {
  const b = newBlock(3);
  is(isBlock(b), 1);
  is(valGetTag(b), TYPE_BLOCK);
  is(blockLen(b), 3);
  is(isNil(blockGetItem(b, 0)), 1);
  blockSetItem(b, 0, newInt(40n));
  is(valGetI64(blockGetItem(b, 0)), 40n);
});

test("Array", () => {
  const b = newArray(3);
  is(isArray(b), 1);
  is(valGetTag(b), TYPE_ARRAY);
  is(arrayLen(b), 3);
  is(isNil(arrayGetItem(b, 0)), 1);
  arraySetItem(b, 0, newInt(40n));
  is(valGetI64(arrayGetItem(b, 0)), 40n);
});

test("BindEntry", () => {
  const bn = newBindNull(),
    sFoo = mkRawStr("foo"),
    sBar = mkRawStr("bar"),
    v = newInt(100n),
    v1 = newFloat(42),
    b1 = newBindEntry(sFoo, v, bn),
    b2 = newBindEntry(sBar, v1, b1);

  is(bindFind(bn, sFoo), null);
  is(valGetI64(bindFind(b1, sFoo)), 100n);
  is(bindFind(b1, sBar), null);
  is(valGetF64(bindFind(b2, sBar)), 42);
  is(valGetI64(bindFind(b2, sFoo)), 100n);
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
  is(handlerGetFn(handlerFind(handlerEntry, mkRawStr("+"))), intAdd);

  is(
    valGetI64(
      callHandler(intAdd, newInt(100n), mkRawStr("+"), newInt(33n), newE()),
    ),
    133n,
  );

  is(
    valGetI64(
      callHandler(
        handlerGetFn(handlerFind(handlerEntry, mkRawStr("+"))),
        newInt(100n),
        mkRawStr("+"),
        newInt(34n),
        newE(),
      ),
    ),
    134n,
  );

  is(
    valGetI64(intAddJs(newInt(100n), mkRawStr("+"), newInt(32n), newFrame())),
    132n,
  );

  const intAddJsEntry = newHandlerEntry(
    mkRawStr("+"),
    fnToHandler(intAddJs),
    newHandlerEntryNull(),
  );

  is(
    valGetI64(
      callHandler(
        handlerGetFn(handlerFind(intAddJsEntry, mkRawStr("+"))),
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
  is(handlersGetForType(h, TYPE_NIL), null); // 0
  is(handlersGetForType(h, TYPE_INT), null); // 1
  is(handlersGetForType(h, TYPE_FLOAT), null); // 2
  is(handlersGetForType(h, TYPE_STR), null); // 3
  is(handlersGetForType(h, TYPE_PAIR), null); // 4
  is(handlersGetForType(h, TYPE_NAME), null); // 5
  is(handlersGetForType(h, TYPE_LATER), null); // 6
  is(handlersGetForType(h, TYPE_MSG), null); // 7
  is(handlersGetForType(h, TYPE_SEND), null); // 8
  is(handlersGetForType(h, TYPE_BLOCK), null); // 9
  is(handlersGetForType(h, TYPE_ARRAY), null); // 10

  const hIntAdd = fnToHandler(intAddJs),
    hIntSub = fnToHandler(intSubJs);

  handlersBind(h, TYPE_INT, mkRawStr("+"), hIntAdd);
  is(handlerGetFn(handlersFind(h, TYPE_INT, mkRawStr("+"))), hIntAdd);
  handlersBind(h, TYPE_INT, mkRawStr("-"), hIntSub);
  is(handlerGetFn(handlersFind(h, TYPE_INT, mkRawStr("+"))), hIntAdd);
  is(handlerGetFn(handlersFind(h, TYPE_INT, mkRawStr("-"))), hIntSub);
});

test("Frame", () => {
  const f1 = newFrame(),
    vFoo = newInt(15n),
    sFoo = mkRawStr("foo");
  is(frameFind(f1, sFoo), null);
  frameBind(f1, sFoo, vFoo);
  is(valGetI64(frameFind(f1, sFoo)), 15n);
  const f2 = frameDown(f1);
  is(valGetI64(frameFind(f2, sFoo)), 15n);
});

test("frameBindHandler", () => {
  const f = newFrame(),
    hIntAdd = fnToHandler(intAddJs),
    hIntSub = fnToHandler(intSubJs);

  is(frameFindHandler(f, TYPE_INT, mkRawStr("+")), null);
  is(frameBindHandler(f, TYPE_INT, mkRawStr("+"), hIntAdd), undefined);
  is(handlerGetFn(frameFindHandler(f, TYPE_INT, mkRawStr("+"))), hIntAdd);
  is(frameBindHandler(f, TYPE_INT, mkRawStr("-"), hIntSub), undefined);
  is(handlerGetFn(frameFindHandler(f, TYPE_INT, mkRawStr("-"))), hIntSub);
});

test("frameSend", () => {
  const f = newFrame(),
    hIntAdd = fnToHandler(intAddJs);

  frameBindHandler(f, TYPE_INT, mkRawStr("+"), hIntAdd);
  is(valGetI64(frameSend(f, newInt(42n), mkRawStr("+"), newInt(10n), f)), 52n);
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
  is(frameEval(f, NIL), NIL);

  frameBindHandler(f, TYPE_INT, mkRawStr("eval"), hIntEval);
  is(valGetI64(frameEval(f, newInt(42n))), 42n);
});

test("frameVal", () => {
  is(valGetTag(newFrameVal(newFrame())), TYPE_FRAME);
  is(isFrame(newFrameVal(newFrame())), 1);
});

test("nil handlers", () => {
  is(valGetI64(callHandler(nilEq, NIL, mkRawStr("="), NIL, newE())), 1n);
  is(isNil(callHandler(nilEq, NIL, mkRawStr("="), TRUE, newE())), 1);

  is(isNil(callHandler(returnNil, NIL, mkRawStr("!"), TRUE, newE())), 1);
});

test("int handlers", () => {
  function checkRaw(f, a, op, b, r, wrapFn = (f) => f) {
    is(wrapFn(callHandler(f, newInt(a), mkRawStr(op), newInt(b), newE())), r);
  }

  function check(f, a, op, b, r) {
    checkRaw(f, a, op, b, r, valGetI64);
  }

  check(intAdd, 100n, "+", 20n, 120n);
  check(intSub, 100n, "-", 20n, 80n);
  check(intMul, 100n, "*", 20n, 2000n);
  checkRaw(intDiv, 100n, "/", 20n, 5.0, valGetF64);
  check(intEq, 100n, "=", 100n, 100n);
  check(intLt, 100n, "<", 101n, 100n);
  checkRaw(intEq, 100n, "=", 1n, NIL);
  checkRaw(intLt, 100n, "<", 1n, NIL);
});

test("float handlers", () => {
  function checkRaw(f, a, op, b, r, wrapFn = (f) => f) {
    is(
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
  is(strLen(mkStr("hi!")), 3);
  is(isStr(mkStr("hi!")), 1);
  const f = newFrame(),
    hStrSize = fnToHandler(strSize);

  frameBindHandler(f, TYPE_STR, mkRawStr("size"), hStrSize);
  is(frameEval(f, newSend(mkStr("hi!"), newRawMsg(mkRawStr("size"), NIL))), 3n);
  is(
    valGetI64(
      callHandler(strSize, mkStr("hi!"), mkRawStr("size"), NIL, newE()),
    ),
    1n,
  );
  is(
    isNil(callHandler(strEq, mkStr("hi!"), mkRawStr("="), mkStr("hi"), newE())),
    1,
  );
  is(
    valGetI64(
      callHandler(strEq, mkStr("hi"), mkRawStr("="), mkStr("hi"), newE()),
    ),
    1n,
  );
});

function mkEnv(handlers) {
  const f = newFrame();
  for (const [type, typeHandlers] of handlers) {
    for (const verb in typeHandlers) {
      const handler = typeHandlers[verb];
      frameBindHandler(f, type, mkRawStr(verb), handler);
    }
  }

  return f;
}

test("pair handlers", () => {
  is(
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
  is(
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

  const f = mkEnv([
    [TYPE_INT, { eval: hReturnSubject }],
    [TYPE_PAIR, { eval: hPairEval }],
  ]);

  is(
    valGetI64(pairGetA(frameEval(f, newPair(newInt(42n), newInt(100n))))),
    42n,
  );
  is(
    valGetI64(pairGetB(frameEval(f, newPair(newInt(42n), newInt(100n))))),
    100n,
  );
});

test("later handlers", () => {
  const f = mkEnv([[TYPE_LATER, { eval: hLaterEval }]]);
  is(valGetI64(frameEval(f, newLater(newInt(42n)))), 42n);
});

test("name handlers", () => {
  const f = mkEnv([[TYPE_NAME, { eval: hNameEval }]]);
  frameBind(f, mkRawStr("foo"), newInt(42n));
  is(valGetI64(frameEval(f, newName(mkRawStr("foo")))), 42n);

  is(
    strEquals(
      callHandler(
        hNameStr,
        newName(mkRawStr("bar")),
        mkRawStr("name"),
        NIL,
        newE(),
      ),
      mkStr("bar"),
    ),
    1,
  );

  const e = newE();
  is(
    valGetFrame(
      callHandler(hNameEval, newName(mkRawStr("e")), mkRawStr("eval"), NIL, e),
    ),
    e,
  );
});

test("msg handlers", () => {
  is(
    strEquals(
      callHandler(
        hMsgVerb,
        newMsg(mkRawStr("+"), NIL),
        mkRawStr("verb"),
        NIL,
        newE(),
      ),
      mkStr("+"),
    ),
    1,
  );

  is(
    valGetI64(
      callHandler(
        hMsgObj,
        newMsg(mkRawStr("+"), newInt(100n)),
        mkRawStr("verb"),
        NIL,
        newE(),
      ),
    ),
    100n,
  );

  const f = mkEnv([
    [TYPE_NAME, { eval: hNameEval }],
    [TYPE_MSG, { eval: hMsgEval }],
  ]);
  frameBind(f, mkRawStr("foo"), newInt(43n));
  is(
    valGetI64(
      valGetMsgObj(
        frameEval(f, newMsg(mkRawStr("+"), newName(mkRawStr("foo")))),
      ),
    ),
    43n,
  );
});

test("send handlers", () => {
  is(
    valGetI64(
      callHandler(
        hSendSubj,
        newSend(newInt(10n), newRawMsg(mkRawStr("+"), newInt(20n))),
        mkRawStr("subj"),
        NIL,
        newE(),
      ),
    ),
    10n,
  );

  is(
    valGetI64(
      valGetMsgObj(
        callHandler(
          hSendMsg,
          newSend(newInt(10n), newRawMsg(mkRawStr("+"), newInt(20n))),
          mkRawStr("subj"),
          NIL,
          newE(),
        ),
      ),
    ),
    20n,
  );

  const f = mkEnv([
    [TYPE_INT, { eval: hReturnSubject, "+": intAdd }],
    [TYPE_NAME, { eval: hNameEval }],
    [TYPE_MSG, { eval: hMsgEval }],
    [TYPE_SEND, { eval: hSendEval }],
  ]);
  frameBind(f, mkRawStr("foo"), newInt(43n));
  is(
    valGetI64(
      frameEval(
        f,
        newSend(
          newInt(10n),
          newRawMsg(mkRawStr("+"), newName(mkRawStr("foo"))),
        ),
      ),
    ),
    53n,
  );
});

function mkBlock(...items) {
  const b = newBlock(items.length);
  for (let i = 0; i < items.length; i++) {
    blockSetItem(b, i, items[i]);
  }
  return b;
}

test("block handlers", () => {
  const f = mkEnv([
    [TYPE_INT, { eval: hReturnSubject }],
    [TYPE_NAME, { eval: hNameEval }],
    [TYPE_BLOCK, { eval: hBlockEval }],
  ]);
  frameBind(f, mkRawStr("foo"), newInt(44n));
  is(
    valGetI64(
      frameEval(f, mkBlock(newInt(10n), newInt(11n), newName(mkRawStr("foo")))),
    ),
    44n,
  );
});

function mkArray(...items) {
  const b = newArray(items.length);
  for (let i = 0; i < items.length; i++) {
    arraySetItem(b, i, items[i]);
  }
  return b;
}

test("array handlers", () => {
  const f = mkEnv([
    [TYPE_INT, { eval: hReturnSubject }],
    [TYPE_NAME, { eval: hNameEval }],
    [TYPE_ARRAY, { eval: hArrayEval }],
  ]);
  frameBind(f, mkRawStr("foo"), newInt(44n));
  const r = frameEval(
    f,
    mkArray(newInt(10n), newInt(11n), newName(mkRawStr("foo"))),
  );
  is(valGetI64(arrayGetItem(r, 0)), 10n);
  is(valGetI64(arrayGetItem(r, 1)), 11n);
  is(valGetI64(arrayGetItem(r, 2)), 44n);

  is(
    valGetI64(
      callHandler(hArraySize, newArray(0), mkRawStr("size"), NIL, newE()),
    ),
    0n,
  );

  is(valGetI64(callHandler(hArraySize, r, mkRawStr("size"), NIL, newE())), 3n);
  is(
    valGetI64(callHandler(hArrayGetItem, r, mkRawStr("."), newInt(0n), newE())),
    10n,
  );
  is(
    valGetI64(callHandler(hArrayGetItem, r, mkRawStr("."), newInt(2n), newE())),
    44n,
  );
});

test("frame handlers", () => {
  const f1 = newFrame(),
    vFoo = newInt(15n),
    sFoo = mkRawStr("foo");
  is(frameFind(f1, sFoo), null);
  frameBind(f1, sFoo, vFoo);
  const f2 = frameDown(f1);
  is(
    valGetFrame(
      callHandler(hFrameUp, newFrameVal(f2), mkRawStr("up"), NIL, newE()),
    ),
    f1,
  );

  const f = mkEnv([
    [TYPE_INT, { eval: hReturnSubject }],
    [TYPE_NAME, { eval: hNameEval }],
    [TYPE_ARRAY, { eval: hArrayEval }],
  ]);
  frameBind(f, mkRawStr("bar"), newInt(1000n));

  const r = frameEval(
    f,
    callHandler(
      hFrameEvalIn,
      newFrameVal(f),
      mkRawStr("eval-in"),
      mkArray(newInt(10n), newInt(11n), newName(mkRawStr("bar"))),
      newE(),
    ),
  );
  is(valGetI64(arrayGetItem(r, 0)), 10n);
  is(valGetI64(arrayGetItem(r, 1)), 11n);
  is(valGetI64(arrayGetItem(r, 2)), 1000n);

  is(
    valGetI64(
      callHandler(hGetObjType, NIL, mkRawStr("get-type"), newInt(10n), newE()),
    ),
    BigInt(TYPE_INT),
  );
});

test("frameBindHandler", () => {
  const f = mkEnv([
    [TYPE_NIL, { eval: hReturnSubject }],
    [TYPE_INT, { eval: hReturnSubject }],
    [TYPE_FLOAT, { eval: hReturnSubject }],
    [TYPE_STR, { eval: hReturnSubject }],
    [TYPE_NAME, { eval: hNameEval }],
    [TYPE_ARRAY, { eval: hArrayEval }],
    [TYPE_MSG, { eval: hMsgEval }],
    [TYPE_SEND, { eval: hSendEval }],
  ]);

  const fv = newFrameVal(f);
  is(
    callHandler(
      hFrameBindHandler,
      fv,
      mkRawStr("bindHandler"),
      mkArray(newInt(BigInt(TYPE_INT)), mkStr("answer"), newInt(42n)),
      newE(),
    ),
    fv,
  );
  is(
    valGetI64(handlerGetVal(frameFindHandler(f, TYPE_INT, mkRawStr("answer")))),
    42n,
  );
  is(
    valGetI64(
      frameEval(f, newSend(newInt(0n), newRawMsg(mkRawStr("answer"), NIL))),
    ),
    42n,
  );
});

test("newPrimFrame", () => {
  const f = newPrimFrame();
  is(
    valGetI64(pairGetA(frameEval(f, newPair(newInt(42n), newInt(100n))))),
    42n,
  );
});

//

test("parse NIL", () => {
  is(isNil(parse("()")), 1);
});

test("parse Int", () => {
  is(isInt(parse("42")), 1);
});

test("parse Float", () => {
  is(isFloat(parse("42.0")), 1);
});

test("parse Str", () => {
  is(isStr(parse('"hi!"')), 1);
});

test("parse Pair", () => {
  is(isPair(parse("() : ()")), 1);
});

test("parse Name", () => {
  is(isName(parse("foo")), 1);
});

test("parse Later", () => {
  is(isLater(parse("@a")), 1);
});

test("parse Msg", () => {
  is(isMsg(parse("\\ + 1")), 1);
});

test("parse Send", () => {
  is(isSend(parse("1 + 2")), 1);
});

test("parse Block", () => {
  is(isBlock(parse("{1}")), 1);
});

test("parse Array", () => {
  is(isArray(parse("[]")), 1);
  is(isArray(parse("[1]")), 1);
});

test("parse and run", () => {
  const f = newPrimFrame(),
    r = (code) => run(f, code);

  is(r("1"), 1n);
  is(r("1.2"), 1.2);
  is(r("()"), NIL);
  is(r("1 + 5 - 2"), 4n);
  is(r('""'), "");
  is(r('"a"'), "a");
  is(r('"abc"'), "abc");
  is(r("[1] . 0"), 1n);
  is(r("[1, 1.2, ()] size ()"), 3n);
  is(r("[1, 1.2, ()] . 1"), 1.2);
  is(r("[] size ()"), 0n);
  is(r('"" size ()'), 0n);
  is(r('"" = "a"'), NIL);
  is(r("() = ()"), 1n);

  is(r("@(1)"), 1n);
});
