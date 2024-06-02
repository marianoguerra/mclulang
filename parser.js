import * as ohm from "ohm-js";
import { Block, msg, name, nil, Pair, Quote, send } from "./mclulang.js";

const rawGrammar = `
  McLulang {
    Main = Exprs

    Exprs = Send ("," Send)*

    Value = Pair | identifier | Quote | QMsg | number | Block | nil | ParSend

    Send = Value Msg*

    Msg = verb Value
    ParSend = "(" Send ")"

    QMsg = "\" Msg
    Quote = "@" Value

    Pair = Value ":" Send

    number = digit+

    identifier = identStart identPart*
    identStart = letter | "_"
    identPart = identStart | digit

    verb = verbStart verbPart*
    verbStart = "+" | "-" | "*" | "/" | "-" | "%" | "&" | "!" | "?" | "." | letter
    verbPart = verbStart | digit

    nil = "()"

    Block = "{" Exprs "}"
  }
`;

const grammar = ohm.grammar(rawGrammar);
const semantics = grammar.createSemantics();
semantics.addOperation("ast", {
  Main(exprs) {
    return exprs.ast();
  },
  Exprs(expr, _, iter) {
    return [expr.ast()].concat(iter.children.map((c) => c.ast()));
  },
  verb(_a, _b) {
    return this.sourceString;
  },
  nil(_) {
    return nil();
  },
  QMsg(_, msg) {
    return msg.ast();
  },
  Quote(_, v) {
    return new Quote(v.ast());
  },
  Msg(verb, object) {
    return msg(verb.ast(), object.ast());
  },
  ParSend(_o, send, _c) {
    return send.ast();
  },
  Pair(a, _, b) {
    return new Pair(a.ast(), b.ast());
  },
  Send(subject, iterMsg) {
    let r = subject.ast();
    for (let i = 0; i < iterMsg.numChildren; i++) {
      const msg = iterMsg.child(i);
      r = send(r, msg.ast());
    }

    return r;
  },
  identifier(_a, _b) {
    return name(this.sourceString);
  },
  number(_) {
    return BigInt(this.sourceString);
  },
  Block(_l, exprs, _r) {
    return new Block(exprs.ast());
  },
});

export function compile(code) {
  const matchResult = grammar.match(code);
  const ast = semantics(matchResult).ast();
  return ast;
}
