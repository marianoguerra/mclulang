import {
  Pair,
  Msg,
  NIL,
  Frame,
  getType,
  parse,
  runAst,
  TYPE_NAME,
  TYPE_MSG,
  TYPE_SEND,
  TYPE_INT,
  TYPE_NIL,
  TYPE_PAIR,
  TYPE_LATER,
  TYPE_BLOCK,
  TYPE_FLOAT,
  TYPE_STR,
  TYPE_FRAME,
  TYPE_ARRAY,
  TYPE_MAP,
  TYPE_SYM,
  Send,
} from "./fatter.js";

function toStr(v, e) {
  return e.send(v, new Msg("toStr", NIL));
}

function wrapInParIfMsg(v, s) {
  return v instanceof Send ? `(${s})` : s;
}

const toStrReplies = {
  [TYPE_NAME]: {
    toStr: (s) => s.value,
  },
  [TYPE_MSG]: {
    toStr: (s, _m, e) => `\\ ${s.verb} ${toStr(s.obj, e)}`,
  },
  [TYPE_SEND]: {
    toStr: (s, _m, e) =>
      `${toStr(s.subj, e)} ${s.msg.verb} ${wrapInParIfMsg(s.msg.obj, toStr(s.msg.obj, e))}`,
  },
  [TYPE_INT]: {
    toStr: (s) => s.toString(),
  },
  [TYPE_NIL]: {
    toStr: () => "()",
  },
  [TYPE_PAIR]: {
    toStr: (s, _m, e) =>
      `${wrapInParIfMsg(s.a, toStr(s.a, e))} : ${wrapInParIfMsg(s.b, toStr(s.b, e))}`,
  },
  [TYPE_LATER]: {
    toStr: (s, _m, e) => `@(${toStr(s.value, e)})`,
  },
  [TYPE_BLOCK]: {
    toStr: (s, _m, e) =>
      `{${s.value.map((item) => toStr(item, e)).join(", ")}}`,
  },
  [TYPE_FLOAT]: {
    toStr: (s) => JSON.stringify(s),
  },
  [TYPE_STR]: {
    toStr: (s) => JSON.stringify(s),
  },
  [TYPE_ARRAY]: {
    toStr: (s, _m, e) => `[${s.map((item) => toStr(item, e)).join(", ")}]`,
  },
  [TYPE_MAP]: {
    toStr: (s, _m, e) =>
      `#{${Array.from(s.entries())
        .map(([k, v], _i, _) => `${toStr(k, e)}: ${toStr(v, e)}`)
        .join(", ")}}`,
  },
  [TYPE_SYM]: {
    toStr: (s) => `(${JSON.stringify(s.description)} as-type ())`,
  },
  [TYPE_FRAME]: { toStr: () => "<Frame>" },
};

// monkeypatch to allow int to be an message reply body
BigInt.prototype.call = function (_, _s, _m, e) {
  return e.eval(this);
};

function assertType(v, type, typeName) {
  if (typeof v === type) {
    return v;
  } else {
    throw new Error(`Expected type ${typeName} got ${typeof v}: ${v}`);
  }
}

const assertInt = (v) => assertType(v, "bigint", "Int"),
  assertFloat = (v) => assertType(v, "number", "Float"),
  assertStr = (v) => assertType(v, "string", "Str");

function bindPrimOptionals(prim) {
  prim.mergeObj({
    [TYPE_FRAME]: {
      $reply: (s, m, e) => {
        const send = m.obj.a,
          body = m.obj.b,
          // NOTE: could also do s.eval
          sub = e.eval(send.subj),
          subType = getType(sub),
          subTypeProto = s.find(subType),
          verb = send.msg.verb;

        subTypeProto.bind(verb, body);
        return NIL;
      },
    },
  });
}

function mkPrimFrame() {
  function bo(fn, assertT) {
    return (s, m, _e) => fn(s, assertT(m.obj));
  }

  const boi = (fn) => bo(fn, assertInt),
    bof = (fn) => bo(fn, assertFloat),
    bos = (fn) => bo(fn, assertStr);

  const prim = new Frame().mergeObj({
    [TYPE_NIL]: {
      eval: (s) => s,
      "<": () => NIL,
      "=": (s, m) => (s === m.obj ? 1n : NIL),
    },
    [TYPE_INT]: {
      eval: (s) => s,
      "+": boi((a, b) => a + b),
      "-": boi((a, b) => a - b),
      "*": boi((a, b) => a * b),
      "/": boi((a, b) => a / b),
      "<": (s, m) => (s < assertInt(m.obj) ? s : NIL),
      "=": (s, m) => (s === assertInt(m.obj) ? s : NIL),
    },
    [TYPE_FLOAT]: {
      eval: (s) => s,
      "+": bof((a, b) => a + b),
      "-": bof((a, b) => a - b),
      "*": bof((a, b) => a * b),
      "/": bof((a, b) => a / b),
      "<": (s, m) => (s < assertFloat(m.obj) ? s : NIL),
      "=": (s, m) => (s === assertFloat(m.obj) ? s : NIL),
    },
    [TYPE_STR]: {
      eval: (s) => s,
      "+": bos((a, b) => a + b),
      "<": (s, m) => (s.localeCompare(assertStr(m.obj)) < 0 ? s : NIL),
      "=": (s, m) => (s === assertStr(m.obj) ? s : NIL),
      size: (s) => BigInt(s.length),
    },
    [TYPE_LATER]: { eval: (s) => s.value },
    [TYPE_FRAME]: {
      eval: (s) => s,
      up: (s) => s.up,
      "eval-in": (s, m) => s.eval(m.obj),
      find: (s, m) => s.find(m.obj),
      bind: (s, m) => s.bind(m.obj.a, m.obj.b),
      "get-type": (_s, m) => getType(m.obj),
      "new-frame": () => new Frame(),
    },
    [TYPE_NAME]: {
      name: (s) => s.value,
      eval: (s, _m, e) => {
        const name = s.value;
        if (name === "e") {
          return e;
        } else {
          return e.find(name);
        }
      },
    },
    [TYPE_BLOCK]: {
      eval: (s, _m, e) => s.value.reduce((_accum, item) => e.eval(item), NIL),
    },
    [TYPE_ARRAY]: {
      eval: (s, _m, e) => s.map((v) => e.eval(v)),
      ".": (s, m) => s.at(Number(m.obj)),
      size: (s) => BigInt(s.length),
    },
    [TYPE_MSG]: {
      verb: (s) => s.verb,
      obj: (s) => s.obj,
      eval: (s, _m, e) => new Msg(s.verb, e.eval(s.obj)),
    },
    [TYPE_PAIR]: {
      a: (s) => s.a,
      b: (s) => s.b,
      eval: (s, _m, e) => new Pair(e.eval(s.a), e.eval(s.b)),
    },
    [TYPE_SEND]: {
      subj: (s) => s.subj,
      msg: (s) => s.msg,
      eval: (s, _m, e) => {
        const subj = e.eval(s.subj),
          msg = e.eval(s.msg),
          r = e
            .down()
            .bind("it", subj)
            .bind("msg", msg)
            .bind("that", msg.obj)
            .send(subj, msg);
        return r;
      },
    },
  });

  return prim;
}

export function runPrim(code, bindOptionals = true) {
  const prim = mkPrimFrame().mergeObj(toStrReplies);

  if (bindOptionals) {
    bindPrimOptionals(prim);
  }

  const ast = parse(code),
    r = runAst(ast, prim);

  return r;
}
