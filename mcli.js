#!/usr/bin/env bun
/*globals Bun*/
import {
  run,
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
  return `\\ ${this.verb} ${toStr(this.object)}`;
});
setToStr(Send, function () {
  return `${toStr(this.subject)} ${this.msg.verb} ${toStr(this.msg.object)}`;
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

function setDefToStr(Cls) {
  setToStr(Cls, Cls.prototype.toString);
}
setDefToStr(BigInt);
setDefToStr(Number);

function main(code = DEFAULT_CODE) {
  const log = () => {},
    //log = console.log.bind(console),
    e = new Env()
      .bindReply(ANY_TAG, "eval", (s, _o, _e, _m) => {
        log("eval any!", toStr(s));
        return s;
      })
      .bindReply(INT_TAG, "eval", (s, _o, _e, _m) => {
        log("eval int!", s);
        return s;
      })
      .bindReply(FLOAT_TAG, "eval", (s, _o, _e, _m) => {
        log("eval float!", s);
        return s;
      })
      .bindReply(STR_TAG, "eval", (s, _o, _e, _m) => {
        log("eval str!", s);
        return s;
      })
      .bindReply(NIL_TAG, "eval", (s, _o, _e, _m) => {
        log("eval nil!");
        return s;
      })
      .bindReply(NAME_TAG, "eval", (s, _o, e, _m) => {
        const v = e.find(s.value);
        log("eval name!", s.value, "->", toStr(v));
        return v;
      })
      .bindReply(PAIR_TAG, "eval", (s, _o, e, _m) => {
        log("eval pair!", toStr(s));
        return new Pair(e.eval(s.a), e.eval(s.b));
      })
      .bindReply(BLOCK_TAG, "eval", (s, _o, e, _m) => {
        log("eval block!", toStr(s));
        let r = NIL;
        for (const item of s.items) {
          r = e.eval(item);
        }
        return r;
      })
      .bindReply(ARRAY_TAG, "eval", (s, _o, e, _m) => {
        log("eval array!", toStr(s));
        return s.map((v, _i, _) => e.eval(v));
      })
      .bindReply(MAP_TAG, "eval", (s, _o, e, _m) => {
        log("eval map!", toStr(s));
        const r = new Map();
        for (const [k, v] of s.entries()) {
          r.set(e.eval(k), e.eval(v));
        }
        return r;
      })
      .bindReply(MSG_TAG, "eval", (s, _o, e, _m) => {
        log("eval msg!", toStr(s));
        return new Msg(s.verb, e.eval(s.object));
      })
      .bindReply(SEND_TAG, "eval", (s, _o, e, _m) => {
        log("eval send!", toStr(s));
        return e.sendMessage(s.subject, s.msg);
      })
      .bindReply(LATER_TAG, "eval", (s, _o, _e, _m) => {
        log("eval later!", toStr(s));
        return s.value;
      })
      .bindReply(INT_TAG, "+", (s, o) => s + o)
      .bindReply(STR_TAG, "+", (s, o) => s + o)
      .bindReply(STR_TAG, "*", (s, o) => {
        const r = new Array(o);
        for (let i = 0n; i < o; i++) {
          r[i] = s;
        }
        return r.join("");
      })
      .bindReply(MAP_TAG, ".", (s, o, _e, _m) => {
        return s.get(o) ?? NIL;
      })
      .bindReply(NIL_TAG, "?", (_s, o, e) => e.eval(o.b))
      .bindReply(ANY_TAG, "?", (_s, o, e) => e.eval(o.a))
      .bindReply(ANY_TAG, "send", (s, _o, e, m) => e.sendMessage(s, m.object))
      .bindReply(
        PAIR_TAG,
        "send",
        (s, _o, e, m) => new Pair(e.sendMessage(s.a, m), e.sendMessage(s.b, m)),
      )
      .bindReply(ARRAY_TAG, "send", (s, _o, e, m) =>
        // NOTE: if forwards send and not the message itself so its recursive
        s.map((v, _i, _) => e.sendMessage(v, m)),
      )
      .bindReply(NAME_TAG, "is", (s, o, e, _m) => {
        log("bind name!", s.value, o);
        e.parent.bind(s.value, o);
        return o;
      })
      .bindReply(SEND_TAG, "does", (s, o, e, _m) => {
        const tag = getTag(s.subject),
          verb = s.msg.verb;
        e.parent.bindReply(tag, verb, o);
        return o;
      });

  console.log("> ", code);
  console.log(toStr(run(code, e)));
}

for (const line of Bun.argv.slice(2)) {
  main(line);
}
