export class Base {
  call(_, _s, _m, e) {
    return e.eval(this);
  }
}
export class Nil extends Base {}
export class BaseValue extends Base {
  constructor(value) {
    super();
    this.value = value;
  }
}
export class Name extends BaseValue {}
export class Pair extends Base {
  constructor(a, b) {
    super();
    this.a = a;
    this.b = b;
  }
}
export class Later extends BaseValue {}
export class Msg extends Base {
  constructor(verb, obj) {
    super();
    this.verb = verb;
    this.obj = obj;
  }
}
export class Send extends Base {
  constructor(subj, msg) {
    super();
    this.subj = subj;
    this.msg = msg;
  }
}
export class Block extends BaseValue {}
export const NIL = new Nil(),
  typeSym = Symbol("TypeSym"),
  getType = (v) => (v != null ? v[typeSym] : null),
  setType = (Cls, type) => ((Cls.prototype[typeSym] = type), type),
  mkType = (name, Cls) => setType(Cls, Symbol(name));
export class Frame {
  constructor(left = null, up = null) {
    this.up = up;
    this.left = left;
    this.upLimit = false;
    this.leftLimit = false;
    this.binds = new Map();
  }
  eval(v) {
    return this.send(v, new Msg("eval", this));
  }
  getSendHandler(s, m) {
    const type = getType(s),
      proto = this.find(type);

    if (proto) {
      return proto.find(m.verb);
    } else {
      return null;
    }
  }
  send(s, m) {
    const handler = this.getSendHandler(s, m);
    if (handler) {
      return handler.call(null, s, m, this);
    } else {
      throw new Error("HandlerNotFound", { cause: { s, m, e: this } });
    }
  }
  bind(name, value) {
    this.binds.set(name, value);
    return this;
  }
  find(name) {
    const v = this.binds.get(name);
    if (v === undefined) {
      if (this.upLimit || this.up === null) {
        if (this.leftLimit || this.left === null) {
          return v;
        }
        return this.left.find(name);
      }
      return this.up.find(name);
    }
    return v;
  }
  down() {
    return new Frame(this.left, this);
  }
  right() {
    return new Frame(this, null);
  }
  setUpLimit() {
    this.upLimit = true;
    return this;
  }
  setLeftLimit() {
    this.leftLimit = true;
    return this;
  }
}
export const TYPE_FRAME = mkType("Frame", Frame),
  TYPE_NAME = mkType("Name", Name),
  TYPE_MSG = mkType("Msg", Msg),
  TYPE_SEND = mkType("Send", Send),
  TYPE_INT = mkType("Int", BigInt),
  TYPE_NIL = mkType("Nil", Nil),
  TYPE_PAIR = mkType("Pair", Pair),
  TYPE_LATER = mkType("Later", Later),
  TYPE_BLOCK = mkType("Block", Block),
  TYPE_FLOAT = mkType("Float", Number),
  TYPE_STR = mkType("Str", String),
  TYPE_ARRAY = mkType("Array", Array),
  TYPE_MAP = mkType("Map", Map),
  TYPE_SYM = mkType("Symbol", Symbol);
import * as ohm from "./node_modules/ohm-js/index.mjs";
export const grammar = ohm.grammar(`McLulang {
    Main = Send
    nil = "(" ")"
    Pair = PairHead ":" Value
    PairHead = Block | Array | Map | Scalar | Later | ParSend
    name = (letter | "_") (letter | "_" | digit)*
    Block = "{" Exprs "}"
    Exprs = Send ("," Send )*
    Msg = verb Value
    MsgQuote = "\\\\" Msg
    verb = verbStart verbPart*
    verbStart = "+" | "-" | "*" | "/" | "$" | "%" | "&" | "<" | ">" | "!" | "?" | "." | letter
    verbPart = verbStart | digit
    Send = Value Msg*
    ParSend = "(" Send ")"
    Later = "@" Value
    Value = Pair | PairHead
    Scalar = float | int | str | nil | name | MsgQuote
    float = digit+ "." digit+
    int = digit+
    str = "\\\"" (~"\\\"" any)* "\\\""
    Array = "[" "]" -- empty
      | "[" Exprs "]" -- items
    Map = "#" "{" "}" -- empty
      | "#" "{" Pairs "}" -- items
    Pairs = Pair ("," Pair)*
  }`),
  semantics = grammar.createSemantics().addOperation("toAst", {
    nil: (_o, _c) => NIL,
    Pair: (a, _, b) => new Pair(a.toAst(), b.toAst()),
    name(_1, _2) {
      return new Name(this.sourceString);
    },
    Block: (_o, exprs, _c) => new Block(exprs.toAst()),
    Exprs: (first, _, rest) =>
      [first.toAst()].concat(rest.children.map((v) => v.toAst())),
    Msg: (verb, obj) => new Msg(verb.toAst(), obj.toAst()),
    verb(_1, _2) {
      return this.sourceString;
    },
    MsgQuote: (_, msg) => msg.toAst(),
    Send: (v, msgs) =>
      msgs.children.reduce((acc, msg) => new Send(acc, msg.toAst()), v.toAst()),
    ParSend: (_o, v, _c) => v.toAst(),
    Later: (_, v) => new Later(v.toAst()),
    int(_) {
      return BigInt(this.sourceString);
    },
    float(_a, _d, _b) {
      return parseFloat(this.sourceString);
    },
    str: (_1, s, _3) => s.sourceString,
    Array_items: (_o, exprs, _c) => exprs.toAst(),
    Array_empty: (_o, _c) => [],
    Map_items: (_h, _o, exprs, _c) =>
      new Map(exprs.toAst().map((p, _i, _) => [p.a, p.b])),
    Map_empty: (_h, _o, _c) => new Map(),
    Pairs: (first, _, rest) =>
      [first.toAst()].concat(rest.children.map((v) => v.toAst())),
  }),
  parse = (code) => {
    const matchResult = grammar.match(code);
    if (matchResult.failed()) {
      console.warn("parse failed", matchResult.message);
      return null;
    }
    return semantics(matchResult).toAst();
  },
  logError = (err) => {
    switch (err.message) {
      case "BindingNotFound": {
        const { s } = err.cause;

        console.error("Binding not Found:", s.value);
        break;
      }
      case "HandlerNotFound": {
        const { s, m } = err.cause;

        console.error(
          "Handler not Found for type",
          s ?? getType(s),
          "message",
          m.verb,
          "in",
        );
        break;
      }
      default:
        console.error(err.message, err.cause, err);
    }
  },
  runAst = (ast, e) => {
    try {
      return ast ? e.eval(ast) : null;
    } catch (err) {
      logError(err);
      return null;
    }
  },
  run = (code, e) => {
    return runAst(parse(code), e);
  };
