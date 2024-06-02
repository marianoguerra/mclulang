import { expect, test } from "bun:test";
import {
  AnyTag,
  asend,
  atom,
  AtomTag,
  block,
  dispatchSend,
  env,
  evalSym,
  evalu,
  getTag,
  IntTag,
  isTrue,
  msg,
  MsgTag,
  name,
  NIL,
  NilTag,
  rawHandlersToHandlers,
  send,
  sends,
  SendTag,
  StrTag,
} from "./mclulang.js";
import { compile } from "./parser.js";

test("lookup names", () => {
  expect(name("foo").eval(env().bind("foo", 42))).toBe(42);
});

test("IntTag", () => {
  expect(getTag(1n)).toBe(IntTag);
});

test("lookupHandler", () => {
  expect(
    env()
      .bindHandler(IntTag, "+", StrTag, "int + str")
      .lookupHandler(IntTag, "+", StrTag),
  ).toBe("int + str");
});

const intHandlers = rawHandlersToHandlers({
  "+"(a, b) {
    return a + b;
  },
  "-"(a, b) {
    return a - b;
  },
  "*"(a, b) {
    return a * b;
  },
  "/"(a, b) {
    return a * b;
  },
});

const strHandlers = rawHandlersToHandlers({
  "+"(a, b) {
    return a + b;
  },
});

const atomHandlers = rawHandlersToHandlers({
  is(atom, value, env) {
    // XXX: binds in parent
    env.parent.bind(atom.name, value);
    return value;
  },
});

const anyHandlers = rawHandlersToHandlers({
  map(subject, msg, env) {
    return dispatchSend(subject, msg, env);
  },
  "@then"(subject, pair, env) {
    const cond = evalu(subject, env);
    if (isTrue(cond)) {
      return evalu(pair.a, env);
    } else {
      return evalu(pair.b, env);
    }
  },
});

const sendHandlers = rawHandlersToHandlers({
  "@does"(msg, impl, env) {
    const subject = msg.subject[evalSym](env),
      object = msg.msg.object[evalSym](env),
      subjectTag = getTag(subject),
      objectTag = getTag(object);

    // XXX env.parent
    env.parent.bindHandler(subjectTag, msg.msg.verb, objectTag, impl);

    return impl;
  },
});

function prelude() {
  return env()
    .bindHandlers(SendTag, AnyTag, sendHandlers)
    .bindHandlers(AnyTag, AnyTag, anyHandlers)
    .bindHandlers(AtomTag, AnyTag, atomHandlers)
    .bindHandlers(IntTag, IntTag, intHandlers)
    .bindHandlers(StrTag, StrTag, strHandlers);
}

test("lookupHandler Any", () => {
  expect(
    env()
      .bindHandler(IntTag, "+", AnyTag, "int + any")
      .lookupHandler(IntTag, "+", StrTag),
  ).toBe("int + any");
});

test("prelude send", () => {
  expect(send(42n, msg("+", 10n)).eval(prelude())).toBe(52n);
});

test("prelude sends", () => {
  expect(sends(42n, msg("+", 10n), msg("-", 5n)).eval(prelude())).toBe(47n);
});

test("prelude bind", () => {
  const e = prelude();
  expect(send(atom("foo"), msg("is", 10n)).eval(e)).toBe(10n);
  expect(e.lookup("foo")).toBe(10n);
});

test("block", () => {
  expect(block(10n).eval(env())).toBe(10n);
  expect(block(10n, "hi").eval(env())).toBe("hi");
  expect(
    block(send(atom("foo"), msg("is", 10n)), name("foo")).eval(prelude()),
  ).toBe(10n);
});

test("def asend", () => {
  const e = prelude();
  // 0 add 0 @does 42
  expect(asend(send(0n, msg("add", 0n)), msg("@does", 42n)).eval(e)).toBe(42n);
  expect(send(10n, msg("add", 1n)).eval(e)).toBe(42n);
});

test("any map msg", () => {
  const e = prelude();
  expect(send(10n, msg("map", msg("+", 1n))).eval(e)).toBe(11n);
});

function getFirstAst(code, e = prelude()) {
  const ast = compile(code);
  return ast[0];
}

function run(code, e = prelude()) {
  const ast = getFirstAst(code, e);
  console.log(code, ast.toSExpr());
  return ast[evalSym](e);
}

test("compile", () => {
  expect(run("10")).toBe(10n);
  expect(run("10 + 2")).toBe(12n);
  expect(run("{10}")).toBe(10n);
  expect(run("{$a is 10, a}")).toBe(10n);
  expect(run("{0 add 0 @does (it + that), 1 add 9}")).toBe(10n);
  expect(run("{(0 add 0) @does (it + that), 1 add 9}")).toBe(10n);
  expect(run("1 @then 2 : 3 @then 4 : 5")).toBe(2n);
  expect(run("() @then 2 : 1 @then 4 : 5")).toBe(4n);
  expect(run("() @then 2 : () @then 4 : 5")).toBe(5n);
});
