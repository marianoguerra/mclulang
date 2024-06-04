import * as ohm from "ohm-js";

class Nil {
  eval(_e) {
    return this;
  }
}
const NIL = new Nil();

BigInt.prototype.eval = function (_e) {
  return this;
};
Number.prototype.eval = function (_e) {
  return this;
};
String.prototype.eval = function (_e) {
  return this;
};

class Pair {
  constructor(a, b) {
    this.a = a;
    this.b = b;
  }
  eval(e) {
    return new Pair(this.a.eval(e), this.b.eval(e));
  }
}

class Name {
  constructor(value) {
    this.value = value;
  }
  eval(e) {
    return e.lookup(this.value);
  }
}

class Block {
  constructor(items = []) {
    this.items = items;
  }
  eval(e) {
    let r = NIL;
    for (const item of this.items) {
      r = item.eval(e);
    }
    return r;
  }
}

class Msg {
  constructor(verb, object) {
    this.verb = verb;
    this.object = object;
  }
  eval(e) {
    return new Msg(this.verb, this.object.eval(e));
  }
}

class Send {
  constructor(subject, msg) {
    this.subject = subject;
    this.msg = msg;
  }
  eval(e) {
    return dispatchMessage(this.subject.eval(e), this.msg.eval(e), e);
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
  eval(_e) {
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
  MSG_TAG = mkTag("Msg", Msg),
  SEND_TAG = mkTag("Send", Send),
  LATER_TAG = mkTag("Later", Later);

class NativeHandler {
  constructor(fn) {
    this.fn = fn;
  }
  eval(e, subject, msg) {
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
}

export const env = () => new Env();

let dispatchMessage = (subject, msg, e) => {
  const handler = e.lookupHandler(getTag(subject), msg.verb);
  if (handler === null) {
    console.warn("verb", msg.verb, "not found for", getTag(subject), subject);
  }
  return handler.eval(
    e.enter().bind("it", subject).bind("that", msg.object),
    subject,
    msg,
  );
};

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
    return ast ? ast.eval(e) : null;
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
    PairHead = Block | Scalar | Later | ParSend

    Block = "{" Exprs "}"

    Exprs = Send ("," Send )*

    Scalar = float | int | str | nil | name | MsgQuote

    MsgQuote = "\" Msg

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
