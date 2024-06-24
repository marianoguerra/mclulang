import {
  Block,
  Pair,
  Msg,
  Later,
  Send,
  NIL,
  Frame,
  logError,
  getType,
  parse,
  runAst,
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
  TYPE_SYM,
} from "./fatter.js";

export function runPhases(code, phases, eachFn) {
  return runAstPhases(parse(code), phases, eachFn);
}

export function runAstPhases(ast, phases, eachFn) {
  let input = ast,
    output = null;

  for (const phase of phases) {
    try {
      const { e } = phase;
      output = runAst(input, e);
    } catch (err) {
      logError(err);
      break;
    }

    if (output === null) {
      console.error("bad result in phase, stopping");
      break;
    } else {
      eachFn(phase, input, output);
      input = output;
    }
  }

  return output;
}

function wrapInParIfMsg(v, s) {
  return v instanceof Send ? `(${s})` : s;
}

const toStrReplies = {
  [TYPE_NAME]: {
    toStr: (s) => s.value,
  },
  [TYPE_MSG]: {
    toStr: (s, _m, e) => `\\ ${s.verb} ${toStr(s.obj, e)}`,
  },
  [TYPE_SEND]: {
    toStr: (s, _m, e) =>
      `${toStr(s.subj, e)} ${s.msg.verb} ${wrapInParIfMsg(s.msg.obj, toStr(s.msg.obj, e))}`,
  },
  [TYPE_INT]: {
    toStr: (s) => s.toString(),
  },
  [TYPE_NIL]: {
    toStr: () => "()",
  },
  [TYPE_PAIR]: {
    toStr: (s, _m, e) =>
      `${wrapInParIfMsg(s.a, toStr(s.a, e))} : ${wrapInParIfMsg(s.b, toStr(s.b, e))}`,
  },
  [TYPE_LATER]: {
    toStr: (s, _m, e) => `@(${toStr(s.value, e)})`,
  },
  [TYPE_BLOCK]: {
    toStr: (s, _m, e) =>
      `{${s.value.map((item) => toStr(item, e)).join(", ")}}`,
  },
  [TYPE_FLOAT]: {
    toStr: (s) => JSON.stringify(s),
  },
  [TYPE_STR]: {
    toStr: (s) => JSON.stringify(s),
  },
  [TYPE_ARRAY]: {
    toStr: (s, _m, e) => `[${s.map((item) => toStr(item, e)).join(", ")}]`,
  },
  [TYPE_MAP]: {
    toStr: (s, _m, e) =>
      `#{${Array.from(s.entries())
        .map(([k, v], _i, _) => `${toStr(k, e)}: ${toStr(v, e)}`)
        .join(", ")}}`,
  },
  [TYPE_SYM]: {
    toStr: (s) => `(${JSON.stringify(s.description)} as-type ())`,
  },
};

export function mergeToStr(replies) {
  return mergeReplies(toStrReplies, replies);
}

const noOpEvalReplies = {
  [TYPE_NAME]: { eval: (s) => s },
  [TYPE_MSG]: { eval: (s) => s },
  [TYPE_SEND]: { eval: (s) => s },
  [TYPE_INT]: { eval: (s) => s },
  [TYPE_NIL]: { eval: (s) => s },
  [TYPE_PAIR]: { eval: (s) => s },
  [TYPE_LATER]: { eval: (s) => s },
  [TYPE_BLOCK]: { eval: (s) => s },
  [TYPE_FLOAT]: { eval: (s) => s },
  [TYPE_STR]: { eval: (s) => s },
  [TYPE_ARRAY]: { eval: (s) => s },
  [TYPE_MAP]: { eval: (s) => s },
  [TYPE_SYM]: { eval: (s) => s },
};

export function mergeNoOpEval(replies) {
  return mergeReplies(noOpEvalReplies, replies);
}

export function mergeReplies(toMerge, target) {
  for (const tag of Object.getOwnPropertySymbols(toMerge)) {
    target[tag] ??= {};
    const toMergeTag = toMerge[tag];
    for (const key in toMergeTag) {
      if (target[tag][key] === undefined) {
        target[tag][key] = toMergeTag[key];
      }
    }
  }

  return target;
}

export function bindReplies(replies, e = new Frame()) {
  for (const tag of Object.getOwnPropertySymbols(replies)) {
    const byTag = replies[tag],
      frame = new Frame();
    for (const verb in byTag) {
      frame.bind(verb, byTag[verb]);
    }
    e.bind(tag, frame);
  }
  return e;
}

export function toStr(v, e) {
  return e.send(v, new Msg("toStr", NIL));
}

export function fwd(s, m, e) {
  return e.eval(new Send(s, m));
}

export function bop(fn) {
  return (_s, _m, e) => fn(e.find("it"), e.find("that"));
}

export function compOp(fn) {
  return (_s, _m, e) => {
    const a = e.find("it"),
      b = e.find("that");
    return fn(a, b) ? a : NIL;
  };
}

export function ternary(_s, m, e) {
  return e.eval(m.obj.a);
}

const identReplies = {
  [TYPE_NAME]: { eval: (s) => s },
  [TYPE_INT]: { eval: (s) => s },
  [TYPE_NIL]: { eval: (s) => s },
  [TYPE_FLOAT]: { eval: (s) => s },
  [TYPE_STR]: { eval: (s) => s },
  [TYPE_SYM]: { eval: (s) => s },
  [TYPE_MSG]: { eval: (s, _m, e) => new Msg(s.verb, e.eval(s.obj)) },
  [TYPE_SEND]: { eval: (s, _m, e) => new Send(e.eval(s.subj), e.eval(s.msg)) },
  [TYPE_PAIR]: { eval: (s, _, e) => new Pair(e.eval(s.a), e.eval(s.b)) },
  [TYPE_LATER]: { eval: (s, _, e) => new Later(e.eval(s.value)) },
  [TYPE_BLOCK]: {
    eval: (s, _m, e) => new Block(s.value.map((item) => e.eval(item))),
  },
  [TYPE_ARRAY]: { eval: (s, _m, e) => s.value.map((item) => e.eval(item)) },
  [TYPE_MAP]: {
    eval: (s, _m, e) => {
      const r = new Map();
      for (const [k, v] of s.entries()) {
        r.set(e.eval(k), e.eval(v));
      }
      return r;
    },
  },
};

export function mergeIdent(replies) {
  return mergeReplies(identReplies, replies);
}

export function runPhase() {
  const or = (s, m, e) => (s === NIL ? e.eval(m.obj) : s),
    and = (s, m, e) => (s === NIL ? s : e.eval(m.obj));

  return bindReplies(
    mergeToStr({
      [TYPE_NAME]: {
        eval: (s, _m, e) => {
          const v = e.find(s.value);
          if (v !== undefined) {
            return v;
          } else {
            throw new Error("BindingNotFound", { cause: { s, e } });
          }
        },
        is(s, m, e) {
          e.up.bind(s.value, m.obj);
          return m.obj;
        },
      },
      [TYPE_MSG]: {
        eval: (s, _m, e) => new Msg(s.verb, e.eval(s.obj)),
      },
      [TYPE_SEND]: {
        eval(s, _m, e) {
          const subj = e.eval(s.subj),
            msg = e.eval(s.msg);
          return e
            .down()
            .setUpLimit()
            .bind("it", subj)
            .bind("msg", msg)
            .bind("that", msg.obj)
            .send(subj, msg);
        },
        replies(s, m, e) {
          const target = e.up.eval(s.subj),
            targetType = getType(target),
            msgVerb = s.msg.verb,
            impl = m.obj,
            proto = e.up.find(targetType);

          proto.bind(msgVerb, impl);
          return NIL;
        },
      },
      [TYPE_INT]: {
        eval: (s) => s,
        "+": bop((a, b) => a + b),
        "-": bop((a, b) => a - b),
        "*": bop((a, b) => a * b),
        "/": bop((a, b) => a / b),
        "=": compOp((a, b) => a === b),
        "!=": compOp((a, b) => a !== b),
        ">": compOp((a, b) => a > b),
        ">=": compOp((a, b) => a >= b),
        "<": compOp((a, b) => a < b),
        "<=": compOp((a, b) => a <= b),
        "?": ternary,
        and,
        or,
      },
      [TYPE_NIL]: {
        eval: (s) => s,
        "?": (_s, m, e) => e.eval(m.obj.b),
        and: (s) => s,
        or: (_s, m, e) => e.eval(m.obj),
        ">": () => NIL,
        ">=": () => NIL,
        "<": () => NIL,
        "<=": () => NIL,
      },
      [TYPE_PAIR]: {
        eval: (s, _m, e) => new Pair(e.eval(s.a), e.eval(s.b)),
        "?": ternary,
        and,
        or,
      },
      [TYPE_LATER]: {
        eval: (s) => s.value,
      },
      [TYPE_BLOCK]: {
        eval: (s, _m, e) => {
          let r = NIL;
          for (const item of s.value) {
            r = e.eval(item);
          }
          return r;
        },
        and,
        or,
      },
      [TYPE_FLOAT]: {
        eval: (s) => s,
        "+": bop((a, b) => a + b),
        "-": bop((a, b) => a - b),
        "*": bop((a, b) => a * b),
        "/": bop((a, b) => a / b),
        "=": compOp((a, b) => a === b),
        "!=": compOp((a, b) => a !== b),
        ">": compOp((a, b) => a > b),
        ">=": compOp((a, b) => a >= b),
        "<": compOp((a, b) => a < b),
        "<=": compOp((a, b) => a <= b),
        "?": ternary,
        and,
        or,
      },
      [TYPE_STR]: {
        eval: (s) => s,
        "+": bop((a, b) => a + b),
        "?": ternary,
        "as-type"(s, _m, e) {
          const type = Symbol(s);
          e.left.bind(
            type,
            new Frame().bind("eval", (s) => s),
          );
          return type;
        },
        and,
        or,
      },
      [TYPE_ARRAY]: {
        eval: (s, _m, e) => s.map((item) => e.eval(item)),
        "?": ternary,
        and,
        or,
      },
      [TYPE_MAP]: {
        eval: (s, _m, e) => {
          const r = new Map();
          for (const [k, v] of s.entries()) {
            r.set(e.eval(k), e.eval(v));
          }
          return r;
        },
        ".": (s, m, _e) => s.get(m.obj) ?? NIL,
        "?": ternary,
        and,
        or,
      },
      [TYPE_SYM]: {
        eval: (s) => s,
        "?": ternary,
      },
    }),
  );
}
