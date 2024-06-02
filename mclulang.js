function tag(name) {
  return Symbol(name);
}

export const evalSym = Symbol("eval"),
  tagSym = tag("Tag"),
  AtomTag = tag("Atom"),
  BlockTag = tag("Block"),
  ClauseTag = tag("Clause"),
  AltTag = tag("Alt"),
  NilTag = tag("Nil"),
  ASendTag = tag("ASend"),
  SendTag = tag("Send"),
  MsgTag = tag("Msg"),
  AnyTag = tag("Any"),
  IntTag = tag("Int"),
  StrTag = tag("Str");

export class Name {
  constructor(name) {
    this.name = name;
  }

  [evalSym](env) {
    return env.lookup(this.name);
  }

  eval(env) {
    return this[evalSym](env);
  }

  toSExpr() {
    return ["name", this.name];
  }
}

export class Atom {
  [tagSym] = AtomTag;

  constructor(name) {
    this.name = name;
  }

  [evalSym](_env) {
    return this;
  }

  eval(env) {
    return this[evalSym](env);
  }
  toSExpr() {
    return ["atom", this.name];
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

export class Msg {
  [tagSym] = MsgTag;

  constructor(verb, object) {
    this.verb = verb;
    this.object = object;
  }

  [evalSym](env) {
    return new Msg(this.verb, this.object[evalSym](env));
  }

  eval(env) {
    return this[evalSym](env);
  }
  toSExpr() {
    return ["msg", this.verb, this.object.toSExpr()];
  }
}

export class Send {
  [tagSym] = SendTag;

  constructor(subject, msg) {
    this.subject = subject;
    this.msg = msg;
  }

  [evalSym](env) {
    const subject = this.subject[evalSym](env),
      msg = this.msg[evalSym](env);

    return dispatchSend(subject, msg, env);
  }

  eval(env) {
    return this[evalSym](env);
  }
  toSExpr() {
    return ["send", this.subject.toSExpr(), this.msg.toSExpr()];
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

export class ASend {
  [tagSym] = ASendTag;

  constructor(subject, msg) {
    this.subject = subject;
    this.msg = msg;
  }

  [evalSym](env) {
    const subject = this.subject,
      { verb, object } = this.msg,
      handler = env.lookupHandler(getTag(subject), verb, getTag(object));

    if (handler === null) {
      console.warn("verb", verb, "not found for", subject, verb, object);
    }

    return handler[evalSym](
      env.enter().bind("it", subject).bind("that", object),
    );
  }

  eval(env) {
    return this[evalSym](env);
  }
  toSExpr() {
    return ["asend", this.subject.toSExpr(), this.msg.toSExpr()];
  }
}

export class NativeHandler {
  constructor(name, fn) {
    this.name = name;
    this.fn = fn;
  }

  [evalSym](env) {
    return this.fn(env.lookup("it"), env.lookup("that"), env);
  }

  eval(env) {
    return this[evalSym](env);
  }
}

class Nil {
  [tagSym] = NilTag;

  [evalSym](_env) {
    return this;
  }

  eval(env) {
    return this[evalSym](env);
  }
  toSExpr() {
    return ["nil"];
  }
}

export const NIL = new Nil();

export function isFalse(v) {
  return v === NIL;
}

export class Block {
  [tagSym] = BlockTag;

  constructor(items) {
    this.items = items;
  }

  [evalSym](env) {
    let r = NIL;
    for (const item of this.items) {
      r = item[evalSym](env);
    }
    return r;
  }

  eval(env) {
    return this[evalSym](env);
  }
  toSExpr() {
    return ["block", this.items.map((item) => item.toSExpr())];
  }
}

export class Clause {
  [tagSym] = ClauseTag;

  constructor(head, body) {
    this.head = head;
    this.body = body;
  }

  _eval(env) {
    const v = this.head[evalSym](env);
    if (isFalse(v)) {
      return null;
    } else {
      return this.body[evalSym](env);
    }
  }

  [evalSym](env) {
    return this._eval(env) ?? NIL;
  }

  eval(env) {
    return this[evalSym](env);
  }
  toSExpr() {
    return ["clause", this.head.toSExpr(), this.body.toSExpr()];
  }
}

export class Alt {
  [tagSym] = AltTag;

  constructor(items) {
    this.items = items;
  }

  [evalSym](env) {
    for (const item of this.items) {
      const v = item._eval(env);
      if (v !== null) {
        return v;
      }
    }
    return NIL;
  }

  eval(env) {
    return this[evalSym](env);
  }
  toSExpr() {
    return ["alt", this.items.map((item) => item.toSExpr())];
  }
}

export function rawHandlersToHandlers(o) {
  const r = {};
  for (const key in o) {
    r[key] = new NativeHandler(key, o[key]);
  }
  return r;
}

export function getTag(o) {
  return o[tagSym];
}

export function setTag(o, t) {
  o[tagSym] = t;
}

setTag(BigInt.prototype, IntTag);
setTag(String.prototype, StrTag);

BigInt.prototype[evalSym] = function (_env) {
  return this;
};
String.prototype[evalSym] = function (_env) {
  return this;
};
BigInt.prototype.toSExpr = function () {
  return this;
};
String.prototype.toSExpr = function () {
  return this;
};

export function name(v) {
  return new Name(v);
}
export function atom(v) {
  return new Atom(v);
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
export function asend(subject, msg) {
  return new ASend(subject, msg);
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
export function clause(head, body) {
  return new Clause(head, body);
}
export function alt(...clauses) {
  return new Alt(clauses);
}
export function nil() {
  return NIL;
}
