import * as ohm from "ohm-js";
import {
  alt,
  asend,
  atom,
  Block,
  clause,
  msg,
  name,
  nil,
  send,
} from "./mclulang.js";

const rawGrammar = `
  McLulang {
    Main = Exprs

    Exprs = Send ("," Send)*

    Value = identifier | QMsg | Clause | number | atom | Alt | Block | nil | ParSend

    Send = Value Msg*

    Msg = verb Value
    ParSend = "(" Send ")"

    QMsg = "\" Msg

    Clause = Value "=>" Value

    number = digit+

    identifier = identStart identPart*
    identStart = letter | "_"
    identPart = identStart | digit

    atom = ":" identifier

    verb = verbStart verbPart*
    verbStart = "$" | "+" | "-" | "*" | "/" | "-" | "%" | "&" | "!" | "?" | "." | letter
    verbPart = verbStart | digit

    nil = "()"

    Alt = "{" ("|" Clause)* "}"
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
  atom(_a, _b) {
    return atom(this.sourceString.slice(1));
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
  Msg(verb, object) {
    return msg(verb.ast(), object.ast());
  },
  Clause(head, _, body) {
    return clause(head.ast(), body.ast());
  },
  ParSend(_o, send, _c) {
    return send.ast();
  },
  Send(subject, iterMsg) {
    let r = subject.ast();
    for (let i = 0; i < iterMsg.numChildren; i++) {
      const msg = iterMsg.child(i);
      r = msg.sourceString.at(0) === "$"
        ? asend(r, msg.ast())
        : send(r, msg.ast());
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
  Alt(_l, _pipes, iter, _r) {
    return alt(iter.children.map((c) => c.ast()));
  },
});

export function compile(code) {
  const matchResult = grammar.match(code);
  const ast = semantics(matchResult).ast();
  return ast;
}
