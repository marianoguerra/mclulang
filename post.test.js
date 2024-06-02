import * as ohm from "ohm-js";
import { expect, test } from "bun:test";

function mkLang(g, s) {
  const grammar = ohm.grammar(g),
    semantics = grammar.createSemantics();

  semantics.addOperation("toAst", s);

  function parse(code) {
    const matchResult = grammar.match(code);
    if (matchResult.failed()) {
      console.warn(
        "parse failed",
        matchResult.message,
      );
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

// ---

class Nil {
  eval(_e) {
    return this;
  }
}

const NIL = new Nil();

const lang0 = mkLang(
  `McLulang {
    Main = Scalar

    Scalar = nil

    nil = "(" ")"
  }`,
  {
    nil(_o, _c) {
      return NIL;
    },
  },
);

test("in the beginning there was nothing", () => {
  const { run } = lang0;
  expect(run("()")).toBe(NIL);
});

// ---

let Env = class Env {};

function env() {
  return new Env();
}

BigInt.prototype.eval = function (_e) {
  return this;
};

const lang1 = mkLang(
  `McLulang {
    Main = Scalar

    Scalar = int | nil

    int = digit+
    nil = "(" ")"
  }`,
  {
    int(_) {
      return BigInt(this.sourceString);
    },
    nil(_o, _c) {
      return NIL;
    },
  },
);

test("then the programmer made the Scalar and saw it was good", () => {
  const { run } = lang1;
  expect(run("42")).toBe(42n);
});

// ---

class Pair {
  constructor(a, b) {
    this.a = a;
    this.b = b;
  }

  eval(e) {
    return new Pair(this.a.eval(e), this.b.eval(e));
  }
}

const lang2 = mkLang(
  `McLulang {
    Main = Value

    Value = Pair | Scalar

    Pair = Scalar ":" Value

    Scalar = int | nil

    int = digit+
    nil = "(" ")"
  }`,
  {
    Pair(a, _, b) {
      return new Pair(a.toAst(), b.toAst());
    },
    int(_) {
      return BigInt(this.sourceString);
    },
    nil(_o, _c) {
      return NIL;
    },
  },
);

test("but it saw the Scalar was alone, so it made the Pair", () => {
  const { run } = lang2;
  expect(run("10")).toBe(10n);
  {
    const v = run("1 : 2");
    expect(v.a).toBe(1n);
    expect(v.b).toBe(2n);
  }
  {
    const v = run("1 : 2 : 3");
    expect(v.a).toBe(1n);
    expect(v.b.a).toBe(2n);
    expect(v.b.b).toBe(3n);
  }
});

// ---

class Name {
  constructor(value) {
    this.value = value;
  }

  eval(e) {
    return e.lookup(this.value);
  }
}

Env = class Env {
  constructor() {
    this.bindings = {};
  }

  bind(key, value) {
    this.bindings[key] = value;
    return this;
  }

  lookup(key) {
    return this.bindings[key] ?? NIL;
  }
};

const lang3 = mkLang(
  `McLulang {
    Main = Value

    Value = Pair | Scalar

    Pair = Scalar ":" Value

    Scalar = int | nil | name

    int = digit+
    nil = "(" ")"

    name = nameStart namePart*
    nameStart = letter | "_"
    namePart = nameStart | digit
  }`,
  {
    Pair(a, _, b) {
      return new Pair(a.toAst(), b.toAst());
    },
    int(_) {
      return BigInt(this.sourceString);
    },
    name(_1, _2) {
      return new Name(this.sourceString);
    },
    nil(_o, _c) {
      return NIL;
    },
  },
);

test("with more than one thing it needed the Name", () => {
  const { run } = lang3;
  expect(run("a")).toBe(NIL);
  expect(run("foo")).toBe(NIL);
  const e = env();
  e.bind("foo", 20n);
  expect(run("foo", e)).toBe(20n);
});

// ---

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

const lang4 = mkLang(
  `McLulang {
    Main = Value

    Value = Pair | Block | Scalar

    Pair = Scalar ":" Value

    Block = "{" Exprs "}"

    Exprs = Value ("," Value)*

    Scalar = int | nil | name

    int = digit+
    nil = "(" ")"

    name = nameStart namePart*
    nameStart = letter | "_"
    namePart = nameStart | digit
  }`,
  {
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
    nil(_o, _c) {
      return NIL;
    },
  },
);

test("the Name allowed more than pairs, the Block was created", () => {
  const { run } = lang4;
  expect(run("{1}")).toBe(1n);
  expect(run("{1, 2}")).toBe(2n);
  expect(run("{1, 2, a}", env().bind("a", 3n))).toBe(3n);
});

// ---

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

let dispatchMessage = (subject, msg, e) => {
  const handler = e.lookupHandler(subject.TAG, msg.verb);
  if (handler === null) {
    console.warn("verb", msg.verb, "not found for", subject.TAG, subject);
  }
  return handler(subject, msg.object, e, msg);
};

Env = class Env {
  constructor() {
    this.bindings = {};
    this.handlers = {};
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
    this.handlers[tag][verb] = handler;
    return this;
  }

  bindHandlers(tag, handlers) {
    for (const verb in handlers) {
      this.bindHandler(tag, verb, handlers[verb]);
    }
    return this;
  }

  lookupHandler(tag, verb) {
    return this.handlers[tag]?.[verb] ??
      this.handlers[ANY_TAG]?.[verb] ??
      null;
  }
};

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

const lang5 = mkLang(
  `McLulang {
    Main = Send
  
    Send = Value Msg*
    Msg = verb Value

    Value = Pair | Block | Scalar

    Pair = Scalar ":" Value

    Block = "{" Exprs "}"

    Exprs = Value ("," Value)*

    Scalar = int | nil | name

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

test("to communicate it created the message", () => {
  const { run } = lang5,
    e = env().bindHandlers(INT_TAG, {
      "+": (a, b) => a + b,
      "*": (a, b) => a * b,
    });

  expect(run("1 + 2", e)).toBe(3n);
  expect(run("10 * 2 + 3", e)).toBe(23n);
});

// ---

const lang6 = mkLang(
  `McLulang {
    Main = Send
  
    Send = Value Msg*
    Msg = verb Value

    Value = Pair | Block | Scalar

    Pair = Scalar ":" Value

    Block = "{" Exprs "}"

    Exprs = Value ("," Value)*

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

test("with the message came the quote", () => {
  const { run } = lang6,
    m = run("\ + 2");
  expect(m.TAG).toBe(MSG_TAG);
  expect(m.verb).toBe("+");
  expect(m.object).toBe(2n);
});

test("a quote could be forwarded to anyone", () => {
  const { run } = lang7,
    e = env()
      .bindHandler(
        INT_TAG,
        "+",
        (s, o) => s + o,
      )
      .bindHandler(
        ANY_TAG,
        "send",
        (s, _o, e, m) => dispatchMessage(s, m.object, e),
      )
      .bindHandler(
        PAIR_TAG,
        "send",
        (s, _o, e, m) =>
          new Pair(
            dispatchMessage(s.a, m, e),
            dispatchMessage(s.b, m, e),
          ),
      );

  expect(run("1 send \ + 2", e)).toBe(3n);
  {
    const v = run("1 : 2 send \ + 2", e);
    expect(v.a).toBe(3n);
    expect(v.b).toBe(4n);
  }
  {
    const v = run("1 : 2 : 3 send \ + 2", e);
    expect(v.a).toBe(3n);
    expect(v.b.a).toBe(4n);
    expect(v.b.b).toBe(5n);
  }
});

// ---

class Later {
  constructor(value) {
    this.value = value;
  }

  eval(_e) {
    return this.value;
  }
}

// XXX: changed Pair to allow all Value types except Pair itself
// XXX: changed Exprs to be Send+ instead of Value
const lang7 = mkLang(
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

test("with alternatives some thing where left to be evaluated later", () => {
  const { run } = lang7,
    e = env()
      .bindHandler(NIL_TAG, "?", (_s, o, e) => o.b.eval(e))
      .bindHandler(INT_TAG, "?", (_s, o, e) => o.a.eval(e));

  expect(run("() ? 1 : 2", e)).toBe(2n);
  expect(run("0 ? 1 : 2", e)).toBe(1n);
  expect(run("() ? 2 : 3 ? 4 : 5", e)).toBe(4n);
  expect(run("() ? 2 : () ? 4 : 5", e)).toBe(5n);

  expect(run("() ? @ 1 : 2", e)).toBe(2n);
  expect(run("0 ? @ 1 : 2", e)).toBe(1n);
  expect(run("() ? @ 2 : 3 ? @ 4 : 5", e)).toBe(4n);
  expect(run("() ? @ 2 : () ? @ 4 : 5", e)).toBe(5n);
});

class NativeHandler {
  constructor(fn) {
    this.fn = fn;
  }

  eval(e, subject, msg) {
    return this.fn(subject, msg.object, e, msg);
  }
}

Env = class Env {
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
    this.handlers[tag][verb] = handler instanceof Function
      ? new NativeHandler(handler)
      : handler;
    return this;
  }

  bindHandlers(tag, handlers) {
    for (const verb in handlers) {
      this.bindHandler(tag, verb, handlers[verb]);
    }
    return this;
  }

  lookupHandler(tag, verb) {
    const v = this.handlers[tag]?.[verb] ??
      this.handlers[ANY_TAG]?.[verb] ??
      null;

    if (v) {
      return v;
    } else {
      return this.parent ? this.parent.lookupHandler(tag, verb) : null;
    }
  }
};

dispatchMessage = (subject, msg, e) => {
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

test("like the meaning of a name", () => {
  const { run } = lang7,
    e = env()
      .bindHandler(INT_TAG, "+", (s, o) => s + o)
      .bindHandler(NAME_TAG, "is", (s, o, e) => {
        e.parent.bind(s.value, o);
        return o;
      });

  expect(run("@foo", e).TAG).toBe(NAME_TAG);
  expect(run("@foo", e).value).toBe("foo");
  expect(run("@foo is 42", e)).toBe(42n);
  expect(run("{@foo is 42}", e)).toBe(42n);
  expect(run("{@foo is 42, foo + 1}", e)).toBe(43n);
});

test("or the meaning of a message", () => {
  const { run } = lang7,
    e = env()
      .bindHandler(INT_TAG, "+", (s, o) => s + o)
      .bindHandler(SEND_TAG, "does", (s, o, e, m) => {
        const tag = s.subject.eval(e).TAG,
          verb = s.msg.verb;
        e.parent.bindHandler(tag, verb, o);
        return o;
      });

  expect(run("{@(0 add 0) does @{it + that}, 1 add 3}", e)).toBe(4n);
});

// ---
