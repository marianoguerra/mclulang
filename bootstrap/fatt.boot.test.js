import { expect, test } from "bun:test";
import { runPrim } from "./fatt.boot.js";
import { NIL, getType, TYPE_FRAME, TYPE_STR } from "./fatter.js";

test("eval ()", () => {
  expect(runPrim("()")).toBe(NIL);
});
test("eval int", () => {
  expect(runPrim("42")).toBe(42n);
});
test("int <", () => {
  expect(runPrim("1 < 2")).toBe(1n);
  expect(runPrim("1 < 2 < 3")).toBe(1n);
  expect(runPrim("1 < 0")).toBe(NIL);
  expect(runPrim("1 < 2 < 0")).toBe(NIL);
});
test("int =", () => {
  expect(runPrim("2 = 2")).toBe(2n);
  expect(runPrim("1 = 2")).toBe(NIL);
  expect(runPrim("3 = 3 = 3")).toBe(3n);
});
test("eval float", () => {
  expect(runPrim("42.0")).toBe(42);
});
test("float <", () => {
  expect(runPrim("1.0 < 2.0")).toBe(1);
  expect(runPrim("1.0 < 0.0")).toBe(NIL);
});
test("float =", () => {
  expect(runPrim("2.0 = 2.0")).toBe(2);
  expect(runPrim("1.0 = 2.0")).toBe(NIL);
  expect(runPrim("3.0 = 3.0 = 3.0")).toBe(3);
});
test("eval str", () => {
  expect(runPrim('"hi"')).toBe("hi");
});
test("str <", () => {
  expect(runPrim('"a" < "b"')).toBe("a");
  expect(runPrim('"b" < "a"')).toBe(NIL);
});
test("str =", () => {
  expect(runPrim('"a" = "a"')).toBe("a");
  expect(runPrim('"a" = "b"')).toBe(NIL);
  expect(runPrim('"a" = "a" = "a"')).toBe("a");
});
test("eval later", () => {
  expect(runPrim("@(42)")).toBe(42n);
});
test("eval pair", () => {
  expect(runPrim("1 : 2").a).toBe(1n);
  expect(runPrim("1 : 2").b).toBe(2n);
});
test("eval msg", () => {
  expect(runPrim("\\ + 2").verb).toBe("+");
  expect(runPrim("\\ + 2").obj).toBe(2n);
});
test("eval block", () => {
  expect(runPrim("{1, 2}")).toBe(2n);
});
test("`e` evals to environment", () => {
  expect(getType(runPrim("e"))).toBe(TYPE_FRAME);
});
test("pair a & b", () => {
  expect(runPrim("1 : 2 a ()")).toBe(1n);
  expect(runPrim("1 : 2 b ()")).toBe(2n);
});
test("`e new-frame ()` creates a frame", () => {
  expect(getType(runPrim("e new-frame ()"))).toBe(TYPE_FRAME);
});
test('`e bind "a" : 42` binds', () => {
  expect(runPrim('{e bind "a" : 42, a}')).toBe(42n);
});
test('`e get-type "a"', () => {
  expect(runPrim('e get-type "a"')).toBe(TYPE_STR);
});

test("can define not for nil", () => {
  expect(runPrim("{e $reply (@(() not _) : 1), () not()}")).toBe(1n);
});
test("can define not for int, float, str", () => {
  expect(runPrim("{e $reply (@(1 not _) : ()), 0 not()}")).toBe(NIL);
  expect(runPrim("{e $reply (@(1.0 not _) : ()), 0.5 not()}")).toBe(NIL);
  expect(runPrim('{e $reply (@("" not _) : ()), "" not()}')).toBe(NIL);
});
test("can define or", () => {
  const code = `{
e $reply (@(() or _) : @(e eval-in that)),
e $reply (@(1 or _) : @(it)),

[() or 2, 3 or (), 4 or 5, () or ()]
  }`,
    [a, b, c, d] = runPrim(code);
  expect(a).toBe(2n);
  expect(b).toBe(3n);
  expect(c).toBe(4n);
  expect(d).toBe(NIL);
});
test("can define and", () => {
  const code = `{
e $reply (@(() and _) : ()),
e $reply (@(1 and _) : @(e eval-in that)),

[() and 2, 3 and (), 4 and 5]
  }`,
    [a, b, c] = runPrim(code);
  expect(a).toBe(NIL);
  expect(b).toBe(NIL);
  expect(c).toBe(5n);
});

test("can define ternary op", () => {
  const code = `{
e $reply (@(() ? _) : @(e eval-in (that b ()))),
e $reply (@(1 ? _) : @(e eval-in (that a ()))),

[() ? 1 : 2, 3 ? 4 : 5]
  }`,
    [a, b] = runPrim(code);
  expect(a).toBe(2n);
  expect(b).toBe(4n);
});

test("can define 1 >= 2 in terms of <", () => {
  const code = `{
e $reply (@(() ? _) : @(e eval-in (that b ()))),
e $reply (@(1 ? _) : @(e eval-in (that a ()))),

e $reply (@(1 >= _) : @(that < it ? it : ())),

[20 >= 10, 10 >= 20]
  }`;
  const [a, b] = runPrim(code);
  expect(a).toBe(20n);
  expect(b).toBe(NIL);
});

// const send = m.obj.a,
//   body = m.obj.b,
//   sub = send.subj,
//   subType = getType(sub),
//   subTypeProto = s.find(subType),
//   verb = send.msg.verb;

// subTypeProto.bind(verb, body);

test("can bare bootstrap $reply", () => {
  const code = `{
e bind "m" : @(1 add _) : @(it + that),
e bind "send" : (m a()),
e bind "sub" : (send subj()),
e bind "subType" : (e get-type sub),
e find subType
  bind ((send msg() verb()) : (m b())),

  1 add 20
  }`;
  expect(runPrim(code)).toBe(21n);
});

test("can bootstrap reply in terms of bind, eval-in, get-type and find", () => {
  const code = `{
e find (e get-type e)
  bind "reply" : @{
    e bind "send" : (msg obj() a()),
    e bind "sub" : (e eval-in (send subj())),
    e bind "subType" : (e get-type sub),
    e find subType
      bind ((send msg() verb()) : (msg obj() b())),
    ()
  },

e reply @(@a is _) : @(e up () bind (it name ()) : that),

e reply @(e reply _) : @{
  @send is (msg obj() a()),
  @sub is (e eval-in (send subj())),
  @subType is (e get-type sub),
  e find subType
    bind ((send msg() verb()) : (msg obj() b())),
  ()
},

e reply @(1 add _) : @(it + that),

  1 add 20
  }`;
  expect(runPrim("e get-type e")).toBe(TYPE_FRAME);
  expect(getType(runPrim("e find (e get-type e)"))).toBe(TYPE_FRAME);
  expect(runPrim('e find (e get-type e) bind "a" : 42 find "a"')).toBe(42n);
  expect(runPrim(code)).toBe(21n);
});
