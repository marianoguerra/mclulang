import * as ohm from "../node_modules/ohm-js/index.mjs";

export function makeParser({
  mkStr,
  mkRawStr,
  mkBlock,
  mkArray,
  newInt,
  newFloat,
  newLater,
  newName,
  newPair,
  newMsg,
  newSend,
  mkNil,
}) {
  const grammar = ohm.grammar(`McLulang {
    Main = Send
    nil = "(" ")"
    Pair = PairHead ":" Value
    PairHead = Block | Array | Scalar | Later | ParSend
    name = (letter | "_" | "$") (letter | "_" | digit)*
    Block = "{" Exprs "}"
    Exprs = Send ("," Send )*
    Msg = verb Value
    MsgQuote = "\\\\" Msg
    verb = verbStart verbPart*
    verbStart = "=" | "+" | "-" | "*" | "/" | "$" | "%" | "&" | "<" | ">" | "!" | "?" | "." | letter
    verbPart = verbStart | digit
    Send = Value Msg*
    ParSend = "(" Send ")"
    Later = "@" (ParSend | Block | Array | name)
    Value = Pair | PairHead
    Scalar = float | int | str | nil | name | MsgQuote
    float = "-"? digit+ "." digit+
    int = "-"? digit+
    str = "\\\"" (~"\\\"" any)* "\\\""
    Array = "[" "]" -- empty
      | "[" Exprs "]" -- items
  }`),
    semantics = grammar.createSemantics().addOperation("toAst", {
      nil: (_o, _c) => mkNil(),
      Pair: (a, _, b) => newPair(a.toAst(), b.toAst()),
      name(_1, _2) {
        return newName(this.sourceString);
      },
      Block: (_o, exprs, _c) => mkBlock(exprs.toAst()),
      Exprs: (first, _, rest) =>
        [first.toAst()].concat(rest.children.map((v) => v.toAst())),
      Msg: (verb, obj) => newMsg(verb.toAst(), obj.toAst()),
      verb(_1, _2) {
        return mkRawStr(this.sourceString);
      },
      MsgQuote: (_, msg) => msg.toAst(),
      Send: (v, msgs) =>
        msgs.children.reduce(
          (acc, msg) => newSend(acc, msg.toAst()),
          v.toAst(),
        ),
      ParSend: (_o, v, _c) => v.toAst(),
      Later: (_, v) => newLater(v.toAst()),
      int(_s, _) {
        return newInt(BigInt(this.sourceString));
      },
      float(_s, _a, _d, _b) {
        return newFloat(parseFloat(this.sourceString));
      },
      str: (_1, s, _3) => mkStr(s.sourceString),
      Array_items: (_o, exprs, _c) => mkArray(exprs.toAst()),
      Array_empty: (_o, _c) => mkArray([]),
    }),
    parse = (code) => {
      const matchResult = grammar.match(code);
      if (matchResult.failed()) {
        console.warn("parse failed", matchResult.message);
        return null;
      }
      return semantics(matchResult).toAst();
    };

  return { grammar, semantics, parse };
}
