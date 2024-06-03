import * as ohm from "ohm-js";

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

class Nil {
  eval(_e) {
    return this;
  }
}

const NIL = new Nil();

BigInt.prototype.eval = function (_e) {
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

const mkTag = Symbol,
  ANY_TAG = mkTag("Nil"),
  NIL_TAG = mkTag("Nil"),
  INT_TAG = mkTag("Int"),
  PAIR_TAG = mkTag("Pair"),
  NAME_TAG = mkTag("Name"),
  BLOCK_TAG = mkTag("Block"),
  MSG_TAG = mkTag("Msg"),
  SEND_TAG = mkTag("Send");

Nil.prototype.TAG = NIL_TAG;
BigInt.prototype.TAG = INT_TAG;
Pair.prototype.TAG = PAIR_TAG;
Name.prototype.TAG = NAME_TAG;
Block.prototype.TAG = BLOCK_TAG;
Msg.prototype.TAG = MSG_TAG;
Send.prototype.TAG = SEND_TAG;

class Later {
  constructor(value) {
    this.value = value;
  }

  eval(_e) {
    return this.value;
  }
}

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

  lookupHandler(tag, verb) {
    const v =
      this.handlers[tag]?.[verb] ?? this.handlers[ANY_TAG]?.[verb] ?? null;

    if (v) {
      return v;
    } else {
      return this.parent ? this.parent.lookupHandler(tag, verb) : null;
    }
  }
}

function env() {
  return new Env();
}

let dispatchMessage = (subject, msg, e) => {
  const handler = e.lookupHandler(subject.TAG, msg.verb);
  if (handler === null) {
    console.warn("verb", msg.verb, "not found for", subject.TAG, subject);
  }
  return handler.eval(
    e.enter().bind("it", subject).bind("that", msg.object),
    subject,
    msg,
  );
};

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

    Scalar = int | nil | name | MsgQuote

    MsgQuote = "\" Msg

    int = digit+
    nil = "(" ")"

    name = nameStart namePart*
    nameStart = letter | "_"
    namePart = nameStart | digit

    verb = verbStart verbPart*
    verbStart = "+" | "-" | "*" | "/" | "-" | "%" | "&" | "!" | "?" | "." | letter
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
    int(_) {
      return BigInt(this.sourceString);
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

function main() {
  const e = env()
    .bindHandler(INT_TAG, "+", (s, o) => s + o)
    .bindHandler(SEND_TAG, "does", (s, o, e, m) => {
      const tag = s.subject.eval(e).TAG,
        verb = s.msg.verb;
      e.parent.bindHandler(tag, verb, o);
      return o;
    });

  console.log(run("{@(0 add 0) does @{it + that}, 1 add 3}", e));
}

main();
