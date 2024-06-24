#!/usr/bin/env bun
/*globals Bun*/
import {
  Name,
  Pair,
  Msg,
  Send,
  Later,
  NIL,
  getType,
  TYPE_NAME,
  TYPE_MSG,
  TYPE_SEND,
  TYPE_INT,
  TYPE_NIL,
  TYPE_PAIR,
  TYPE_LATER,
  TYPE_BLOCK,
  TYPE_FLOAT,
  TYPE_STR,
  TYPE_ARRAY,
  TYPE_MAP,
} from "./fatter.js";
import {
  bindReplies,
  mergeToStr,
  mergeIdent,
  runPhase,
  toStr,
  runPhases,
} from "./fatt.common.js";

function main(code) {
  console.log("> ", code);
  console.log("");

  const eToStr = bindReplies(mergeToStr({})).right();
  runPhases(
    code,
    [
      { name: "macro", e: macroPhase().right() },
      { name: "opt", e: optPhase().right() },
      { name: "run", e: runPhase().right() },
    ],
    ({ name }, input, output) => {
      console.log("#  ", name);
      console.log("in ", toStr(input, eToStr));
      console.log("out", toStr(output, eToStr));
      console.log("");
    },
  );
}

function maybeUnwrapLater(v) {
  return v instanceof Later ? v.value : v;
}

function pairToLaterOrLaterPair(v) {
  if (v instanceof Pair) {
    return new Later(v);
  } else if (v instanceof Later) {
    if (v.value instanceof Pair) {
      return v;
    } else {
      console.error(
        "Expected pair or later of pair, got later of",
        getType(v.value),
        "fixing",
      );
      return new Later(new Pair(v.value, NIL));
    }
  } else {
    console.error("Expected pair or later of pair, got", getType(v), "fixing");
    return new Later(new Pair(v, NIL));
  }
}

function isConstantExpr(v) {
  switch (getType(v)) {
    case TYPE_INT:
    case TYPE_FLOAT:
    case TYPE_STR:
    case TYPE_NIL:
      return true;
    default:
      return false;
  }
}

function optPhase() {
  function cBinOp(fn) {
    return (s, m) => {
      if (typeof m.obj === typeof s) {
        return fn(s, m.obj);
      } else {
        return new Send(s, m);
      }
    };
  }

  function cCompOp(fn) {
    return (s, m) => {
      if (typeof m.obj === typeof s) {
        return fn(s, m.obj) ? s : NIL;
      } else {
        return new Send(s, m);
      }
    };
  }

  function ternaryTrue(_s, m, _e) {
    const body = m.obj;

    if (body instanceof Pair) {
      return body.a;
    } else if (body instanceof Later) {
      return body.value.a;
    } else {
      console.error(
        "body of ternary that evaluates to true is not a pair, returning value",
      );
      return body;
    }
  }

  function ternaryFalse(_s, m, _e) {
    const body = m.obj;

    if (body instanceof Pair) {
      return body.b;
    } else if (body instanceof Later) {
      return body.value.b;
    } else {
      console.error(
        "body of ternary that evaluates to false is not a pair, returning value",
      );
      return body;
    }
  }

  function trueAnd(_s, m, _e) {
    return maybeUnwrapLater(m.obj);
  }

  function trueOr(s) {
    return s;
  }

  return bindReplies(
    mergeIdent({
      [TYPE_SEND]: {
        eval: (s, _m, e) => {
          const subj = e.eval(s.subj),
            msg = e.eval(s.msg);
          if (e.getSendHandler(subj, msg)) {
            return e.send(subj, msg);
          } else {
            return new Send(subj, msg);
          }
        },
      },
      [TYPE_NIL]: {
        "?": ternaryFalse,
        ">": () => NIL,
        ">=": () => NIL,
        "<": () => NIL,
        "<=": () => NIL,
        and: () => NIL,
        or: (_s, m) => m.obj,
      },
      [TYPE_INT]: {
        "?": ternaryTrue,
        "+": cBinOp((a, b) => a + b),
        "-": cBinOp((a, b) => a - b),
        "*": cBinOp((a, b) => a * b),
        "/": cBinOp((a, b) => a / b),
        "=": cCompOp((a, b) => a === b),
        "!=": cCompOp((a, b) => a !== b),
        ">": cCompOp((a, b) => a > b),
        ">=": cCompOp((a, b) => a >= b),
        "<": cCompOp((a, b) => a < b),
        "<=": cCompOp((a, b) => a <= b),
        and: trueAnd,
        or: trueOr,
      },
      [TYPE_FLOAT]: {
        "?": ternaryTrue,
        "+": cBinOp((a, b) => a + b),
        "-": cBinOp((a, b) => a - b),
        "*": cBinOp((a, b) => a * b),
        "/": cBinOp((a, b) => a / b),
        "=": cCompOp((a, b) => a === b),
        "!=": cCompOp((a, b) => a !== b),
        ">": cCompOp((a, b) => a > b),
        ">=": cCompOp((a, b) => a >= b),
        "<": cCompOp((a, b) => a < b),
        "<=": cCompOp((a, b) => a <= b),
        and: trueAnd,
        or: trueOr,
      },
      [TYPE_STR]: {
        "?": ternaryTrue,
        "+": cBinOp((a, b) => a + b),
        and: trueAnd,
        or: trueOr,
      },
      [TYPE_LATER]: {
        eval(s, _, e) {
          const v = e.eval(s.value);
          return isConstantExpr(v) ? v : new Later(v);
        },
      },
    }),
  );
}

function macroPhase() {
  const ternaryWrap = (s, m, _e) =>
    new Send(s, new Msg(m.verb, pairToLaterOrLaterPair(m.obj)));

  function maybeWrapLater(v) {
    return v instanceof Later ? v : new Later(v);
  }

  function lazyRhs(s, m, _e) {
    return new Send(s, new Msg(m.verb, maybeWrapLater(m.obj)));
  }

  const andWrap = lazyRhs,
    orWrap = lazyRhs;

  return bindReplies(
    mergeIdent({
      [TYPE_NAME]: {
        eval: (s) => s,
        is: (s, m, _e) => new Send(new Later(s), m),
        "?": ternaryWrap,
        and: andWrap,
        or: orWrap,
      },
      [TYPE_MSG]: {
        eval: (s, _m, e) => new Msg(s.verb, e.eval(s.obj)),
        "?": ternaryWrap,
        and: andWrap,
        or: orWrap,
      },
      [TYPE_SEND]: {
        eval: (s, _m, e) => {
          const subj = e.eval(s.subj),
            msg = e.eval(s.msg);
          if (e.getSendHandler(subj, msg)) {
            return e.send(subj, msg);
          } else {
            return new Send(subj, msg);
          }
        },
        // no need to eval here since we ewre called by send which evaluated
        replies: (s, m) =>
          new Send(new Later(s), new Msg(m.verb, new Later(m.obj))),
        "?": ternaryWrap,
        and: andWrap,
        or: orWrap,
      },
      [TYPE_INT]: { "?": ternaryWrap, and: andWrap, or: orWrap },
      [TYPE_NIL]: {
        "?": ternaryWrap,
        and: andWrap,
        or: orWrap,
      },
      [TYPE_PAIR]: { "?": ternaryWrap, and: andWrap, or: orWrap },
      [TYPE_LATER]: { "?": ternaryWrap, and: andWrap, or: orWrap },
      [TYPE_BLOCK]: { and: andWrap, or: orWrap },
      [TYPE_FLOAT]: { "?": ternaryWrap, and: andWrap, or: orWrap },
      [TYPE_STR]: { "?": ternaryWrap, and: andWrap, or: orWrap },
      [TYPE_ARRAY]: { "?": ternaryWrap, and: andWrap, or: orWrap },
      [TYPE_MAP]: { "?": ternaryWrap, and: andWrap, or: orWrap },
    }),
  );
}

for (const line of Bun.argv.slice(2)) {
  main(line);
}
