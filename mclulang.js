import * as ohm from "ohm-js";

export const evalSym = Symbol("eval");

export class Nil {
  [evalSym](_e) {
    return this;
  }
}
export const NIL = new Nil();

export const setEval = (Cls, fn) => (Cls.prototype[evalSym] = fn),
  setEvalId = (Cls) =>
    setEval(Cls, function (_e) {
      return this;
    });

setEvalId(BigInt);
setEvalId(Number);
setEvalId(String);
setEval(Array, function (e) {
  return this.map((v, _i, t) => evalu(v, e));
});

export function evalu(v, e) {
  return v[evalSym](e);
}

export class Pair {
  constructor(a, b) {
    this.a = a;
    this.b = b;
  }
  [evalSym](e) {
    return new Pair(evalu(this.a, e), evalu(this.b, e));
  }
}

class Name {
  constructor(value) {
    this.value = value;
  }
  [evalSym](e) {
    return e.lookup(this.value);
  }
}

class Block {
  constructor(items = []) {
    this.items = items;
  }
  [evalSym](e) {
    let r = NIL;
    for (const item of this.items) {
      r = evalu(item, e);
    }
    return r;
  }
}

class Msg {
  constructor(verb, object) {
    this.verb = verb;
    this.object = object;
  }
  [evalSym](e) {
    return new Msg(this.verb, evalu(this.object, e));
  }
}

class Send {
  constructor(subject, msg) {
    this.subject = subject;
    this.msg = msg;
  }
  [evalSym](e) {
    return e.dispatchMessage(this.subject, this.msg);
  }
}

const tagSym = Symbol("Tag");
export const getTag = (v) => v[tagSym];
export function setTag(Cls, tag) {
  Cls.prototype[tagSym] = tag;
}
export function mkTag(name, Cls) {
  const tag = Symbol(name);
  if (Cls) {
    setTag(Cls, tag);
  }
  return tag;
}

class Later {
  constructor(value) {
    this.value = value;
  }
  [evalSym](_e) {
    return this.value;
  }
}

export const ANY_TAG = mkTag("Any"),
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
  LATER_TAG = mkTag("Later", Later);

class NativeHandler {
  constructor(fn) {
    this.fn = fn;
  }
  [evalSym](e, subject, msg) {
    return this.fn(subject, msg.object, e, msg);
  }
}

class Env {
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
    return this.bindings[key] ?? NIL;
  }

  bindHandler(tag, verb, handler) {
    this.handlers[tag] ??= {};
    this.handlers[tag][verb] =
      handler instanceof Function ? new NativeHandler(handler) : handler;
    return this;
  }

  bindHandlers(tag, handlers) {
    for (const verb in handlers) {
      this.bindHandler(tag, verb, handlers[verb]);
    }
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

  dispatchMessage(s, m) {
    const subject = evalu(s, this),
      msg = evalu(m, this),
      handler = this.lookupHandler(getTag(subject), msg.verb);
    if (handler === null) {
      console.warn("verb", msg.verb, "not found for", getTag(subject), subject);
    }
    return handler[evalSym](
      this.enter().bind("it", subject).bind("that", msg.object),
      subject,
      msg,
    );
  }
}

export const env = () => new Env();

function mkLang(g, s) {
  const grammar = ohm.grammar(g),
    semantics = grammar.createSemantics();

  semantics.addOperation("toAst", s);

  function parse(code) {
    const matchResult = grammar.match(code);
    if (matchResult.failed()) {
      console.warn("parse failed", matchResult.message);
      return null;
    }
    const ast = semantics(matchResult).toAst();
    return ast;
  }

  function run(code, e = env()) {
    const ast = parse(code);
    return ast ? evalu(ast, e) : null;
  }

  return { parse, run };
}

export const { parse, run } = mkLang(
  `McLulang {
    Main = Send
  
    Send = Value Msg*
    Msg = verb Value

    Value = Pair | PairHead

    Later = "@" Value
    ParSend = "(" Send ")"

    Pair = PairHead ":" Value
    PairHead = Block | Array | Scalar | Later | ParSend

    Block = "{" Exprs "}"
    Array = "[" "]" -- empty
      | "[" Exprs "]" -- items

    Exprs = Send ("," Send )*

    Scalar = float | int | str | nil | name | MsgQuote

    MsgQuote = "\\\\" Msg

    int = digit+
    float = digit+ "." digit+
    nil = "(" ")"
    stringDelimiter = "'"
    str = stringDelimiter (~stringDelimiter any)* stringDelimiter

    name = nameStart namePart*
    nameStart = letter | "_"
    namePart = nameStart | digit

    verb = verbStart verbPart*
    verbStart = "+" | "-" | "*" | "/" | "-" | "%" | "&" | "<" | ">" | "!" | "?" | "." | letter
    verbPart = verbStart | digit
  }`,
  {
    Later(_, v) {
      return new Later(v.toAst());
    },
    ParSend(_o, v, _c) {
      return v.toAst();
    },
    Send(v, msgs) {
      let r = v.toAst();
      for (const msg of msgs.children) {
        r = new Send(r, msg.toAst());
      }
      return r;
    },
    Msg(verb, object) {
      return new Msg(verb.toAst(), object.toAst());
    },
    MsgQuote(_, msg) {
      return msg.toAst();
    },
    Pair(a, _, b) {
      return new Pair(a.toAst(), b.toAst());
    },
    Block(_o, exprs, _c) {
      return new Block(exprs.toAst());
    },
    Array_items(_o, exprs, _c) {
      return exprs.toAst();
    },
    Array_empty(_o, _c) {
      return [];
    },
    Exprs(first, _, rest) {
      return [first.toAst()].concat(rest.children.map((v) => v.toAst()));
    },
    float(_a, _d, _b) {
      return parseFloat(this.sourceString);
    },
    int(_) {
      return BigInt(this.sourceString);
    },
    str(_1, s, _3) {
      return s.sourceString;
    },
    name(_1, _2) {
      return new Name(this.sourceString);
    },
    verb(_1, _2) {
      return this.sourceString;
    },
    nil(_o, _c) {
      return NIL;
    },
  },
);
