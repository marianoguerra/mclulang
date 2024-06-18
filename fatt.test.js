/* eslint-disable no-inner-declarations */
/* eslint-disable no-unused-vars */
import { expect, test } from "bun:test";

{
  let a = 10;
  let b = 20;
  console.log(a, b);
  // 10 20

  test("top level bindings", () => {
    expect(a).toBe(10);
    expect(b).toBe(20);
  });

  class Frame {
    constructor() {
      this.binds = new Map();
    }

    bind(name, value) {
      this.binds.set(name, value);
      return this;
    }

    find(name) {
      return this.binds.get(name);
    }
  }

  test("top level bindings implementation", () => {
    const env = new Frame().bind("a", 10).bind("b", 20);
    expect(env.find("a")).toBe(10);
    expect(env.find("b")).toBe(20);
  });
}

{
  let a = 10;
  let b = 20;
  {
    let b = 30;
    console.log(a, b);
    // 10 30

    test("nested scopes", () => {
      expect(a).toBe(10);
      expect(b).toBe(30);
    });
  }

  class Frame {
    constructor(up = null) {
      this.up = up;
      this.binds = new Map();
    }

    bind(name, value) {
      this.binds.set(name, value);
      return this;
    }

    find(name) {
      const v = this.binds.get(name);
      if (v === undefined && this.up !== null) {
        return this.up.find(name);
      } else {
        return v;
      }
    }

    down() {
      return new Frame(this);
    }
  }

  test("nested scopes implementation", () => {
    const env = new Frame().bind("a", 10).bind("b", 20).down().bind("b", 30);
    expect(env.find("a")).toBe(10);
    expect(env.find("b")).toBe(30);
  });
}

{
  test("prelude", () => {
    expect(parseInt("42", 10)).toBe(42);
  });

  class Frame {
    constructor(left = null, up = null) {
      this.left = left;
      this.up = up;
      this.binds = new Map();
    }

    bind(name, value) {
      this.binds.set(name, value);
      return this;
    }

    find(name, dval = null) {
      const v = this.binds.get(name);
      if (v === undefined) {
        if (this.up === null) {
          if (this.left === null) {
            return dval;
          } else {
            return this.left.find(name, dval);
          }
        } else {
          return this.up.find(name, dval);
        }
      } else {
        return v;
      }
    }

    down() {
      return new Frame(this.left, this);
    }

    right() {
      return new Frame(this, null);
    }
  }

  test("prelude implementation", () => {
    const env = new Frame().bind("parseInt", parseInt).right();
    expect(env.find("parseInt")("42", 10)).toBe(42);
  });
}

{
  let a = 10;
  let b = 20;

  function f1() {
    let b = 30;
    return [f2(), f3()];
  }

  function f2() {
    console.log("f2", a, b);
    // 10 20
    return [a, b];
  }

  function f3() {
    {
      let b = 40;
      console.log("f3", a, b);
      // 10 40
      return [a, b];
    }
  }

  test("call frames", () => {
    expect(f1()).toEqual([
      [10, 20],
      [10, 40],
    ]);
  });

  class Frame {
    constructor(left = null, up = null) {
      this.up = up;
      this.left = left;
      this.upLimit = false;
      this.leftLimit = false;
      this.binds = new Map();
    }
    bind(name, value) {
      this.binds.set(name, value);
      return this;
    }
    find(name, dval = null) {
      const v = this.binds.get(name);
      if (v === undefined) {
        if (this.upLimit || this.up === null) {
          if (this.leftLimit || this.left === null) {
            return dval;
          } else {
            return this.left.find(name, dval);
          }
        } else {
          return this.up.find(name, dval);
        }
      } else {
        return v;
      }
    }
    down() {
      return new Frame(this.left, this);
    }
    right() {
      return new Frame(this, null);
    }
    setUpLimit() {
      this.upLimit = true;
      return this;
    }
    setLeftLimit() {
      this.leftLimit = true;
      return this;
    }
  }

  test("call frames implementations", () => {
    const env = new Frame()
        .bind("a", 10)
        .bind("b", 20)
        .right()
        .setUpLimit()
        .bind("b", 30),
      envF2 = env.down().setUpLimit(),
      envF3 = env.down().setUpLimit().bind("b", 40);

    expect(envF2.find("a")).toBe(10);
    expect(envF2.find("b")).toBe(20);

    expect(envF3.find("a")).toBe(10);
    expect(envF3.find("b")).toBe(40);
  });

  class A {}

  test("Object default inheritance", () => {
    expect(new A().toString()).toBe("[object Object]");
  });

  test("Object default inheritance implementation", () => {
    const a = new Frame().bind("toString", () => "[object Object]").right();
    expect(a.find("toString")()).toBe("[object Object]");
  });

  class B {
    toString() {
      return "B!";
    }
  }

  test("method", () => {
    expect(new B().toString()).toBe("B!");
  });

  test("method implementation", () => {
    const b = new Frame()
      .bind("toString", () => "[object Object]")
      .right()
      .bind("toString", () => "B!");
    expect(b.find("toString")()).toBe("B!");
  });

  class C extends B {
    toString() {
      return "C!";
    }
  }

  test("method override", () => {
    expect(new C().toString()).toBe("C!");
  });

  test("method override implementation", () => {
    const c = new Frame()
      .bind("toString", () => "[object Object]")
      .right()
      .bind("toString", () => "B!")
      .down()
      .bind("toString", () => "C!");
    expect(c.find("toString")()).toBe("C!");
  });

  class D extends C {
    constructor(count) {
      super();
      this.count = count;
    }
  }

  test("instance attributes", () => {
    const d1 = new D(10);
    const d2 = new D(20);
    expect(d1.toString()).toBe("C!");
    expect(d1.count).toBe(10);
    expect(d2.toString()).toBe("C!");
    expect(d2.count).toBe(20);
  });

  test("method override implementation", () => {
    const D = new Frame()
      .bind("toString", () => "[object Object]")
      .right()
      .bind("toString", () => "B!")
      .down()
      .bind("toString", () => "C!")
      .down();
    const d1 = D.down().bind("count", 10);
    const d2 = D.down().bind("count", 20);

    expect(d1.find("toString")()).toBe("C!");
    expect(d1.find("count")).toBe(10);
    expect(d2.find("toString")()).toBe("C!");
    expect(d2.find("count")).toBe(20);
  });
}

{
  class Name {
    constructor(value) {
      this.value = value;
    }

    getType() {
      return "Name";
    }
  }

  class Msg {
    constructor(verb, obj) {
      this.verb = verb;
      this.obj = obj;
    }

    getType() {
      return "Msg";
    }
  }

  class Frame {
    constructor(left = null, up = null) {
      this.up = up;
      this.left = left;
      this.upLimit = false;
      this.leftLimit = false;
      this.binds = new Map();
    }
    bind(name, value) {
      this.binds.set(name, value);
      return this;
    }
    find(name, dval = null) {
      const v = this.binds.get(name);
      if (v === undefined) {
        if (this.upLimit || this.up === null) {
          if (this.leftLimit || this.left === null) {
            return dval;
          } else {
            return this.left.find(name, dval);
          }
        } else {
          return this.up.find(name, dval);
        }
      } else {
        return v;
      }
    }
    down() {
      return new Frame(this.left, this);
    }
    right() {
      return new Frame(this, null);
    }
    setUpLimit() {
      this.upLimit = true;
      return this;
    }
    setLeftLimit() {
      this.leftLimit = true;
      return this;
    }
    eval(v) {
      return this.send(v, new Msg("eval", this));
    }
    send(s, m) {
      return this.find(s.getType()).find(m.verb).call(null, s, m, this);
    }
  }

  // test("method override implementation", () => {
  //   const a = new Name("a");
  //   const env = new Frame().bind("a", 42);
  //   expect(env.eval(a)).toBe(42);
  // });

  test("Name resolution with eval message", () => {
    const a = new Name("a");
    const nameEnv = new Frame().bind("eval", (s, _m, e) => e.find(s.value));
    const env = new Frame().bind("a", 42).bind("Name", nameEnv);
    expect(env.eval(a)).toBe(42);
  });

  class Send {
    constructor(subj, msg) {
      this.subj = subj;
      this.msg = msg;
    }

    getType() {
      return "Send";
    }
  }

  BigInt.prototype.getType = () => "Int";

  test("Msg Send eval", () => {
    const a = new Name("a");
    const nameEnv = new Frame().bind("eval", (s, _m, e) => e.find(s.value));
    const intEnv = new Frame()
      .bind("eval", (s, _m, _e) => s)
      .bind("+", (_s, _m, e) => e.find("it") + e.find("that"));
    //.bind("+", (s, m, _e) => s + m.obj);
    const msgEnv = new Frame().bind(
      "eval",
      (s, _m, e) => new Msg(s.verb, e.eval(s.obj)),
    );
    const sendEnv = new Frame().bind("eval", (s, _m, e) => {
      const subj = e.eval(s.subj),
        msg = e.eval(s.msg);
      return e
        .down()
        .setUpLimit()
        .bind("it", subj)
        .bind("msg", msg)
        .bind("that", msg.obj)
        .send(subj, msg);
    });
    const env = new Frame()
      .bind("Name", nameEnv)
      .bind("Int", intEnv)
      .bind("Msg", msgEnv)
      .bind("Send", sendEnv)
      .right()
      .bind("a", 32n);
    // 10 + a
    expect(env.eval(new Send(10n, new Msg("+", new Name("a"))))).toBe(42n);
  });
}
