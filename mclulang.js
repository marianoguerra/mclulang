export class Base {
  handleMsg(e, _s, _m) {
    return e.eval(this);
  }
}
export class BaseValue extends Base {
  constructor(value) {
    super();
    this.value = value;
  }
}
export class Nil extends Base {}
export class Pair extends Base {
  constructor(a, b) {
    super();
    this.a = a;
    this.b = b;
  }
}
export class Name extends BaseValue {}
export class Block extends BaseValue {}
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
export class Later extends BaseValue {}
export const NIL = new Nil(),
  tagSym = Symbol("TagSym"),
  getTag = (v) => v[tagSym],
  setTag = (Cls, tag) => ((Cls.prototype[tagSym] = tag), tag),
  mkTag = (name, Cls) => setTag(Cls, Symbol(name)),
  ANY_TAG = mkTag("Any", class {}),
  NOREP = (s, o, _e, m) =>
    console.warn("verb", m.verb, "not found for", getTag(s), s, o);
export class Env {
  constructor(parent = null) {
    this.parent = parent;
    this.names = {};
    this.replies = {};
  }
  enter() {
    return new Env(this);
  }
  bind(key, value) {
    this.names[key] = value;
    return this;
  }
  find(key) {
    return this.names[key] ?? (this.parent ? this.parent.find(key) : NIL);
  }
  bindReply(tag, verb, handler) {
    this.replies[tag] ??= {};
    this.replies[tag][verb] = handler;
    return this;
  }
  findReply(tag, verb) {
    return this.replies[tag]?.[verb] ?? this.parent?.findReply(tag, verb);
  }
  findReplyOrAny(tag, verb) {
    return this.findReply(tag, verb) ?? this.findReply(ANY_TAG, verb) ?? NOREP;
  }
  eval(v) {
    return this.sendMsg(v, new Msg("eval", this));
  }
  sendMsg(s, m) {
    return this.findReplyOrAny(getTag(s), m.verb).handleMsg(this, s, m);
  }
}
export const NIL_TAG = mkTag("Nil", Nil),
  PAIR_TAG = mkTag("Pair", Pair),
  NAME_TAG = mkTag("Name", Name),
  BLOCK_TAG = mkTag("Block", Block),
  MSG_TAG = mkTag("Msg", Msg),
  SEND_TAG = mkTag("Send", Send),
  LATER_TAG = mkTag("Later", Later),
  INT_TAG = mkTag("Int", BigInt),
  FLOAT_TAG = mkTag("Float", Number),
  STR_TAG = mkTag("Str", String),
  ARRAY_TAG = mkTag("Array", Array),
  MAP_TAG = mkTag("Map", Map),
  TAG_TAG = mkTag("Tag", Symbol);
import * as ohm from "ohm-js";
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
    verbStart = "+" | "-" | "*" | "/" | "-" | "%" | "&" | "<" | ">" | "!" | "?" | "." | letter
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
    Send(v, msgs) {
      let r = v.toAst();
      for (const msg of msgs.children) {
        r = new Send(r, msg.toAst());
      }
      return r;
    },
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
  run = (code, e = new Env()) => {
    const ast = parse(code);
    return ast ? e.eval(ast) : null;
  };
