export class Nil {}
export class Pair {
  constructor(a, b) {
    this.a = a;
    this.b = b;
  }
}
export class Name {
  constructor(value) {
    this.value = value;
  }
}
export class Block {
  constructor(items = []) {
    this.items = items;
  }
}
export class Msg {
  constructor(verb, obj) {
    this.verb = verb;
    this.obj = obj;
  }
}
export class Send {
  constructor(subj, msg) {
    this.subj = subj;
    this.msg = msg;
  }
}
export class Later {
  constructor(value) {
    this.value = value;
  }
}
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
    const rep = this.findReplyOrAny(getTag(s), m.verb);
    return rep instanceof Function ? rep(s, m.obj, this, m) : this.eval(rep);
  }
}
export const NIL_TAG = mkTag("Nil", Nil),
  INT_TAG = mkTag("Int", BigInt),
  FLOAT_TAG = mkTag("Float", Number),
  STR_TAG = mkTag("Str", String),
  PAIR_TAG = mkTag("Pair", Pair),
  NAME_TAG = mkTag("Name", Name),
  BLOCK_TAG = mkTag("Block", Block),
  ARRAY_TAG = mkTag("Array", Array),
  MAP_TAG = mkTag("Map", Map),
  MSG_TAG = mkTag("Msg", Msg),
  SEND_TAG = mkTag("Send", Send),
  LATER_TAG = mkTag("Later", Later),
  TAG_TAG = mkTag("Tag", Symbol);
import * as ohm from "ohm-js";
export const grammar = ohm.grammar(`McLulang {
    Main = Send
    Send = Value Msg*
    Msg = verb Value
    verb = verbStart verbPart*
    verbStart = "+" | "-" | "*" | "/" | "-" | "%" | "&" | "<" | ">" | "!" | "?" | "." | letter
    verbPart = verbStart | digit
    Value = Pair | PairHead
    Pair = PairHead ":" Value
    PairHead = Block | Array | Map | Scalar | Later | ParSend
    Block = "{" Exprs "}"
    Array = "[" "]" -- empty
      | "[" Exprs "]" -- items
    Exprs = Send ("," Send )*
    Map = "#" "{" "}" -- empty
      | "#" "{" Pairs "}" -- items
    Pairs = Pair ("," Pair)*
    Scalar = float | int | str | nil | name | MsgQuote
    Later = "@" Value
    ParSend = "(" Send ")"
    float = digit+ "." digit+
    int = digit+
    str = "'" (~"'" any)* "'"
    nil = "(" ")"
    name = (letter | "_") (letter | "_" | digit)*
    MsgQuote = "\\\\" Msg
  }`),
  semantics = grammar.createSemantics().addOperation("toAst", {
    Later: (_, v) => new Later(v.toAst()),
    ParSend: (_o, v, _c) => v.toAst(),
    Send(v, msgs) {
      let r = v.toAst();
      for (const msg of msgs.children) {
        r = new Send(r, msg.toAst());
      }
      return r;
    },
    Msg: (verb, obj) => new Msg(verb.toAst(), obj.toAst()),
    MsgQuote: (_, msg) => msg.toAst(),
    Pair: (a, _, b) => new Pair(a.toAst(), b.toAst()),
    Block: (_o, exprs, _c) => new Block(exprs.toAst()),
    Array_items: (_o, exprs, _c) => exprs.toAst(),
    Array_empty: (_o, _c) => [],
    Exprs: (first, _, rest) =>
      [first.toAst()].concat(rest.children.map((v) => v.toAst())),
    Map_items: (_h, _o, exprs, _c) =>
      new Map(exprs.toAst().map((p, _i, _) => [p.a, p.b])),
    Map_empty: (_h, _o, _c) => new Map(),
    Pairs: (first, _, rest) =>
      [first.toAst()].concat(rest.children.map((v) => v.toAst())),
    float(_a, _d, _b) {
      return parseFloat(this.sourceString);
    },
    int(_) {
      return BigInt(this.sourceString);
    },
    str: (_1, s, _3) => s.sourceString,
    name(_1, _2) {
      return new Name(this.sourceString);
    },
    verb(_1, _2) {
      return this.sourceString;
    },
    nil: (_o, _c) => NIL,
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
