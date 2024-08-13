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
test("strsize", () => {
  expect(runPrim('"" size()')).toBe(0n);
  expect(runPrim('"123" size()')).toBe(3n);
});
test("array item access", () => {
  expect(runPrim("[10, 20, 30] . 0")).toBe(10n);
  expect(runPrim("[10, 20, 30] . 1")).toBe(20n);
  expect(runPrim("[10, 20, 30] . 2")).toBe(30n);
  expect(runPrim("[10, 20, 30] . -1")).toBe(30n);
});
test("array size", () => {
  expect(runPrim("[10, 20, 30] size()")).toBe(3n);
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
  expect(runPrim('{e bind "a" : 42, \\ + a obj ()}')).toBe(42n);
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

test("full bootstrap", () => {
  const code = `{
e bindHandler [(e get-type e), "reply", @{
    e bindHandler [
        (e get-type (e eval-in (msg obj() a() subj()))),
        (msg obj() a() msg() verb()),
        (msg obj() b())
    ],
    ()
  }],
e reply @(@(subj verb obj) -> body) : @(e reply it : that),

@(@a is _) -> @(e up () bind (it name ()) : that),

@(()  not _) -> 1,
@(0   not _) -> (),
@(0.0 not _) -> (),
@(""  not _) -> (),

@(()  or _) -> @(e eval-in that),
@(0   or _) -> @it,
@(0.0 or _) -> @it,
@(""  or _) -> @it,

@(()  and _) -> (),
@(0   and _) -> @(e eval-in that),
@(0.0 and _) -> @(e eval-in that),
@(""  and _) -> @(e eval-in that),

@(()  ? _) -> @(e eval-in (that b ())),
@(0   ? _) -> @(e eval-in (that a ())),
@(0.0 ? _) -> @(e eval-in (that a ())),
@(""  ? _) -> @(e eval-in (that a ())),

@(()  != _) -> @(it = that not()),
@(0   != _) -> @(it = that not()),
@(0.0 != _) -> @(it = that not()),
@(""  != _) -> @(it = that not()),

@(()  >= _) -> @(that = it),
@(0   >= _) -> @((it = that) or (that < it) and it),
@(0.0 >= _) -> @((it = that) or (that < it) and it),
@(""  >= _) -> @((it = that) or (that < it) and it),

@(()  <= _) -> @(that = it),
@(0   <= _) -> @((it < that) or (it = that)),
@(0.0 <= _) -> @((it < that) or (it = that)),
@(""  <= _) -> @((it < that) or (it = that)),

@(()  > _) -> (),
@(0   > _) -> @((it <= that not()) and it),
@(0.0 > _) -> @((it <= that not()) and it),
@(""  > _) -> @((it <= that not()) and it),

@("" empty?()) -> @(it size () = 0),
@([] empty?()) -> @(it size () = 0),

[
  () not(), 1 not(), 1.0 not(), "" not(),

  () or 10, 10 or 11, 1.5 or 2, "" or 1,

  () and 1, 1 and 2, 2.5 and 3, "" and 4,

  ()  ? 1 : 2,
  1   ? 3 : 4,
  1.1 ? 5 : 6,
  "!" ? 7 : 8,

  () != (), 1 != 1, 1.1 != 1.1, "" != "",
  () != 0, 1 != 2, 1.1 != 1.2, "" != ".",

  () >= (), 1 >= 1, 1.1 >= 1.1, "a" >= "a",
  3 >= 2, 1.3 >= 1.2, "c" >= "b",
  1 >= 2, 1.1 >= 1.2, "a" >= "b",

  () <= (), 1 <= 1, 1.1 <= 1.1, "a" <= "a",
  3 <= 2, 1.3 <= 1.2, "c" <= "b",
  1 <= 2, 1.1 <= 1.2, "a" <= "b",

  () > (), 1 > 1, 1.1 > 1.1, "a" > "a",
  3 > 2, 1.3 > 1.2, "c" > "b",
  1 > 2, 1.1 > 1.2, "a" > "b",

  "" empty?(),
  [] empty?(),
  "1" empty?(),
  [1] empty?(),

  3 > 2 > 1,
  3 >= 2 >= 1
]
  }`;

  const [
    nilNot,
    intNot,
    floatNot,
    strNot,
    nilOr,
    intOr,
    floatOr,
    strOr,
    nilAnd,
    intAnd,
    floatAnd,
    strAnd,
    nilCond,
    intCond,
    floatCond,
    strCond,
    nilNeF,
    intNeF,
    floatNeF,
    strNeF,
    nilNeT,
    intNeT,
    floatNeT,
    strNeT,

    nilGeE,
    intGeE,
    floatGeE,
    strGeE,

    intGeG,
    floatGeG,
    strGeG,

    intGeL,
    floatGeL,
    strGeL,

    nilLeE,
    intLeE,
    floatLeE,
    strLeE,

    intLeG,
    floatLeG,
    strLeG,

    intLeL,
    floatLeL,
    strLeL,

    nilGtE,
    intGtE,
    floatGtE,
    strGtE,

    intGtG,
    floatGtG,
    strGtG,

    intGtL,
    floatGtL,
    strGtL,

    strEmpty,
    arrayEmpty,
    strNotEmpty,
    arrayNotEmpty,

    chainGt,
    chainGe,
  ] = runPrim(code, false);

  expect(nilNot).toBe(1n);
  expect(intNot).toBe(NIL);
  expect(floatNot).toBe(NIL);
  expect(strNot).toBe(NIL);

  expect(nilOr).toBe(10n);
  expect(intOr).toBe(10n);
  expect(floatOr).toBe(1.5);
  expect(strOr).toBe("");

  expect(nilAnd).toBe(NIL);
  expect(intAnd).toBe(2n);
  expect(floatAnd).toBe(3n);
  expect(strAnd).toBe(4n);

  expect(nilCond).toBe(2n);
  expect(intCond).toBe(3n);
  expect(floatCond).toBe(5n);
  expect(strCond).toBe(7n);

  expect(nilNeF).toBe(NIL);
  expect(intNeF).toBe(NIL);
  expect(floatNeF).toBe(NIL);
  expect(strNeF).toBe(NIL);

  expect(nilNeT).toBe(1n);
  expect(intNeT).toBe(1n);
  expect(floatNeT).toBe(1n);
  expect(strNeT).toBe(1n);

  expect(nilGeE).toBe(1n);
  expect(intGeE).toBe(1n);
  expect(floatGeE).toBe(1.1);
  expect(strGeE).toBe("a");

  expect(intGeG).toBe(3n);
  expect(floatGeG).toBe(1.3);
  expect(strGeG).toBe("c");

  expect(intGeL).toBe(NIL);
  expect(floatGeL).toBe(NIL);
  expect(strGeL).toBe(NIL);

  expect(nilLeE).toBe(1n);
  expect(intLeE).toBe(1n);
  expect(floatLeE).toBe(1.1);
  expect(strLeE).toBe("a");

  expect(intLeG).toBe(NIL);
  expect(floatLeG).toBe(NIL);
  expect(strLeG).toBe(NIL);

  expect(intLeL).toBe(1n);
  expect(floatLeL).toBe(1.1);
  expect(strLeL).toBe("a");

  expect(nilGtE).toBe(NIL);
  expect(intGtE).toBe(NIL);
  expect(floatGtE).toBe(NIL);
  expect(strGtE).toBe(NIL);

  expect(intGtG).toBe(3n);
  expect(floatGtG).toBe(1.3);
  expect(strGtG).toBe("c");

  expect(intGtL).toBe(NIL);
  expect(floatGtL).toBe(NIL);
  expect(strGtL).toBe(NIL);

  expect(strEmpty).toBe(0n);
  expect(arrayEmpty).toBe(0n);
  expect(strNotEmpty).toBe(NIL);
  expect(arrayNotEmpty).toBe(NIL);

  expect(chainGt).toBe(3n);
  expect(chainGe).toBe(3n);
});
