#!/usr/bin/env bun
/*globals Bun*/
import {
  run,
  tagSym,
  NAME_TAG,
  INT_TAG,
  FLOAT_TAG,
  STR_TAG,
  NIL_TAG,
  ANY_TAG,
  SEND_TAG,
  PAIR_TAG,
  ARRAY_TAG,
  MAP_TAG,
  BLOCK_TAG,
  MSG_TAG,
  LATER_TAG,
  NIL,
  Env,
  Nil,
  Pair,
  Name,
  Block,
  Msg,
  Send,
  Later,
  getTag,
} from "./mclulang.js";

const DEFAULT_CODE = "{@(0 add 0) does @{it + that}, 1 add 3}",
  toStrSym = Symbol("toString");

function setToStr(Cls, fn) {
  Cls.prototype[toStrSym] = fn;
}
function toStr(v) {
  if (v[toStrSym]) {
    return v[toStrSym]();
  } else {
    return "???(" + v + ")";
  }
}
function toStrWrapSend(v) {
  return getTag(v) === SEND_TAG ? `(${toStr(v)})` : toStr(v);
}

setToStr(Name, function () {
  return this.value;
});
setToStr(Later, function () {
  return `@ ${toStrWrapSend(this.value)}`;
});
setToStr(Msg, function () {
  return `\\ ${this.verb} ${toStr(this.obj)}`;
});
setToStr(Send, function () {
  return `${toStr(this.subj)} ${this.msg.verb} ${toStr(this.msg.obj)}`;
});
setToStr(Nil, function () {
  return "()";
});
setToStr(Pair, function () {
  return `${toStr(this.a)} : ${toStr(this.b)}`;
});
setToStr(Array, function () {
  return `[${this.map((v, _i, _) => toStr(v)).join(", ")}]`;
});
setToStr(Map, function () {
  return `#{${Array.from(this.entries())
    .map(([k, v], _i, _) => `${toStr(k)}: ${toStr(v)}`)
    .join(", ")}}`;
});
setToStr(Block, function () {
  return `{${this.items.map((v, _i, _) => toStr(v)).join(", ")}}`;
});
setToStr(String, function () {
  return "'" + this + "'";
});
setToStr(Symbol, function () {
  return `#Tag "${this.description})"`;
});

function setDefToStr(Cls) {
  setToStr(Cls, Cls.prototype.toString);
}
setDefToStr(BigInt);
setDefToStr(Number);

function bindReplies(replies, e = new Env()) {
  for (const tag of Object.getOwnPropertySymbols(replies)) {
    const byTag = replies[tag];
    for (const verb in byTag) {
      e.bindReply(tag, verb, byTag[verb]);
    }
  }
  return e;
}

function main(code = DEFAULT_CODE) {
  const log = () => {},
    //log = console.log.bind(console),
    e = bindReplies({
      [ANY_TAG]: {
        eval: (s) => {
          log("eval any!", toStr(s));
          return s;
        },
        "?": (_s, o, e) => e.eval(o.a),
        send: (s, _o, e, m) => e.sendRawMsg(s, m.obj),
        "apply-tag": (s, o) => {
          if (typeof o === "symbol") {
            s[tagSym] = o;
          } else {
            console.warn("apply-tag: invalid tag", o);
          }
          return s;
        },
      },
      [NIL_TAG]: {
        eval: (s) => {
          log("eval nil!");
          return s;
        },
        "?": (_s, o, e) => e.eval(o.b),
      },
      [INT_TAG]: {
        eval: (s) => {
          log("eval int!", s);
          return s;
        },
        "+": (s, o) => s + o,
      },
      [FLOAT_TAG]: {
        eval: (s) => {
          log("eval float!", s);
          return s;
        },
      },
      [STR_TAG]: {
        eval: (s) => {
          log("eval str!", s);
          return s;
        },
        "as-tag": (s, _o) => Symbol(s),
        "+": (s, o) => s + o,
        "*": (s, o) => {
          const r = new Array(o);
          for (let i = 0n; i < o; i++) {
            r[i] = s;
          }
          return r.join("");
        },
      },
      [NAME_TAG]: {
        eval: (s, _o, e) => {
          const v = e.find(s.value);
          log("eval name!", s.value, "->", toStr(v));
          return v;
        },
        is: (s, o, e) => {
          log("bind name!", s.value, o);
          e.parent.bind(s.value, o);
          return o;
        },
      },
      [PAIR_TAG]: {
        eval: (s, _o, e) => {
          log("eval pair!", toStr(s));
          return new Pair(e.eval(s.a), e.eval(s.b));
        },
        send: (s, _o, e, m) =>
          new Pair(e.sendRawMsg(s.a, m), e.sendRawMsg(s.b, m)),
      },
      [BLOCK_TAG]: {
        eval: (s, _o, e) => {
          log("eval block!", toStr(s));
          let r = NIL;
          for (const item of s.items) {
            r = e.eval(item);
          }
          return r;
        },
      },
      [ARRAY_TAG]: {
        eval: (s, _o, e) => {
          log("eval array!", toStr(s));
          return s.map((v, _i, _) => e.eval(v));
        },
        send: (s, _o, e, m) =>
          // NOTE: if forwards send and not the message itself so its recursive
          s.map((v, _i, _) => e.sendRawMsg(v, m)),
      },
      [MAP_TAG]: {
        eval: (s, _o, e) => {
          log("eval map!", toStr(s));
          const r = new Map();
          for (const [k, v] of s.entries()) {
            r.set(e.eval(k), e.eval(v));
          }
          return r;
        },
        ".": (s, o) => {
          return s.get(o) ?? NIL;
        },
      },
      [MSG_TAG]: {
        eval: (s, _o, e) => {
          log("eval msg!", toStr(s));
          return new Msg(s.verb, e.eval(s.obj));
        },
      },
      [SEND_TAG]: {
        eval: (s, _o, e) => {
          log("eval send!", toStr(s));
          return e.sendMsg(s.subj, s.msg);
        },
        does: (s, o, e) => {
          const tag = getTag(e.eval(s.subj)),
            verb = s.msg.verb;
          e.parent.bindReply(tag, verb, o);
          return o;
        },
      },
      [LATER_TAG]: {
        eval: (s) => {
          log("eval later!", toStr(s));
          return s.value;
        },
      },
    });

  console.log("> ", code);
  console.log(toStr(run(code, e)));
}

for (const line of Bun.argv.slice(2)) {
  main(line);
}
