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
} from "./fatter.js";
import { bindReplies, mergeToStr, toStr } from "../fatt.common.js";

// monkeypatch to allow int to be an message reply body
BigInt.prototype.call = function (_, _s, _m, e) {
  return e.eval(this);
};

export const eToStr = bindReplies(mergeToStr({})).right(),
  print = (p, v) => console.log(p, v ? toStr(v, eToStr) : v);

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

function mkPrimFrame() {
  function bo(fn, assertT) {
    return (s, m, _e) => fn(s, assertT(m.obj));
  }

  const boi = (fn) => bo(fn, assertInt),
    bof = (fn) => bo(fn, assertFloat),
    bos = (fn) => bo(fn, assertStr);

  const prim = new Frame().bindObj({
    [TYPE_NIL]: new Frame().bindObj({
      eval: (s) => s,
      "<": () => NIL,
      "=": (s, m) => (s === m.obj ? 1n : NIL),
    }),
    [TYPE_INT]: new Frame().bindObj({
      eval: (s) => s,
      "+": boi((a, b) => a + b),
      "-": boi((a, b) => a - b),
      "*": boi((a, b) => a * b),
      "/": boi((a, b) => a / b),
      "<": (s, m) => (s < assertInt(m.obj) ? s : NIL),
      "=": (s, m) => (s === assertInt(m.obj) ? s : NIL),
    }),
    [TYPE_FLOAT]: new Frame().bindObj({
      eval: (s) => s,
      "+": bof((a, b) => a + b),
      "-": bof((a, b) => a - b),
      "*": bof((a, b) => a * b),
      "/": bof((a, b) => a / b),
      "<": (s, m) => (s < assertFloat(m.obj) ? s : NIL),
      "=": (s, m) => (s === assertFloat(m.obj) ? s : NIL),
    }),
    [TYPE_STR]: new Frame().bindObj({
      eval: (s) => s,
      "+": bos((a, b) => a + b),
      "<": (s, m) => (s.localeCompare(assertStr(m.obj)) < 0 ? s : NIL),
      "=": (s, m) => (s === assertStr(m.obj) ? s : NIL),
    }),
    [TYPE_LATER]: new Frame().bindObj({ eval: (s) => s.value }),
    [TYPE_FRAME]: new Frame().bindObj({
      eval: (s) => s,
      up: (s) => s.up,
      "eval-in": (s, m) => s.eval(m.obj),
      find: (s, m) => s.find(m.obj),
      bind: (s, m) => s.bind(m.obj.a, m.obj.b),
      "get-type": (_s, m) => getType(m.obj),
      "new-frame": () => new Frame(),
      // optional
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
    }),
    [TYPE_NAME]: new Frame().bindObj({
      name: (s) => s.value,
      eval: (s, _m, e) => {
        const name = s.value;
        if (name === "e") {
          return e;
        } else {
          return e.find(name);
        }
      },
    }),
    [TYPE_BLOCK]: new Frame().bind("eval", (s, _m, e) =>
      s.value.reduce((_accum, item) => e.eval(item), NIL),
    ),
    [TYPE_ARRAY]: new Frame().bind("eval", (s, _m, e) =>
      s.map((v) => e.eval(v)),
    ),
    [TYPE_MSG]: new Frame().bindObj({
      verb: (s) => s.verb,
      obj: (s) => s.obj,
      eval: (s, _m, e) => new Msg(s.verb, e.eval(s.obj)),
    }),
    [TYPE_PAIR]: new Frame().bindObj({
      a: (s) => s.a,
      b: (s) => s.b,
      eval: (s, _m, e) => new Pair(e.eval(s.a), e.eval(s.b)),
    }),
    [TYPE_SEND]: new Frame().bindObj({
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
    }),
  });

  return prim;
}

export function runPrim(code) {
  const prim = mkPrimFrame();
  const ast = parse(code),
    r = runAst(ast, prim);

  return r;
}
