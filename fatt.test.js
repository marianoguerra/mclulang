/* eslint-disable no-inner-declarations */
/* eslint-disable no-unused-vars */
import { expect, test } from "bun:test";

/*
The most basic operation that distinguishes a programming language from a calculator
is its ability to give names to values and look them up later.

In programming languages bindings are stored in Frames in a call stack, let's try
a simple example in JavaScript:
*/

{
  let a = 10;
  let b = 20;
  console.log(a, b);
  // 10 20

  test("top level bindings", () => {
    expect(a).toBe(10);
    expect(b).toBe(20);
  });
}

/*
Let's start with a simple Frame object that holds bindings in a `Map` and has two operations:

- bind: store a value associated to a name
- find: return the value associated with a name or `undefined` if not found
*/

{
  class Frame {
    constructor() {
      this.binds = new Map();
    }

    bind(name, value) {
      this.binds.set(name, value);
      return this;
    }

    find(name) {
      return this.binds.get(name);
    }
  }

  test("top level bindings implementation", () => {
    const env = new Frame().bind("a", 10).bind("b", 20);
    expect(env.find("a")).toBe(10);
    expect(env.find("b")).toBe(20);
  });
}

/*
The smallest region that can hold bindings is the scope, in languages like
JavaScript binding lookup starts in the current scope and keeps going to outer scopes
*/

{
  let a = 10;
  let b = 20;
  {
    let b = 30;
    console.log(a, b);
    // 10 30

    test("nested scopes", () => {
      expect(a).toBe(10);
      expect(b).toBe(30);
    });
  }
}

/*
To replicate this our new implementation of `Frame` has an attribute `up`.
`find` starts in the current scope and if it doesn't find it there it continues 
in the scope referenced by `up` until the binding is found or `up` is `null`.

The method `down` enters a new `Frame` with the current one being its `up`.
*/

{
  class Frame {
    constructor(up = null) {
      this.up = up;
      this.binds = new Map();
    }

    bind(name, value) {
      this.binds.set(name, value);
      return this;
    }

    find(name) {
      const v = this.binds.get(name);
      if (v === undefined && this.up !== null) {
        return this.up.find(name);
      } else {
        return v;
      }
    }

    down() {
      return new Frame(this);
    }
  }

  test("nested scopes implementation", () => {
    const env = new Frame().bind("a", 10).bind("b", 20).down().bind("b", 30);
    expect(env.find("a")).toBe(10);
    expect(env.find("b")).toBe(30);
  });
}

/*
But binding lookup stops for a second reason other than `up` being `null`,
let's see it with an example:
*/

{
  function f1() {
    let a = 10;
    let b = 30;
    f2();
  }

  function f2() {
    console.log(a, b);
  }

  test("call frames", () => {
    expect(f1).toThrow();
  });
}

/*
`a` and `b` aren't available in `f2` even if it was called from `f1` where they
were defined, this is because binding lookup stops at call Frames.

We can implement this by adding a marker attribute `upLimit` that makes the
lookup stop:
*/

{
  class Frame {
    constructor(up = null) {
      this.up = up;
      this.upLimit = false;
      this.binds = new Map();
    }
    bind(name, value) {
      this.binds.set(name, value);
      return this;
    }
    find(name) {
      const v = this.binds.get(name);
      if (v === undefined) {
        if (this.upLimit || this.up === null) {
          return v;
        } else {
          return this.up.find(name);
        }
      } else {
        return v;
      }
    }
    down() {
      return new Frame(this.left, this);
    }
    setUpLimit() {
      this.upLimit = true;
      return this;
    }
  }

  test("call frames implementations", () => {
    const env = new Frame()
      .bind("a", 10)
      .bind("b", 20)
      .down()
      .setUpLimit()
      .bind("b", 30);

    expect(env.find("a")).toBe(undefined);
    expect(env.find("b")).toBe(30);
  });
}

/*
But even when binding lookup stops at the call frame boundary there are two
simple examples showing that the lookup continues "somewhere":
*/

{
  let a = 10;

  function f() {
    return a;
  }

  test("top level and prelude bindings", () => {
    expect(f()).toBe(10);
    expect(parseInt("42", 10)).toBe(42);
  });
}

/*
In the first case after stopping at the call frame it "continues" the lookup
with bindings available at the top level/module scope.

It the second case it finds a value that is not bound in our program (`parseInt`).

This is one of the bindings that are available everywhere without the need to include them,
in JavaScript you can call it the `window` object, in other languages it is described as a set of bindings that are automatically imported on every module or prelude for short.

If the "look **up**" stops at the call frame then after reaching that point it has
to go somewhere else, module and "prelude" bindings are bound "before" the bindings in the call stack. In many cultures the past is to the left, so let's continue there.

Let's add a `left` attribute to our `Frame` class and make it work in a similar
way to `up`, start the lookup in the current `Frame` and continue `up` until `upLimit`,
then continue `left` until `leftLimit` or until `left` is `null`.

The `right` method is similar to the `down` method but it returns a new `Frame` instance that has the current frame as its left and up set to `null`.

We redefine `down` to return a new `Frame` instance where `left` is the same as the `left` of the current frame and `up` is the current frame itself.
*/

{
  class Frame {
    constructor(left = null, up = null) {
      this.up = up;
      this.left = left;
      this.upLimit = false;
      this.leftLimit = false;
      this.binds = new Map();
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
          } else {
            return this.left.find(name);
          }
        } else {
          return this.up.find(name);
        }
      } else {
        return v;
      }
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

  {
    test("prelude implementation", () => {
      const env = new Frame()
        .bind("parseInt", parseInt)
        .right()
        .bind("a", 10)
        .right()
        .down()
        .setUpLimit();

      expect(env.find("parseInt")("42", 10)).toBe(42);
      expect(env.find("a")).toBe(10);
    });
  }
}
/*
Another thing in object oriented languages that is about looking up bindings
is "message dispatch", let's see some examples.

If we define an empty class `A` in JavaScript it "inherits by default" the
methods from the `Object` class:
*/

{
  class A {}

  test("Object default inheritance", () => {
    expect(new A().toString()).toBe("[object Object]");
  });
}

/*
We can emulate the lookup of `toString` with the `Frame` class we have:
*/

{
  test("Object default inheritance implementation", () => {
    const a = new Frame().bind("toString", () => "[object Object]").right();
    expect(a.find("toString")()).toBe("[object Object]");
  });
}

/*
We can define a class `B` that defines its own `toString` method:
*/

class B {
  toString() {
    return "B!";
  }
}

test("method", () => {
  expect(new B().toString()).toBe("B!");
});

/*
We can again emulate it with the `Frame` class:
*/

test("method implementation", () => {
  const b = new Frame()
    .bind("toString", () => "[object Object]")
    .right()
    .bind("toString", () => "B!");
  expect(b.find("toString")()).toBe("B!");
});

/*
A more complicated `prototype` chain
*/

class C extends B {
  toString() {
    return "C!";
  }
}

test("method override", () => {
  expect(new C().toString()).toBe("C!");
});

test("method override implementation", () => {
  const c = new Frame()
    .bind("toString", () => "[object Object]")
    .right()
    .bind("toString", () => "B!")
    .down()
    .bind("toString", () => "C!");
  expect(c.find("toString")()).toBe("C!");
});

/*
A class can have instance attributes, each instance binds it's own attributes
but looks up methods in the prototype chain:
*/

class D extends C {
  constructor(count) {
    super();
    this.count = count;
  }
}

test("instance attributes", () => {
  const d1 = new D(10);
  const d2 = new D(20);
  expect(d1.toString()).toBe("C!");
  expect(d1.count).toBe(10);
  expect(d2.toString()).toBe("C!");
  expect(d2.count).toBe(20);
});

/*
We can emulate this by having the prototype chain "to the left" and the instance
attributes in its own scope.
*/

test("method override implementation", () => {
  const D = new Frame()
    .bind("toString", () => "[object Object]")
    .right()
    .bind("toString", () => "B!")
    .down()
    .bind("toString", () => "C!")
    .down();
  const d1 = D.down().bind("count", 10);
  const d2 = D.down().bind("count", 20);

  expect(d1.find("toString")()).toBe("C!");
  expect(d1.find("count")).toBe(10);
  expect(d2.find("toString")()).toBe("C!");
  expect(d2.find("count")).toBe(20);
});

/*
But manipulating the frame directly doesn't look like a programming language,
if we wanted to create a really simple language on top we should be able to
at least bind and lookup names and do some operations on those values, like
arithmetic operations.

This is the point where most articles would create a small lisp or forth interpreter, but
the initial motivation for thos one was to find a small object oriented language that
could be grown and expressed from a small set of primitives.

We are going to start with numbers, specifically integers, let's use JavaScript `BigInt`s for that.

To express a variable we can define a `Name` class that holds the name of the
variable to lookup as its `value` attribte:
*/

{
  class Name {
    constructor(value) {
      this.value = value;
    }

    getType() {
      return "Name";
    }
  }

  /*
  The OOP way to eval a `Name` would be to send it a message, like `eval`.
  For that we need a `Msg` class that hold the `eval` as the `verb` and following
  the vocabulary of message, name and verb, the message is sent to the subject and
  holds an `object`, in case of `eval` the object is the current scope:

  > Some verbs (called transitive verbs) take direct objects; some also take indirect objects. A direct object names the person or thing directly affected by the action of an active sentence. An indirect object names the entity indirectly affected
  > -- https://en.wikipedia.org/wiki/Traditional_grammar
  */

  class Msg {
    constructor(verb, obj) {
      this.verb = verb;
      this.obj = obj;
    }

    getType() {
      return "Msg";
    }
  }

  /*
  Let's redefine Frame with just to extra methods:

  - eval(v): sends the message `eval` to `v` and return the result
  - send(s, m): sends the message `m` to the subject `s`
  */

  class Frame {
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
    send(s, m) {
      return this.find(s.getType()).find(m.verb).call(null, s, m, this);
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
          } else {
            return this.left.find(name);
          }
        } else {
          return this.up.find(name);
        }
      } else {
        return v;
      }
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

  /*
  The implementation of `send` gets the type of the subject, looks up the type in
  the environment, the result should be a `Frame` instance with the "prototype" of
  the type and then it does a lookup for the `Msg` verb in the prototype and
  calls the handler passing the subject, the message and the environment as arguments.
  */

  /*
  We can try it by:

  - Creating an instance of `Name` for the name "a"
  - Creating a `Frame` that works as the prototype of `Name` that holds a binding
    for `eval` that when called does a lookup for the variable name in the environment
  - Creating a `Frame` for the call stack, binding "a" to `42`, `nameEnv` to the type of `Name` (returned by `a.getType()`)
  - Evaluating `a` in `env` and checking that it returns `42`
  */

  test("Name resolution with eval message", () => {
    const a = new Name("a");
    const nameEnv = new Frame().bind("eval", (s, _m, e) => e.find(s.value));
    const env = new Frame().bind("a", 42).bind(a.getType(), nameEnv);
    expect(env.eval(a)).toBe(42);
  });

  /*
  With this we have a language that supports bindings but still no 
  "first class message sends".

  Let's fix this by defining a `Send` class that holds a subject and a message as
  attributes:
  */

  class Send {
    constructor(subj, msg) {
      this.subj = subj;
      this.msg = msg;
    }

    getType() {
      return "Send";
    }
  }

  /*
  Since we are going to be using `BigInt`s as our language Ints we are going
  to monkey patch `BigInt`'s prototype with the `getType` methods so we can
  lookup handlers for `Int`s in our language:
  */

  BigInt.prototype.getType = () => "Int";

  /*
  Note: in the real implementation we use `Symbol`s to avoid monkey patching.
  */

  /*
  We can now implement message sends in our language by defining eval for:

  - Name: does a lookup for the name in the environment
  - BigInt: returns itself
  - Msg: returns a new Msg instance where the verb is the same but `obj` is evaluated
  - Send:
    - evaluates subject and message
    - enters a call frame
    - binds `it` to the subject
      - I use `it` instead of `this` to differenciate from `this` and `self` in other OOP languages
    - binds ,`msg` to the message
    - binds `that` for the message's `obj`ect and
    - sends the evaluated `msg` to the evaluated `subj`ect

    To have some message to send we also define a handler for the `+` message for Ints
    which does a lookup for `it` and adds it to the value bound to `that`. There's
    an alternative implementation commented that directly uses `s` and `m.obj` that contain the same values.

    Finally we test it by building an object that represents the expression `10 + a`
    and check that it results in `42n` since `a` was bounds to `32n` in the environment.
  */
  test("Msg Send eval", () => {
    const a = new Name("a");
    const nameEnv = new Frame().bind("eval", (s, _m, e) => e.find(s.value));
    const intEnv = new Frame()
      .bind("eval", (s, _m, _e) => s)
      .bind("+", (_s, _m, e) => e.find("it") + e.find("that"));
    //.bind("+", (s, m, _e) => s + m.obj);
    const msgEnv = new Frame().bind(
      "eval",
      (s, _m, e) => new Msg(s.verb, e.eval(s.obj)),
    );
    const sendEnv = new Frame().bind("eval", (s, _m, e) => {
      const subj = e.eval(s.subj),
        msg = e.eval(s.msg);
      return e
        .down()
        .setUpLimit()
        .bind("it", subj)
        .bind("msg", msg)
        .bind("that", msg.obj)
        .send(subj, msg);
    });
    const env = new Frame()
      .bind("Name", nameEnv)
      .bind("Int", intEnv)
      .bind("Msg", msgEnv)
      .bind("Send", sendEnv)
      .right()
      .bind("a", 32n);
    // 10 + a
    expect(env.eval(new Send(10n, new Msg("+", new Name("a"))))).toBe(42n);
  });
}

import * as ohm from "./node_modules/ohm-js/index.mjs";

function mkLang(g, s) {
  const grammar = ohm.grammar(g),
    semantics = grammar.createSemantics().addOperation("toAst", s),
    parse = (code) => {
      const matchResult = grammar.match(code);
      if (matchResult.failed()) {
        console.warn("parse failed", matchResult.message);
        return null;
      }
      return semantics(matchResult).toAst();
    },
    run = (code, e) => {
      const ast = parse(code);
      return ast ? e.eval(ast) : null;
    };

  return { run, parse };
}

class Base {
  call(s, m, e) {
    return e.eval(this);
  }
}

class Name extends Base {
  constructor(value) {
    super();
    this.value = value;
  }
}

class Msg extends Base {
  constructor(verb, obj) {
    super();
    this.verb = verb;
    this.obj = obj;
  }
}

class Send extends Base {
  constructor(subj, msg) {
    super();
    this.subj = subj;
    this.msg = msg;
  }
}

const typeSym = Symbol("TypeSym"),
  getType = (v) => v[typeSym],
  setType = (Cls, type) => ((Cls.prototype[typeSym] = type), type),
  mkType = (name, Cls) => setType(Cls, Symbol(name));

const TYPE_NAME = mkType("Name", Name),
  TYPE_MSG = mkType("Msg", Msg),
  TYPE_SEND = mkType("Send", Send),
  TYPE_INT = mkType("Int", BigInt);

class Frame {
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
  send(s, m) {
    return this.find(getType(s)).find(m.verb).call(null, s, m, this);
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
        } else {
          return this.left.find(name);
        }
      } else {
        return this.up.find(name);
      }
    } else {
      return v;
    }
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

const { run: run1 } = mkLang(
  `Lang {
    Main = Send
    name = (letter | "_") (letter | "_" | digit)*
    Msg = verb Value
    verb = verbStart verbPart*
    verbStart = "+" | "-" | "*" | "/" | "-" | "%" | "&" | "<" | ">" | "!" | "?" | "." | letter
    verbPart = verbStart | digit
    Send = Value Msg*
    Value = int | name
    int = digit+
  }`,
  {
    name(_1, _2) {
      return new Name(this.sourceString);
    },
    Msg: (verb, obj) => new Msg(verb.toAst(), obj.toAst()),
    verb(_1, _2) {
      return this.sourceString;
    },
    Send(v, msgs) {
      let r = v.toAst();
      for (const msg of msgs.children) {
        r = new Send(r, msg.toAst());
      }
      return r;
    },
    int(_) {
      return BigInt(this.sourceString);
    },
  },
);

function mkProto(obj) {
  const frame = new Frame();

  for (const name in obj) {
    frame.bind(name, obj[name]);
  }

  return frame;
}

function mkEnv1() {
  return new Frame()
    .bind(TYPE_NAME, mkProto({ eval: (s, _m, e) => e.find(s.value) }))
    .bind(
      TYPE_INT,
      mkProto({
        eval: (s, _m, _e) => s,
        "+": (_s, _m, e) => e.find("it") + e.find("that"),
      }),
    )
    .bind(
      TYPE_MSG,
      mkProto({ eval: (s, _m, e) => new Msg(s.verb, e.eval(s.obj)) }),
    )
    .bind(
      TYPE_SEND,
      mkProto({
        eval(s, _m, e) {
          const subj = e.eval(s.subj),
            msg = e.eval(s.msg);
          return e
            .down()
            .setUpLimit()
            .bind("it", subj)
            .bind("msg", msg)
            .bind("that", msg.obj)
            .send(subj, msg);
        },
      }),
    );
}

test("Msg Send eval with parser", () => {
  const env = mkEnv1().right().bind("a", 32n);
  expect(run1("10 + a + 4", env)).toBe(46n);
});

class Nil extends Base {}
const NIL = new Nil();
class Pair extends Base {
  constructor(a, b) {
    super();
    this.a = a;
    this.b = b;
  }
}

class Later extends Base {
  constructor(value) {
    super();
    this.value = value;
  }
}

const { run: run2 } = mkLang(
  `Lang {
    Main = Send
    nil = "(" ")"
    Pair = PairHead ":" Value
    PairHead = Scalar | Later | ParSend
    name = (letter | "_") (letter | "_" | digit)*
    Msg = verb Value
    verb = verbStart verbPart*
    verbStart = "+" | "-" | "*" | "/" | "-" | "%" | "&" | "<" | ">" | "!" | "?" | "." | letter
    verbPart = verbStart | digit
    Send = Value Msg*
    ParSend = "(" Send ")"
    Later = "@" Value
    Value = Pair | PairHead
    Scalar = int | nil | name
    int = digit+
  }`,
  {
    nil: (_o, _c) => NIL,
    Pair: (a, _, b) => new Pair(a.toAst(), b.toAst()),
    name(_1, _2) {
      return new Name(this.sourceString);
    },
    Msg: (verb, obj) => new Msg(verb.toAst(), obj.toAst()),
    verb(_1, _2) {
      return this.sourceString;
    },
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
  },
);

const TYPE_NIL = mkType("Nil", Nil),
  TYPE_PAIR = mkType("Pair", Pair),
  TYPE_LATER = mkType("Later", Later);

test("eager conditional", () => {
  const env = mkEnv1()
    .bind(
      TYPE_NIL,
      mkProto({ eval: (s, _m, e) => s, "?": (s, m, e) => m.obj.b }),
    )
    .bind(
      TYPE_PAIR,
      mkProto({ eval: (s, _m, e) => new Pair(e.eval(s.a), e.eval(s.b)) }),
    )
    .bind(
      TYPE_INT,
      mkProto({ eval: (s, _m, e) => s, "?": (s, m, e) => m.obj.a }),
    )
    .right();

  expect(run2("0 ? 1 : 2", env)).toBe(1n);
  expect(run2("() ? 1 : 2", env)).toBe(2n);
  expect(run2("() ? 1 : () ? 2 : 3", env)).toBe(3n);
  expect(() => run2("0 ? 1 : (1 * 2)", env)).toThrow();
});

test("lazy conditional", () => {
  const env = mkEnv1()
    .bind(TYPE_LATER, mkProto({ eval: (s, _m, e) => s.value }))
    .bind(
      TYPE_NIL,
      mkProto({ eval: (s, _m, e) => s, "?": (s, m, e) => e.eval(m.obj.b) }),
    )
    .bind(
      TYPE_PAIR,
      mkProto({ eval: (s, _m, e) => new Pair(e.eval(s.a), e.eval(s.b)) }),
    )
    .bind(
      TYPE_INT,
      mkProto({ eval: (s, _m, e) => s, "?": (s, m, e) => e.eval(m.obj.a) }),
    )
    .right();

  expect(run2("0 ? 1 : 2", env)).toBe(1n);
  expect(run2("() ? 1 : 2", env)).toBe(2n);
  expect(run2("() ? 1 : () ? 2 : 3", env)).toBe(3n);
  expect(run2("0 ? @ 1 : (1 * 2)", env)).toBe(1n);
});
