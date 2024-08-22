import { makeParser } from "./fatt.parser.js";

class FattBase {}

class Later extends FattBase {
  constructor(v) {
    super();
    this.v = v;
  }
}

class Name extends FattBase {
  constructor(v) {
    super();
    this.v = v;
  }
}

class Pair extends FattBase {
  constructor(a, b) {
    super();
    this.a = a;
    this.b = b;
  }
}

class Msg extends FattBase {
  constructor(verb, obj) {
    super();
    this.verb = verb;
    this.obj = obj;
  }
}

class Send extends FattBase {
  constructor(subj, msg) {
    super();
    this.subj = subj;
    this.msg = msg;
  }
}

export function mkUtils(exports) {
  const {
      mem,
      strFromMem,
      rawStrFromMem,
      valGetTag,
      frameEval,
      newBlock,
      blockSetItem,
      newArray,
      arraySetItem,
      valGetI64,
      valGetF64,
      laterUnwrap,
      valGetNameStr,
      TYPE_NIL: { value: TYPE_NIL },
      TYPE_INT: { value: TYPE_INT },
      TYPE_FLOAT: { value: TYPE_FLOAT },
      TYPE_STR: { value: TYPE_STR },
      TYPE_LATER: { value: TYPE_LATER },
      TYPE_NAME: { value: TYPE_NAME },
      TYPE_ARRAY: { value: TYPE_ARRAY },
      TYPE_PAIR: { value: TYPE_PAIR },
      TYPE_MSG: { value: TYPE_MSG },
      TYPE_SEND: { value: TYPE_SEND },
      valGetMsgVerb,
      valGetMsgObj,
      valGetSendSubj,
      valGetSendMsg,
      pairGetA,
      pairGetB,
      strLen,
      strGetChar,
      arrayLen,
      arrayGetItem,
      NIL: { value: NIL },
      newInt,
      newFloat,
      newLater,
      newName,
      newPair,
      newMsg,
      newSend,
      valGetMsgRaw,
    } = exports,
    memU8 = new Uint8Array(mem.buffer),
    memF64 = new Float64Array(mem.buffer),
    memI64 = new BigInt64Array(mem.buffer);

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

  function mkArray(items) {
    const b = newArray(items.length);
    for (let i = 0; i < items.length; i++) {
      arraySetItem(b, i, items[i]);
    }
    return b;
  }

  function mkBlock(items) {
    const b = newBlock(items.length);
    for (let i = 0; i < items.length; i++) {
      blockSetItem(b, i, items[i]);
    }
    return b;
  }

  function strToJS(v) {
    const len = strLen(v),
      chars = new Array(len);

    for (let i = 0; i < len; i++) {
      chars[i] = String.fromCharCode(strGetChar(v, i));
    }

    return chars.join("");
  }

  function arrayToJS(v) {
    const len = arrayLen(v),
      items = new Array(len);

    for (let i = 0; i < len; i++) {
      items[i] = toJS(arrayGetItem(v, i));
    }

    return items;
  }

  function toJS(v) {
    if (v instanceof FattBase) {
      return v;
    }
    switch (valGetTag(v)) {
      case TYPE_NIL:
        return v;
      case TYPE_INT:
        return valGetI64(v);
      case TYPE_FLOAT:
        return valGetF64(v);
      case TYPE_STR:
        return strToJS(v);
      case TYPE_LATER:
        return new Later(toJS(laterUnwrap(v)));
      case TYPE_NAME:
        return new Name(toJS(valGetNameStr(v)));
      case TYPE_ARRAY:
        return arrayToJS(v);
      case TYPE_PAIR:
        return new Pair(toJS(pairGetA(v)), toJS(pairGetB(v)));
      case TYPE_MSG:
        return new Msg(toJS(valGetMsgVerb(v)), toJS(valGetMsgObj(v)));
      case TYPE_SEND:
        return new Send(toJS(valGetSendSubj(v)), toJS(valGetSendMsg(v)));
      default:
        return null;
    }
  }

  const { parse } = makeParser({
    mkStr,
    mkRawStr,
    mkBlock,
    mkArray,
    mkNil: () => NIL,
    newInt,
    newFloat,
    newLater,
    newName: (s) => newName(mkRawStr(s)),
    newPair,
    newMsg,
    newSend: (subj, msg) => newSend(subj, valGetMsgRaw(msg)),
  });

  function run(f, code) {
    return toJS(frameEval(f, parse(code)));
  }

  return {
    parse,
    toJS,
    run,
    mkStr,
    mkRawStr,
    mkArray,
    mkBlock,
    memU8,
    memI64,
    memF64,
    copyStringToMem,
  };
}
