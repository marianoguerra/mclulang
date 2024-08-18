import { makeParser } from "./fatt.parser.js";

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
      TYPE_NIL: { value: TYPE_NIL },
      TYPE_INT: { value: TYPE_INT },
      TYPE_FLOAT: { value: TYPE_FLOAT },
      TYPE_STR: { value: TYPE_STR },
      TYPE_ARRAY: { value: TYPE_ARRAY },
      strLen,
      strGetChar,
      arrayLen,
      arrayGetItem,
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
    switch (valGetTag(v)) {
      case TYPE_NIL:
        return v;
      case TYPE_INT:
        return valGetI64(v);
      case TYPE_FLOAT:
        return valGetF64(v);
      case TYPE_STR:
        return strToJS(v);
      case TYPE_ARRAY:
        return arrayToJS(v);
      default:
        return null;
    }
  }

  const { parse } = makeParser(exports, { mkStr, mkRawStr, mkBlock, mkArray });

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
