export function mkStrFns(memU8, strFromMem, rawStrFromMem) {
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
  return { mkStr, mkRawStr };
}
