function tag(name) {
  return Symbol(name);
}

export const evalSym = Symbol("eval"),
  tagSym = tag("Tag"),
  AtomTag = tag("Atom"),
  QuoteTag = tag("Quote"),
  BlockTag = tag("Block"),
  NilTag = tag("Nil"),
  PairTag = tag("Pair"),
  SendTag = tag("Send"),
  MsgTag = tag("Msg"),
  AnyTag = tag("Any"),
  IntTag = tag("Int"),
  StrTag = tag("Str");

export function evalu(v, env) {
  return v[evalSym](env);
}

export class Base {
  [evalSym](env) {
    return this;
  }

  eval(env) {
    return this[evalSym](env);
  }
}

export class Name extends Base {
  constructor(name) {
    super();
    this.name = name;
  }

  [evalSym](env) {
    return env.lookup(this.name);
  }
}

export class Atom extends Base {
  [tagSym] = AtomTag;

  constructor(name) {
    super();
    this.name = name;
  }
}

export class Quote extends Base {
  [tagSym] = QuoteTag;

  constructor(value) {
    super();
    this.value = value;
  }

  [evalSym](_env) {
    return this.value;
  }
}

export class Pair extends Base {
  [tagSym] = PairTag;

  constructor(a, b) {
    super();
    this.a = a;
    this.b = b;
  }

  [evalSym](env) {
    return new Pair(this.a[evalSym](env), this.b[evalSym](env));
  }
}

export class Env {
  constructor(parent = null) {
    this.parent = parent;
    this.bindings = {};
    this.handlers = {};
  }

  bind(name, value) {
    this.bindings[name] = value;
    return this;
  }

  lookup(name) {
    const v = this.bindings[name];
    if (v !== undefined) {
      return v;
    } else if (this.parent !== null) {
      return this.parent.lookup(name);
    } else {
      return null;
    }
  }

  enter() {
    return new Env(this);
  }

  bindHandler(subjectTag, verb, objectTag, handler) {
    this.handlers[subjectTag] ??= {};
    this.handlers[subjectTag][objectTag] ??= {};
    this.handlers[subjectTag][objectTag][verb] = handler;
    return this;
  }

  bindHandlers(subjectTag, objectTag, handlers) {
    this.handlers[subjectTag] ??= {};
    this.handlers[subjectTag][objectTag] ??= {};
    Object.assign(this.handlers[subjectTag][objectTag], handlers);
    return this;
  }

  lookupHandler(subjectTag, verb, objectTag) {
    // XXX: a handler for T verb Any has more presedence than a more specific one
    // in parent env
    const v = this.handlers[subjectTag]?.[objectTag]?.[verb] ??
      this.handlers[subjectTag]?.[AnyTag]?.[verb] ??
      this.handlers[AnyTag]?.[objectTag]?.[verb] ??
      this.handlers[AnyTag]?.[AnyTag]?.[verb];

    if (v !== undefined) {
      return v;
    } else if (this.parent !== null) {
      return this.parent.lookupHandler(subjectTag, verb, objectTag);
    } else {
      return null;
    }
  }
}

export class Msg extends Base {
  [tagSym] = MsgTag;

  constructor(verb, object) {
    super();
    this.verb = verb;
    this.object = object;
  }

  [evalSym](env) {
    return new Msg(this.verb, this.object[evalSym](env));
  }
}

export class Send extends Base {
  [tagSym] = SendTag;

  constructor(subject, msg) {
    super();
    this.subject = subject;
    this.msg = msg;
  }

  [evalSym](env) {
    const subject = this.subject[evalSym](env),
      msg = this.msg[evalSym](env);

    return dispatchSend(subject, msg, env);
  }
}

export function dispatchSend(subject, msg, env) {
  const { verb, object } = msg,
    handler = env.lookupHandler(getTag(subject), verb, getTag(object));

  if (handler === null) {
    console.warn("verb", verb, "not found for", subject, verb, object);
  }

  return handler[evalSym](
    env.enter().bind("it", subject).bind("that", object),
  );
}

export class NativeHandler extends Base {
  constructor(name, fn) {
    super();
    this.name = name;
    this.fn = fn;
  }

  [evalSym](env) {
    return this.fn(env.lookup("it"), env.lookup("that"), env);
  }
}

class Nil extends Base {
  [tagSym] = NilTag;
}

export const NIL = new Nil();

export function isFalse(v) {
  return v === NIL;
}

export function isTrue(v) {
  return v !== NIL;
}

export class Block extends Base {
  [tagSym] = BlockTag;

  constructor(items) {
    super();
    this.items = items;
  }

  [evalSym](env) {
    let r = NIL;
    for (const item of this.items) {
      r = item[evalSym](env);
    }
    return r;
  }
}

export function getTag(o) {
  return o[tagSym];
}

export function setTag(o, t) {
  o[tagSym] = t;
}

setTag(BigInt.prototype, IntTag);
setTag(String.prototype, StrTag);

Object.assign(BigInt.prototype, {
  [evalSym](_env) {
    return this;
  },
  toSExpr() {
    return this;
  },
});

Object.assign(String.prototype, {
  [evalSym](_env) {
    return this;
  },
  toSExpr() {
    return this;
  },
});

export function rawHandlersToHandlers(o) {
  const r = {};
  for (const key in o) {
    r[key] = new NativeHandler(key, o[key]);
  }
  return r;
}

export function name(v) {
  return new Name(v);
}
export function atom(v) {
  return new Atom(v);
}
export function quote(v) {
  return new Quote(v);
}
export function env(v) {
  return new Env(v);
}
export function msg(verb, object) {
  return new Msg(verb, object);
}
export function send(subject, msg) {
  return new Send(subject, msg);
}
export function sends(subject, ...msgs) {
  let sub = subject;
  for (const msg of msgs) {
    sub = send(sub, msg);
  }
  return sub;
}
export function block(...items) {
  return new Block(items);
}
export function nil() {
  return NIL;
}

Name.prototype.toSExpr = function () {
  return ["name", this.name];
};
Atom.prototype.toSExpr = function () {
  return ["atom", this.name];
};
Pair.prototype.toSExpr = function () {
  return ["pair", this.a.toSExpr(), this.b.toSExpr()];
};
Msg.prototype.toSExpr = function () {
  return ["msg", this.verb, this.object.toSExpr()];
};
Send.prototype.toSExpr = function () {
  return ["send", this.subject.toSExpr(), this.msg.toSExpr()];
};
Nil.prototype.toSExpr = function () {
  return "nil";
};
Block.prototype.toSExpr = function () {
  return ["block", this.items.map((item) => item.toSExpr())];
};
Quote.prototype.toSExpr = function () {
  return ["@", this.value.toSExpr()];
};
