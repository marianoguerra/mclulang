class Type(object):
    def __init__(self, type):
        self.type = type

    def to_str(self):
        return self.type.sym_name

    def handle(self, _s, _m, e):
        return e.eval(self)

    def is_int(self):
        return False

    def is_float(self):
        return False

    def is_str(self):
        return False

class Symbol(Type):
    def __init__(self, sym_name):
        Type.__init__(self, self)
        self.sym_name = sym_name

TYPE_NIL = Symbol("Nil")
TYPE_INT = Symbol("Int")
TYPE_FLOAT = Symbol("Float")
TYPE_STR = Symbol("Str")
TYPE_NAME = Symbol("Name")
TYPE_LATER = Symbol("Later")
TYPE_BLOCK = Symbol("Block")
TYPE_PAIR = Symbol("Pair")
TYPE_ARRAY = Symbol("Array")
TYPE_MAP = Symbol("Map")
TYPE_MSG = Symbol("Msg")
TYPE_SEND = Symbol("Send")
TYPE_FRAME = Symbol("Frame")
TYPE_HANDLER = Symbol("Handler")

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
        return quote_str(self.sval)

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

def unquote_str(s):
    r = []


    for i in range(1, len(s) - 1):
        c = s[i]

        if not (c == '\\' and s[i + 1] == '"'):
            r.append(c)

    return "".join(r)

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
        self.type_binds = {}

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

    def bind_type(self, sym, value):
        self.type_binds[sym.sym_name] = value
        return self

    def find_type(self, sym):
        v = self.type_binds.get(sym.sym_name)

        if v is None:
            if self.up_limit or self.up is None:
                if self.left_limit or self.left is None:
                    return v
                else:
                    return self.left.find_type(sym)
            else:
                return self.up.find_type(sym)
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
        proto = self.find_type(s.type)

        if proto:
            print "proto found for " + s.type.sym_name + " " + m.verb + " " + s.to_str()
            return proto.find(m.verb)
        else:
            print "proto not found for type", s.type.sym_name, "verb", m.verb, "s", s.to_str()
            return None

    def send(self, s, m):
        handler = self.get_send_handler(s, m)

        if handler is not None:
            return handler.handle(s, m, self);
        else:
            print "handler not found for ", s.type.sym_name, s.to_str(),  m.to_str()
            fail("HandlerNotFound: " + s.to_str())

class Error(Exception):
    def __init__(self, msg):
        self.msg = msg


def fail(msg):
    print "ERROR:", msg
    raise Error(msg)

