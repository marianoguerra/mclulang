import sys

TYPE_NIL = "Nil"
TYPE_INT = "Int"
TYPE_FLOAT = "Float"
TYPE_STR = "Str"
TYPE_NAME = "Name"
TYPE_LATER = "Later"
TYPE_BLOCK = "Block"
TYPE_PAIR = "Pair"
TYPE_MSG = "Msg"
TYPE_SEND = "Send"
TYPE_FRAME = "Frame"

TYPE_HANDLER = "Handler"

class Type(object):
    def __init__(self, type):
        self.type = type

    def __str__(self):
        return self.type

    def handle(self, _s, _m, e):
        return e.eval(self)

    def is_int(self):
        return self.type == TYPE_INT

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

    def __str__(self):
        return str(self.ival)

class Float(Type):
    def __init__(self, value):
        Type.__init__(self, TYPE_FLOAT)
        self.fval = value

    def __str__(self):
        return str(self.fval)

class Str(Type):
    def __init__(self, value):
        Type.__init__(self, TYPE_STR)
        self.sval = value

    def __str__(self):
        return str(self.sval)

class Name(Type):
    def __init__(self, name):
        Type.__init__(self, TYPE_NAME)
        self.name = name

    def __str__(self):
        return str(self.name)

class Later(Type):
    def __init__(self, value):
        Type.__init__(self, TYPE_LATER)
        self.lval = value

    def __str__(self):
        return "@(" + self.lval.__str__() + ")"

class Block(Type):
    def __init__(self, items):
        Type.__init__(self, TYPE_BLOCK)
        self.items = items

class Pair(Type):
    def __init__(self, a, b):
        Type.__init__(self, TYPE_PAIR)
        self.a = a
        self.b = b

    def __str__(self):
        return self.a.__str__() + ":" + self.b.__str__()

class Nil(Type):
    def __init__(self):
        Type.__init__(self, TYPE_NIL)

    def __str__(self):
        return "()"

NIL = Nil()

class Msg(Type):
    def __init__(self, verb, obj):
        Type.__init__(self, TYPE_MSG)
        self.verb = verb
        self.obj = obj

    def __str__(self):
        return "\\ " + self.verb + " " + self.obj.__str__()

class Send(Type):
    def __init__(self, subj, msg):
        Type.__init__(self, TYPE_SEND)
        self.subj = subj
        self.msg = msg

    def __str__(self):
        return self.subj.__str__() + " " + self.msg.verb + " " + self.msg.obj.__str__()

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
            print "proto found for " + s.type + " " + m.verb + " " + s.__str__()
            return proto.find(m.verb)
        else:
            print "proto not found for type", s.type, "verb", m.verb, "s", s.__str__()
            return None

    def send(self, s, m):
        handler = self.get_send_handler(s, m)

        if handler is not None:
            return handler.handle(s, m, self);
        else:
            print "handler not found for ", s.type, s.__str__(),  m.__str__()
            fail("HandlerNotFound: " + s.__str__())

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

def name_lookup(s, _m, e):
    v = e.find(s.name)
    if v is None:
        fail("Name " + s.name + " not found")
    else:
        return v

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

    int_proto = Frame()
    int_proto.bind("+", Handler(int_add))
    int_proto.bind("eval", Handler(lambda s, m, e: s))

    name_proto = Frame()
    name_proto.bind("eval", Handler(name_lookup))

    msg_proto = Frame()
    msg_proto.bind("eval", Handler(msg_eval))

    send_proto = Frame()
    send_proto.bind("eval", Handler(send_eval))

    f.bind(TYPE_INT, int_proto)
    f.bind(TYPE_NAME, name_proto)
    f.bind(TYPE_MSG, msg_proto)
    f.bind(TYPE_SEND, send_proto)

    f1 = f.bind("a", Int(42)).right().down()

    try:
        print f1.eval(Send(Int(10), Msg("+", Name("a")))).__str__()
    except Error, err:
        print "ERROR:", err.msg

    return 0

def target(*args):
    return entry_point, None

if __name__ == "__main__":
    entry_point(sys.argv)
