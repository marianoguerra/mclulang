import { makeParser } from "./fatt.parser.js";

const _doubleToBigIntBuffer = new ArrayBuffer(8),
  _doubleToBigIntInt8Array = new Uint8Array(_doubleToBigIntBuffer),
  _doubleToBigIntInt64Array = new BigInt64Array(_doubleToBigIntBuffer),
  _doubleToBigIntFloat64Array = new Float64Array(_doubleToBigIntBuffer);

export function doubleToBigInt(v) {
  _doubleToBigIntFloat64Array[0] = v;
  return _doubleToBigIntInt64Array[0];
}

export function encodeStrStartLen(start, len) {
  return BigInt(start) | (BigInt(len) << 32n);
}

export function intToBytes(v) {
  _doubleToBigIntInt64Array[0] = BigInt(v);
  return [..._doubleToBigIntInt8Array.slice(0, 8)];
}

export function floatToBytes(v) {
  _doubleToBigIntFloat64Array[0] = Number(v);
  return [..._doubleToBigIntInt8Array.slice(0, 8)];
}

export function writeI64(memU8, v, start) {
  _doubleToBigIntInt64Array[0] = BigInt(v);
  for (let i = 0; i < 8; i++) {
    memU8[start + i] = _doubleToBigIntInt8Array[i];
  }
}

export function writeF64(memU8, v, start) {
  _doubleToBigIntFloat64Array[0] = v;
  for (let i = 0; i < 8; i++) {
    memU8[start + i] = _doubleToBigIntInt8Array[i];
  }
}

export const PUSH_NIL = 0,
  PUSH_1 = 1,
  PUSH_INT = 2,
  PUSH_FLOAT = 3,
  PUSH_STR = 4,
  POP_PAIR = 5,
  POP_ARRAY = 6,
  POP_BLOCK = 7,
  POP_LATER = 8,
  POP_NAME = 9,
  POP_MSG = 10,
  POP_SEND = 11,
  //
  PUSH_SYM_IT = 12,
  PUSH_SYM_THAT = 13,
  //
  PUSH_INT_BYTE = 128 | PUSH_INT,
  HALT = 255;

const STR_INSTRS = {
  it: PUSH_SYM_IT,
  that: PUSH_SYM_THAT,
};

export class Scalar {
  constructor(v) {
    this.v = v;
  }

  valueEquals(v) {
    return this.v === v;
  }

  equals(other) {
    return other instanceof this.constructor && this.valueEquals(other.v);
  }

  toInstrs(_ctx) {
    throw new Error("Not implemented");
  }
}

export class Ctx {
  constructor(strStart = 0) {
    this.strs = new Map();
    this.strStart = strStart;
    this.strEnd = strStart;
  }

  getStringIndex(v) {
    const cur = this.strs.get(v);
    if (cur === undefined) {
      const index = this.strEnd,
        buf = new TextEncoder().encode(v),
        len = buf.length;
      this.strs.set(v, { index, buf });
      this.strEnd += len;
      return index;
    } else {
      return cur.index;
    }
  }

  writeStrsToMem(memU8) {
    for (const { buf, index } of this.strs.values()) {
      const len = buf.length;
      for (let i = 0; i < len; i++) {
        memU8[index + i] = buf[i];
      }
    }
  }
}

export class Str extends Scalar {
  toInstrs(ctx) {
    const instr = STR_INSTRS[this.v];
    if (instr === undefined) {
      const index = ctx.getStringIndex(this.v);
      return [PUSH_STR, intToBytes(encodeStrStartLen(index, this.v.length))];
    } else {
      return [instr];
    }
  }
}
export class Int extends Scalar {
  toInstrs(_ctx) {
    if (this.v === 1n) {
      return [PUSH_1];
    } else if (this.v <= 255) {
      return [PUSH_INT_BYTE, Number(this.v)];
    } else {
      return [PUSH_INT, intToBytes(this.v)];
    }
  }
}
export class Float extends Scalar {
  toInstrs(_ctx) {
    return [PUSH_FLOAT, floatToBytes(this.v)];
  }
}
export class Name extends Scalar {
  toInstrs(ctx) {
    return [new Str(this.v).toInstrs(ctx), POP_NAME];
  }
}
export class Nil extends Scalar {
  constructor() {
    super(null);
  }

  toInstrs(_ctx) {
    return [PUSH_NIL];
  }
}
export const NIL = new Nil();

export class Later extends Scalar {
  valueEquals(v) {
    return this.v.equals(v);
  }

  toInstrs(ctx) {
    return [this.v.toInstrs(ctx), POP_LATER];
  }
}

export class Pair {
  constructor(a, b) {
    this.a = a;
    this.b = b;
  }

  equals(other) {
    return (
      other instanceof Pair && this.a.equals(other.a) && this.b.equals(other.b)
    );
  }

  toInstrs(ctx) {
    return [this.b.toInstrs(ctx), this.a.toInstrs(ctx), POP_PAIR];
  }
}
export class Msg {
  constructor(verb, obj) {
    this.verb = verb;
    this.obj = obj;
  }
  equals(other) {
    return (
      other instanceof Msg &&
      this.verb === other.verb &&
      this.obj.equals(other.obj)
    );
  }
  toInstrs(ctx) {
    return [new Str(this.verb).toInstrs(ctx), this.obj.toInstrs(ctx), POP_MSG];
  }
}
export class Send {
  constructor(subj, msg) {
    this.subj = subj;
    this.msg = msg;
  }
  equals(other) {
    return (
      other instanceof Send &&
      this.subj.equals(other.subj) &&
      this.msg.equals(other.msg)
    );
  }
  toInstrs(ctx) {
    const m = this.msg;
    return [
      this.subj.toInstrs(ctx),
      new Str(m.verb).toInstrs(ctx),
      m.obj.toInstrs(ctx),
      POP_SEND,
    ];
  }
}

export class Seq {
  constructor(items) {
    this.items = items;
  }

  equals(other) {
    return (
      other instanceof this.constructor &&
      this.items.length === other.items.length &&
      this.items.every((item, i, _) => item.equals(other.items[i]))
    );
  }

  getPopInstr() {
    return null;
  }

  toInstrs(ctx) {
    const len = this.items.length,
      r = new Array(len);
    for (let i = 0; i < len; i++) {
      r[i] = this.items[i].toInstrs(ctx);
    }
    return [r, new Int(len).toInstrs(ctx), this.getPopInstr()];
  }
}

export class Block extends Seq {
  getPopInstr() {
    return POP_BLOCK;
  }
}
export class Arr extends Seq {
  getPopInstr() {
    return POP_ARRAY;
  }
}

const { parse } = makeParser({
  mkNil: () => NIL,
  mkStr: (v) => new Str(v),
  newInt: (v) => new Int(v),
  newFloat: (v) => new Float(v),
  newLater: (v) => new Later(v),
  newName: (v) => new Name(v),
  mkRawStr: (v) => v,
  mkBlock: (items) => new Block(items),
  mkArray: (items) => new Arr(items),
  newPair: (a, b) => new Pair(a, b),
  newMsg: (a, b) => new Msg(a, b),
  newSend: (a, b) => new Send(a, b),
});

export { parse };
