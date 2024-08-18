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

    hNilEq,
    hReturnNil,
    hReturnSubj,

    hIntAdd,
    hIntSub,
    hIntMul,
    hIntDiv,
    hIntEq,
    hIntLt,

    hFloatAdd,
    hFloatSub,
    hFloatMul,
    hFloatDiv,
    hFloatEq,
    hFloatLt,

    hStrSize,
    hStrEq,

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

    sEmpty,
    sIsEmpty,
    sPeek,
    sPop,
    sPushNil,
    sPushI64,
    sPushF64,
    sNewPair,
    sPushSymAdd,
    sNewMsg,
    sNewSend,
    sNewArray,
    sNewBlock,
    sEvalTop,
    sNewName,
    sNewLater,
    vmEvalInstr,
    vmEvalNextInstr,
    vmEvalRun,
  } = exports;

const { test } = Deno;

const { mkStr, mkRawStr, parse, run, toJS, copyStringToMem, memU8 } =
  mkUtils(exports);

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
    hIntAdd,
    newHandlerEntryNull(),
  );
  is(handlerGetFn(handlerFind(handlerEntry, mkRawStr("+"))), hIntAdd);

  is(
    valGetI64(
      callHandler(hIntAdd, newInt(100n), mkRawStr("+"), newInt(33n), newE()),
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
  is(valGetI64(callHandler(hNilEq, NIL, mkRawStr("="), NIL, newE())), 1n);
  is(isNil(callHandler(hNilEq, NIL, mkRawStr("="), TRUE, newE())), 1);

  is(isNil(callHandler(hReturnNil, NIL, mkRawStr("!"), TRUE, newE())), 1);
});

test("int handlers", () => {
  function checkRaw(f, a, op, b, r, wrapFn = (f) => f) {
    is(wrapFn(callHandler(f, newInt(a), mkRawStr(op), newInt(b), newE())), r);
  }

  function check(f, a, op, b, r) {
    checkRaw(f, a, op, b, r, valGetI64);
  }

  check(hIntAdd, 100n, "+", 20n, 120n);
  check(hIntSub, 100n, "-", 20n, 80n);
  check(hIntMul, 100n, "*", 20n, 2000n);
  checkRaw(hIntDiv, 100n, "/", 20n, 5.0, valGetF64);
  check(hIntEq, 100n, "=", 100n, 100n);
  check(hIntLt, 100n, "<", 101n, 100n);
  checkRaw(hIntEq, 100n, "=", 1n, NIL);
  checkRaw(hIntLt, 100n, "<", 1n, NIL);
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

  check(hFloatAdd, 100.5, "+", 20.3, 120.8);
  check(hFloatSub, 100.5, "-", 20.3, 80.2);
  check(hFloatMul, 100.5, "*", 20.3, 2040.15);
  check(hFloatDiv, 100.5, "/", 2, 50.25);
  check(hFloatEq, 100.5, "=", 100.5, 100.5);
  check(hFloatLt, 100.5, "<", 101, 100.5);
  checkRaw(hFloatEq, 100.5, "=", 1.2, NIL);
  checkRaw(hFloatLt, 100.5, "<", 1, NIL);
});

test("str handlers", () => {
  is(strLen(mkStr("hi!")), 3);
  is(isStr(mkStr("hi!")), 1);

  is(
    valGetI64(
      callHandler(hStrSize, mkStr("hi!"), mkRawStr("size"), NIL, newE()),
    ),
    3n,
  );
  is(
    isNil(
      callHandler(hStrEq, mkStr("hi!"), mkRawStr("="), mkStr("hi"), newE()),
    ),
    1,
  );
  is(
    isNil(callHandler(hStrEq, mkStr("hi"), mkRawStr("="), mkStr("hi"), newE())),
    0,
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
    [TYPE_INT, { eval: hReturnSubj }],
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
    [TYPE_INT, { eval: hReturnSubj, "+": hIntAdd }],
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
    [TYPE_INT, { eval: hReturnSubj }],
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
    [TYPE_INT, { eval: hReturnSubj }],
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
    [TYPE_INT, { eval: hReturnSubj }],
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
    [TYPE_NIL, { eval: hReturnSubj }],
    [TYPE_INT, { eval: hReturnSubj }],
    [TYPE_FLOAT, { eval: hReturnSubj }],
    [TYPE_STR, { eval: hReturnSubj }],
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

test("full bootstrap", () => {
  const f = newPrimFrame(),
    r = (code) => run(f, code),
    code = `{
e bindHandler [(e getType e), "reply", @{
    e bindHandler [
        (e getType (e evalIn (msg obj() a() subj()))),
        (msg obj() a() msg() verb()),
        (msg obj() b())
    ],
    ()
  }],
e reply @(@(subj verb obj) -> body) : @(e reply it : that),

@(@a is _) -> @(e up () bind (it name ()) : that),

@(() < _) -> (),
@(@a = _) -> @((it name()) = (it name())),

@(()  not _) -> 1,
@(0   not _) -> (),
@(0.0 not _) -> (),
@(""  not _) -> (),

@(()  or _) -> @(e evalIn that),
@(0   or _) -> @it,
@(0.0 or _) -> @it,
@(""  or _) -> @it,

@(()  and _) -> (),
@(0   and _) -> @(e evalIn that),
@(0.0 and _) -> @(e evalIn that),
@(""  and _) -> @(e evalIn that),

@(()  ? _) -> @(e evalIn (that b ())),
@(0   ? _) -> @(e evalIn (that a ())),
@(0.0 ? _) -> @(e evalIn (that a ())),
@(""  ? _) -> @(e evalIn (that a ())),

@(()  != _) -> @(it = that not()),
@(0   != _) -> @(it = that not()),
@(0.0 != _) -> @(it = that not()),
@(""  != _) -> @(it = that not()),

@(()  >= _) -> @(that = it),
@(0   >= _) -> @((it = that) or (that < it) and it),
@(0.0 >= _) -> @((it = that) or (that < it) and it),
@(""  >= _) -> @((it = that) or (that < it) and it),

@(()  <= _) -> @(that = it),
@(0   <= _) -> @((it < that) or (it = that)),
@(0.0 <= _) -> @((it < that) or (it = that)),
@(""  <= _) -> @((it < that) or (it = that)),

@(()  > _) -> (),
@(0   > _) -> @((it <= that not()) and it),
@(0.0 > _) -> @((it <= that not()) and it),
@(""  > _) -> @((it <= that not()) and it),

@("" empty?()) -> @(it size () = 0),
@([] empty?()) -> @(it size () = 0),

[
  () not(), 1 not(), 1.0 not(), "" not(),

  () or 10, 10 or 11, 1.5 or 2, "" or 1,

  () and 1, 1 and 2, 2.5 and 3, "" and 4,

  ()  ? 1 : 2,
  1   ? 3 : 4,
  1.1 ? 5 : 6,
  "!" ? 7 : 8,

  () != (), 1 != 1, 1.1 != 1.1, "" != "",
  () != 0, 1 != 2, 1.1 != 1.2, "" != ".",

  () >= (), 1 >= 1, 1.1 >= 1.1, "a" >= "a",
  3 >= 2, 1.3 >= 1.2, "c" >= "b",
  1 >= 2, 1.1 >= 1.2, "a" >= "b",

  () <= (), 1 <= 1, 1.1 <= 1.1, "a" <= "a",
  3 <= 2, 1.3 <= 1.2, "c" <= "b",
  1 <= 2, 1.1 <= 1.2, "a" <= "b",

  () > (), 1 > 1, 1.1 > 1.1, "a" > "a",
  3 > 2, 1.3 > 1.2, "c" > "b",
  1 > 2, 1.1 > 1.2, "a" > "b",

  "" empty?(),
  [] empty?(),
  "1" empty?(),
  [1] empty?(),

  3 > 2 > 1,
  3 >= 2 >= 1
]
  }`;

  const [
    nilNot,
    intNot,
    floatNot,
    strNot,
    nilOr,
    intOr,
    floatOr,
    strOr,
    nilAnd,
    intAnd,
    floatAnd,
    strAnd,
    nilCond,
    intCond,
    floatCond,
    strCond,
    nilNeF,
    intNeF,
    floatNeF,
    strNeF,
    nilNeT,
    intNeT,
    floatNeT,
    strNeT,

    nilGeE,
    intGeE,
    floatGeE,
    strGeE,

    intGeG,
    floatGeG,
    strGeG,

    intGeL,
    floatGeL,
    strGeL,

    nilLeE,
    intLeE,
    floatLeE,
    strLeE,

    intLeG,
    floatLeG,
    strLeG,

    intLeL,
    floatLeL,
    strLeL,

    nilGtE,
    intGtE,
    floatGtE,
    strGtE,

    intGtG,
    floatGtG,
    strGtG,

    intGtL,
    floatGtL,
    strGtL,

    strEmpty,
    arrayEmpty,
    strNotEmpty,
    arrayNotEmpty,

    chainGt,
    chainGe,
  ] = r(code);

  is(nilNot, 1n);
  is(intNot, NIL);
  is(floatNot, NIL);
  is(strNot, NIL);

  is(nilOr, 10n);
  is(intOr, 10n);
  is(floatOr, 1.5);
  is(strOr, "");

  is(nilAnd, NIL);
  is(intAnd, 2n);
  is(floatAnd, 3n);
  is(strAnd, 4n);

  is(nilCond, 2n);
  is(intCond, 3n);
  is(floatCond, 5n);
  is(strCond, 7n);

  is(nilNeF, NIL);
  is(intNeF, NIL);
  is(floatNeF, NIL);
  is(strNeF, NIL);

  is(nilNeT, 1n);
  is(intNeT, 1n);
  is(floatNeT, 1n);
  is(strNeT, 1n);

  is(nilGeE, 1n);
  is(intGeE, 1n);
  is(floatGeE, 1.1);
  is(strGeE, "a");

  is(intGeG, 3n);
  is(floatGeG, 1.3);
  is(strGeG, "c");

  is(intGeL, NIL);
  is(floatGeL, NIL);
  is(strGeL, NIL);

  is(nilLeE, 1n);
  is(intLeE, 1n);
  is(floatLeE, 1.1);
  is(strLeE, "a");

  is(intLeG, NIL);
  is(floatLeG, NIL);
  is(strLeG, NIL);

  is(intLeL, 1n);
  is(floatLeL, 1.1);
  is(strLeL, "a");

  is(nilGtE, NIL);
  is(intGtE, NIL);
  is(floatGtE, NIL);
  is(strGtE, NIL);

  is(intGtG, 3n);
  is(floatGtG, 1.3);
  is(strGtG, "c");

  is(intGtL, NIL);
  is(floatGtL, NIL);
  is(strGtL, NIL);

  is(strEmpty, 0n);
  is(arrayEmpty, 0n);
  is(strNotEmpty, NIL);
  is(arrayNotEmpty, NIL);

  is(chainGt, 3n);
  is(chainGe, 3n);
});

test("stack", () => {
  is(sIsEmpty(sEmpty()), 1);
  is(sIsEmpty(sPushNil(sEmpty())), 0);
  is(sIsEmpty(sPop(sPushNil(sEmpty()))), 1);
  is(isNil(sPeek(sPushNil(sEmpty()))), 1);
  is(isNil(sPeek(sPushI64(sEmpty(), 42n))), 0);
  is(isInt(sPeek(sPushI64(sEmpty(), 42n))), 1);
  is(isFloat(sPeek(sPushF64(sEmpty(), 42.5))), 1);
});

class VM {
  constructor() {
    this.stack = sEmpty();
  }

  _push(fn, v) {
    this.stack = fn(this.stack, v);
    return this;
  }
  pushNil() {
    return this._push(sPushNil);
  }
  pushInt(v) {
    return this._push(sPushI64, BigInt(v));
  }
  pushFloat(v) {
    return this._push(sPushF64, Number(v));
  }
  newName() {
    return this._push(sNewName);
  }
  newLater() {
    return this._push(sNewLater);
  }
  newPair() {
    return this._push(sNewPair);
  }
  newMsg() {
    return this._push(sNewMsg);
  }
  newSend() {
    return this._push(sNewSend);
  }
  newArray() {
    return this._push(sNewArray);
  }
  newBlock() {
    return this._push(sNewBlock);
  }
  evalTop(f = newPrimFrame()) {
    return this._push(sEvalTop, f);
  }
  pop() {
    this.stack = sPop(this.stack);
    return this;
  }
  peek() {
    return sPeek(this.stack);
  }
  isStackEmpty() {
    return sIsEmpty(this.stack);
  }
  pushSymAdd() {
    return this._push(sPushSymAdd);
  }
  evalInstr(instr, imm = 0n) {
    this.stack = vmEvalInstr(this.stack, instr, imm);
    return this;
  }
}

test("vm", () => {
  let vm = () => new VM();
  is(vm().isStackEmpty(), 1);
  is(vm().pushNil().isStackEmpty(), 0);
  is(vm().pushNil().pop().isStackEmpty(), 1);
  is(isNil(vm().pushNil().peek()), 1);
  is(isNil(vm().pushInt(42).peek()), 0);
  is(isInt(vm().pushInt(42).peek()), 1);
  is(isFloat(vm().pushFloat(42).peek()), 1);

  is(isPair(vm().pushInt(10).pushInt(20).newPair().peek()), 1);
  // top of stack (tos) is a, then b
  is(valGetI64(pairGetA(vm().pushInt(10).pushInt(20).newPair().peek())), 20n);
  is(valGetI64(pairGetB(vm().pushInt(10).pushInt(20).newPair().peek())), 10n);

  is(isMsg(vm().pushInt(20).pushSymAdd().newMsg().peek()), 1);
  is(isSend(vm().pushInt(10).pushSymAdd().pushInt(20).newSend().peek()), 1);
  is(
    valGetI64(
      vm().pushInt(10).pushSymAdd().pushInt(20).newSend().evalTop().peek(),
    ),
    30n,
  );
  is(isLater(vm().pushNil().newLater().peek()), 1);
  is(isName(vm().pushSymAdd().newName().peek()), 1);
  const arr = toJS(
    vm().pushInt(10).pushInt(20).pushInt(30).pushInt(3).newArray().peek(),
  );
  is(arr[0], 30n);
  is(arr[1], 20n);
  is(arr[2], 10n);
  is(
    toJS(
      vm()
        .pushInt(10)
        .pushInt(20)
        .pushInt(30)
        .pushInt(3)
        .newBlock()
        .evalTop()
        .peek(),
    ),
    10n,
  );
});

const _doubleToBigIntBuffer = new ArrayBuffer(8),
  _doubleToBigIntInt8Array = new Uint8Array(_doubleToBigIntBuffer),
  _doubleToBigIntInt64Array = new BigInt64Array(_doubleToBigIntBuffer),
  _doubleToBigIntFloat64Array = new Float64Array(_doubleToBigIntBuffer);
function doubleToBigInt(v) {
  _doubleToBigIntFloat64Array[0] = v;
  return _doubleToBigIntInt64Array[0];
}

function encodeStrStartLen(start, len) {
  return BigInt(start) | (BigInt(len) << 32n);
}

test("vm instructions", () => {
  let vm = () => new VM();
  is(isNil(vm().evalInstr(0).peek()), 1);
  is(toJS(vm().evalInstr(1).peek()), 1n);
  copyStringToMem("hello!!?", 0);
  is(toJS(vm().evalInstr(2, encodeStrStartLen(0, 7)).peek()), "hello!!");

  is(toJS(vm().evalInstr(3, 42n).peek()), 42n);
  is(toJS(vm().evalInstr(4, doubleToBigInt(12.5)).peek()), 12.5);
  const p = vm().evalInstr(3, 0n).evalInstr(1).evalInstr(5).peek();
  is(isPair(p), 1);
  is(toJS(pairGetA(p)), 1n);
  is(toJS(pairGetB(p)), 0n);

  const arr = toJS(vm().pushInt(10).pushInt(20).pushInt(2).evalInstr(6).peek());
  is(arr[0], 20n);
  is(arr[1], 10n);

  is(
    toJS(vm().pushInt(10).pushInt(20).pushInt(2).evalInstr(7).evalTop().peek()),
    10n,
  );
  is(isLater(vm().pushInt(10).evalInstr(8).peek()), 1);
  is(isName(vm().pushSymAdd().evalInstr(9).peek()), 1);
  is(isMsg(vm().pushInt(20).pushSymAdd().evalInstr(10).peek()), 1);
  is(isSend(vm().pushInt(10).pushSymAdd().pushInt(20).evalInstr(11).peek()), 1);
});

function writeI64(memU8, v, start) {
  _doubleToBigIntInt64Array[0] = BigInt(v);
  for (let i = 0; i < 8; i++) {
    memU8[start + i] = _doubleToBigIntInt8Array[i];
  }
}

function writeF64(memU8, v, start) {
  _doubleToBigIntFloat64Array[0] = v;
  for (let i = 0; i < 8; i++) {
    memU8[start + i] = _doubleToBigIntInt8Array[i];
  }
}

test("vm eval next instr", () => {
  let s, pc;

  memU8[0] = 0; // push nil
  [s, pc] = vmEvalNextInstr(sEmpty(), pc);
  is(isNil(sPeek(s)), 1);
  is(pc, 1);

  memU8[pc] = 1; // push 1
  [s, pc] = vmEvalNextInstr(sEmpty(), pc);
  is(toJS(sPeek(s)), 1n);
  is(pc, 2);

  memU8[pc] = 3; // push int
  writeI64(memU8, 42n, pc + 1);
  [s, pc] = vmEvalNextInstr(sEmpty(), pc);
  is(toJS(sPeek(s)), 42n);
  is(pc, 11);

  memU8[pc] = 4; // push float
  writeF64(memU8, 12.5, pc + 1);
  [s, pc] = vmEvalNextInstr(sEmpty(), pc);
  is(toJS(sPeek(s)), 12.5);
  is(pc, 20);

  copyStringToMem("hello!!?", 0);
  memU8[pc] = 2; // push str
  writeI64(memU8, encodeStrStartLen(0, 7), pc + 1);
  [s, pc] = vmEvalNextInstr(sEmpty(), pc);
  is(toJS(sPeek(s)), "hello!!");
  is(pc, 29);

  memU8[0] = 0; // push nil
  memU8[1] = 1; // push 1
  memU8[2] = 5; // pop pair
  pc = 0;
  [s, pc] = vmEvalNextInstr(sEmpty(), pc);
  [s, pc] = vmEvalNextInstr(s, pc);
  [s, pc] = vmEvalNextInstr(s, pc);
  is(isPair(sPeek(s)), 1);
  is(toJS(pairGetA(sPeek(s))), 1n);
  is(isNil(pairGetB(sPeek(s))), 1);
  is(pc, 3);

  const pcIn = pc;
  memU8[pc] = 255; // halt
  const sIn = sEmpty();
  [s, pc] = vmEvalNextInstr(sIn, pc);
  is(pc, pcIn);
  is(s, sIn);
});

test("vm eval run", () => {
  memU8[0] = 0; // push nil
  memU8[1] = 1; // push 1
  memU8[2] = 5; // pop pair
  memU8[3] = 255; // halt
  const [s, pc] = vmEvalRun(sEmpty(), 0);
  is(isPair(sPeek(s)), 1);
  is(toJS(pairGetA(sPeek(s))), 1n);
  is(isNil(pairGetB(sPeek(s))), 1);
  is(pc, 3);
});
