import sys

TYPE_NIL = "Nil"
TYPE_INT = "Int"
TYPE_FLOAT = "Float"
TYPE_STR = "Str"
TYPE_NAME = "Name"
TYPE_LATER = "Later"
TYPE_BLOCK = "Block"
TYPE_PAIR = "Pair"
TYPE_ARRAY = "Array"
TYPE_MAP = "Map"
TYPE_MSG = "Msg"
TYPE_SEND = "Send"
TYPE_FRAME = "Frame"

TYPE_HANDLER = "Handler"

class Type(object):
    def __init__(self, type):
        self.type = type

    def to_str(self):
        return self.type

    def handle(self, _s, _m, e):
        return e.eval(self)

    def is_int(self):
        return False

    def is_float(self):
        return False

    def is_str(self):
        return False

class Handler(Type):
    def __init__(self, fn):
        Type.__init__(self, TYPE_HANDLER)
        self.fn = fn

    def handle(self, s, m, e):
        return self.fn(s, m, e)

class Int(Type):
    def __init__(self, value):
        Type.__init__(self, TYPE_INT)
        self.ival = value

    def to_str(self):
        return str(self.ival)

    def is_int(self):
        return True

class Float(Type):
    def __init__(self, value):
        Type.__init__(self, TYPE_FLOAT)
        self.fval = value

    def to_str(self):
        return str(self.fval)

    def is_float(self):
        return True

class Str(Type):
    def __init__(self, value):
        Type.__init__(self, TYPE_STR)
        self.sval = value

    def to_str(self):
        return str(self.sval)

    def is_str(self):
        return True

class Name(Type):
    def __init__(self, name):
        Type.__init__(self, TYPE_NAME)
        self.name = name

    def to_str(self):
        return str(self.name)

class Later(Type):
    def __init__(self, value):
        Type.__init__(self, TYPE_LATER)
        self.lval = value

    def to_str(self):
        return "@(" + self.lval.to_str() + ")"

class Block(Type):
    def __init__(self, items):
        Type.__init__(self, TYPE_BLOCK)
        self.items = items

    def to_str(self):
        r = []
        for item in self.items:
            r.append(item.to_str())
        return "{" + ", ".join(r) + "}"

class Array(Type):
    def __init__(self, items):
        Type.__init__(self, TYPE_ARRAY)
        self.aitems = items

    def to_str(self):
        r = []
        for item in self.aitems:
            r.append(item.to_str())
        return "[" + ", ".join(r) + "]"

def quote_str(s):
    r = []

    for c in s:
        if c == '"' or c == "\\":
            r.append("\\")

        r.append(c)


    return '"' + "".join(r) + '"'

class Map(Type):
    def __init__(self, kv = {}):
        Type.__init__(self, TYPE_MAP)
        self.kv = kv

    def to_str(self):
        r = []

        for (k, v) in self.kv.iteritems():
            r.append(quote_str(k) + ": " + v.to_str())

        return "#{" + ", ".join(r) + "}"

class Pair(Type):
    def __init__(self, a, b):
        Type.__init__(self, TYPE_PAIR)
        self.a = a
        self.b = b

    def to_str(self):
        return self.a.to_str() + ":" + self.b.to_str()

class Nil(Type):
    def __init__(self):
        Type.__init__(self, TYPE_NIL)

    def to_str(self):
        return "()"

NIL = Nil()

class Msg(Type):
    def __init__(self, verb, obj):
        Type.__init__(self, TYPE_MSG)
        self.verb = verb
        self.obj = obj

    def to_str(self):
        return "\\ " + self.verb + " " + self.obj.to_str()

class Send(Type):
    def __init__(self, subj, msg):
        Type.__init__(self, TYPE_SEND)
        self.subj = subj
        self.msg = msg

    def to_str(self):
        return self.subj.to_str() + " " + self.msg.verb + " " + self.msg.obj.to_str()

class Frame(Type):
    def __init__(self, left = None, up = None):
        Type.__init__(self, TYPE_FRAME)
        self.up_limit = False
        self.up = up
        self.left_limit = False
        self.left = left
        self.binds = {}

    def bind(self, name, value):
        self.binds[name] = value
        return self

    def find(self, name):
        v = self.binds.get(name)

        if v is None:
            if self.up_limit or self.up is None:
                if self.left_limit or self.left is None:
                    return v
                else:
                    return self.left.find(name)
            else:
                return self.up.find(name)
        else:
            return v

    def down(self):
        return Frame(self.left, self)

    def right(self):
        return Frame(self, None)

    def set_up_limit(self):
        self.up_limit = True
        return self

    def set_left_limit(self):
        self.left_limit = True
        return self

    def eval(self, v):
        return self.send(v, Msg("eval", self))

    def get_send_handler(self, s, m):
        proto = self.find(s.type)

        if proto:
            print "proto found for " + s.type + " " + m.verb + " " + s.to_str()
            return proto.find(m.verb)
        else:
            print "proto not found for type", s.type, "verb", m.verb, "s", s.to_str()
            return None

    def send(self, s, m):
        handler = self.get_send_handler(s, m)

        if handler is not None:
            return handler.handle(s, m, self);
        else:
            print "handler not found for ", s.type, s.to_str(),  m.to_str()
            fail("HandlerNotFound: " + s.to_str())

def fail(msg):
    print "ERROR:", msg
    raise Error(msg)

def type_expected(expected, a, b):
    fail("Expected '" + expected + "' got '" + a.type + "' and '" + b.type + "'")

def int_expected(a, b):
    type_expected(TYPE_INT, a, b)

def int_add(s, m, e):
    if s.is_int() and m.obj.is_int():
        return Int(s.ival + m.obj.ival)
    else:
        int_expected(s, m.obj)

def float_expected(a, b):
    type_expected(TYPE_FLOAT, a, b)

def float_add(s, m, e):
    if s.is_float() and m.obj.is_float():
        return Float(s.fval + m.obj.fval)
    else:
        float_expected(s, m.obj)

def str_expected(a, b):
    type_expected(TYPE_STR, a, b)

def str_add(s, m, e):
    if s.is_str() and m.obj.is_str():
        return Str(s.sval + m.obj.sval)
    else:
        str_expected(s, m.obj)

def name_lookup(s, _m, e):
    v = e.find(s.name)
    if v is None:
        fail("Name " + s.name + " not found")
    else:
        return v

def later_eval(s, m, e):
    return s.lval

def block_eval(s, m, e):
    r = NIL
    for item in s.items:
        r = e.eval(item)

    return r

def array_eval(s, m, e):
    r = []
    for item in s.items:
        r.append(e.eval(item))

    return Array(r)

def map_eval(s, m, e):
    r = {}
    for (k, v) in s.kv.iteritems():
        r[k] = e.eval(v)

    return Map(r)

def pair_eval(s, m, e):
    return Pair(e.eval(s.a), e.eval(s.b))

def msg_eval(s, _m, e):
    return Msg(s.verb, e.eval(s.obj))

def send_eval(s, m, e):
    subj = e.eval(s.subj)
    msg = e.eval(s.msg)

    return e.down().set_up_limit().bind("it", subj).bind("that", msg.obj).send(subj, msg)

class Error(Exception):
    def __init__(self, msg):
        self.msg = msg

def entry_point(argv):
    f = Frame()

    nil_proto = Frame()
    nil_proto.bind("eval", Handler(lambda s, m, e: s))

    int_proto = Frame()
    int_proto.bind("+", Handler(int_add))
    int_proto.bind("eval", Handler(lambda s, m, e: s))

    float_proto = Frame()
    float_proto.bind("+", Handler(float_add))
    float_proto.bind("eval", Handler(lambda s, m, e: s))

    str_proto = Frame()
    str_proto.bind("+", Handler(str_add))
    str_proto.bind("eval", Handler(lambda s, m, e: s))

    name_proto = Frame()
    name_proto.bind("eval", Handler(name_lookup))

    later_proto = Frame()
    later_proto.bind("eval", Handler(later_eval))

    block_proto = Frame()
    block_proto.bind("eval", Handler(block_eval))

    pair_proto = Frame()
    pair_proto.bind("eval", Handler(pair_eval))

    array_proto = Frame()
    array_proto.bind("eval", Handler(array_eval))

    map_proto = Frame()
    map_proto.bind("eval", Handler(map_eval))

    msg_proto = Frame()
    msg_proto.bind("eval", Handler(msg_eval))

    send_proto = Frame()
    send_proto.bind("eval", Handler(send_eval))


    f.bind(TYPE_NIL, nil_proto)
    f.bind(TYPE_INT, int_proto)
    f.bind(TYPE_FLOAT, float_proto)
    f.bind(TYPE_STR, str_proto)
    f.bind(TYPE_LATER, later_proto)
    f.bind(TYPE_BLOCK, block_proto)
    f.bind(TYPE_PAIR, pair_proto)
    f.bind(TYPE_ARRAY, array_proto)
    f.bind(TYPE_MAP, map_proto)
    f.bind(TYPE_NAME, name_proto)
    f.bind(TYPE_MSG, msg_proto)
    f.bind(TYPE_SEND, send_proto)

    f.bind("i", Int(42))
    f.bind("f", Float(1.5))
    f.bind("s", Str("hi"))
    f.bind("b", Block([NIL, Int(4), Float(1.4), Pair(Int(1), Int(2))]))
    f.bind("a", Array([NIL, Int(4), Float(1.4), Pair(Int(1), Int(2))]))
    f.bind("m", Map({"n": NIL, "i": Int(4), "f": Float(1.4), "p": Pair(Int(1), Int(2)), "a\"b": Int(0)}))
    f.bind("p", Pair(NIL, Int(10)))
    f.bind("l", Later(Int(1)))
    
    f1 = f.right().down()

    try:
        print f1.eval(Send(Int(10), Msg("+", Name("i")))).to_str()
        print f1.eval(Send(Float(2.1), Msg("+", Name("f")))).to_str()
        print f1.eval(Send(Str("hey "), Msg("+", Name("s")))).to_str()
        print f1.eval(Name("b")).to_str()
        print f1.eval(Name("a")).to_str()
        print f1.eval(Name("m")).to_str()
        print f1.eval(Name("p")).to_str()
        print f1.eval(Name("l")).to_str()
    except Error, err:
        print "ERROR:", err.msg

    return 0

def target(*args):
    return entry_point, None

if __name__ == "__main__":
    entry_point(sys.argv)
