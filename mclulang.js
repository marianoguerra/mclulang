import * as ohm from "ohm-js";
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
  constructor(verb, object) {
    this.verb = verb;
    this.object = object;
  }
}
export class Send {
  constructor(subject, msg) {
    this.subject = subject;
    this.msg = msg;
  }
}
export class Later {
  constructor(value) {
    this.value = value;
  }
}
export class Env {
  constructor(parent = null) {
    this.parent = parent;
    this.bindings = {};
    this.handlers = {};
  }
  enter() {
    return new Env(this);
  }
  bind(key, value) {
    this.bindings[key] = value;
    return this;
  }
  lookup(key) {
    return this.bindings[key] ?? (this.parent ? this.parent.lookup(key) : NIL);
  }
  bindHandler(tag, verb, handler) {
    this.handlers[tag] ??= {};
    this.handlers[tag][verb] = handler;
    return this;
  }
  lookupHandlerStrict(tag, verb) {
    return (
      this.handlers[tag]?.[verb] ??
      (this.parent && this.parent.lookupHandlerStrict(tag, verb))
    );
  }
  lookupHandler(tag, verb) {
    return (
      this.lookupHandlerStrict(tag, verb) ??
      this.lookupHandlerStrict(ANY_TAG, verb) ??
      null
    );
  }
  eval(v) {
    return this.sendRawMessage(v, new Msg("eval", this));
  }
  sendMessage(s, m) {
    const subject = this.eval(s),
      msg = this.eval(m);
    return this.enter()
      .bind("it", subject)
      .bind("that", msg.object)
      .sendRawMessage(subject, msg);
  }
  sendRawMessage(subject, msg) {
    const handler = this.lookupHandler(getTag(subject), msg.verb);
    if (handler === null) {
      console.warn("verb", msg.verb, "not found for", getTag(subject), subject);
    } else {
      return handler instanceof Function
        ? handler(subject, msg.object, this, msg)
        : this.eval(handler);
    }
  }
}
export const NIL = new Nil(),
  tagSym = Symbol("Tag"),
  getTag = (v) => v[tagSym],
  setTag = (Cls, tag) => ((Cls.prototype[tagSym] = tag), tag),
  mkTag = (name, Cls) => setTag(Cls, Symbol(name)),
  ANY_TAG = mkTag("Any", class {}),
  NIL_TAG = mkTag("Nil", Nil),
  INT_TAG = mkTag("Int", BigInt),
  FLOAT_TAG = mkTag("Float", Number),
  STR_TAG = mkTag("Str", String),
  PAIR_TAG = mkTag("Pair", Pair),
  NAME_TAG = mkTag("Name", Name),
  BLOCK_TAG = mkTag("Block", Block),
  ARRAY_TAG = mkTag("Array", Array),
  MSG_TAG = mkTag("Msg", Msg),
  SEND_TAG = mkTag("Send", Send),
  LATER_TAG = mkTag("Later", Later),
  grammar = ohm.grammar(`McLulang {
    Main = Send
    Send = Value Msg*
    Msg = verb Value
    verb = verbStart verbPart*
    verbStart = "+" | "-" | "*" | "/" | "-" | "%" | "&" | "<" | ">" | "!" | "?" | "." | letter
    verbPart = verbStart | digit
    Value = Pair | PairHead
    Pair = PairHead ":" Value
    PairHead = Block | Array | Scalar | Later | ParSend
    Block = "{" Exprs "}"
    Array = "[" "]" -- empty
      | "[" Exprs "]" -- items
    Exprs = Send ("," Send )*
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
    Msg: (verb, object) => new Msg(verb.toAst(), object.toAst()),
    MsgQuote: (_, msg) => msg.toAst(),
    Pair: (a, _, b) => new Pair(a.toAst(), b.toAst()),
    Block: (_o, exprs, _c) => new Block(exprs.toAst()),
    Array_items: (_o, exprs, _c) => exprs.toAst(),
    Array_empty: (_o, _c) => [],
    Exprs: (first, _, rest) =>
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
