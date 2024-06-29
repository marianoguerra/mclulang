from rply import ParserGenerator, LexerGenerator, ParsingError
from rply.token import BaseBox
import fatt_types as t


class Int(BaseBox):
    def __init__(self, value):
        self.ival = value

    def to_type(self):
        return t.Int(self.ival)


class Float(BaseBox):
    def __init__(self, value):
        self.fval = value

    def to_type(self):
        return t.Float(self.fval)


class Str(BaseBox):
    def __init__(self, value):
        self.sval = value

    def to_type(self):
        return t.Str(self.sval)


class Name(BaseBox):
    def __init__(self, name):
        self.name = name

    def to_type(self):
        return t.Name(self.name)


class Later(BaseBox):
    def __init__(self, value):
        self.lval = value

    def to_type(self):
        return t.Later(self.lval.to_type())


class Block(BaseBox):
    def __init__(self, items):
        self.items = items

    def to_type(self):
        return t.Block([v.to_type() for v in self.items])


class Array(BaseBox):
    def __init__(self, items):
        self.aitems = items

    def to_type(self):
        return t.Array([v.to_type() for v in self.aitems])


class Map(BaseBox):
    def __init__(self, kv={}):
        self.kv = kv

    def to_type(self):
        kv = {}
        for k, v in self.kv.iteritems():
            kv[k] = v.to_type()

        return t.Map(kv)


class Pair(BaseBox):
    def __init__(self, a, b):
        self.a = a
        self.b = b

    def to_type(self):
        return t.Pair(self.a.to_type(), self.b.to_type())


class Nil(BaseBox):
    def to_type(self):
        return t.NIL


NIL = Nil()


class Msg(BaseBox):
    def __init__(self, verb, obj):
        self.verb = verb
        self.obj = obj

    def to_type(self):
        return t.Msg(self.verb, self.obj.to_type())


class Send(BaseBox):
    def __init__(self, subj, msg):
        self.subj = subj
        self.msg = msg

    def to_type(self):
        return t.Send(self.subj.to_type(), self.msg.to_type())


lg = LexerGenerator()

NAME_RE = r"[a-zA-Z][a-zA-Z0-9]*"
VERB_RE = r"[<>\.\*\/\+\!\-\_\?\$%&=a-zA-Z][<>\.\*\+\!\-\_\?\$%&=a-zA-Z0-9]*"

lg.add("at", r"@")
lg.add("colon", r":")

lg.add("float", r"\d+\.\d+")
lg.add("number", r"\d+")
lg.add("string", r'"(\\\^.|\\.|[^\"])*"')

lg.add("name", NAME_RE)

lg.add("verb", VERB_RE)

lg.add("sep", r",")

lg.add("bslash", r"\\")

lg.add("oblock", r"{")
lg.add("cblock", r"}")

lg.add("omap", r"#{")

lg.add("oarray", r"\[")
lg.add("carray", r"\]")

lg.add("opar", r"\(")
lg.add("cpar", r"\)")

lg.ignore(r"[\s\r\n\t]+")

lexer = lg.build()

pg = ParserGenerator(
    [
        "opar",
        "cpar",
        "number",
        "float",
        "string",
        "name",
        "verb",
        "bslash",
        "at",
        "colon",
        "sep",
        "oblock",
        "cblock",
        "oarray",
        "carray",
        "omap",
    ]
)


class State(object):
    def __init__(self):
        pass


class ValueList(BaseBox):
    def __init__(self, value):
        self.vlitems = value

    def getitems(self):
        return self.vlitems


@pg.production("main : send")
def main(state, p):
    return p[0]


@pg.production("send : value")
def send_value(state, p):
    return p[0]


@pg.production("send : value msgs")
def send_msgs(state, p):
    r = p[0]

    for msg in p[1].getitems():
        r = Send(r, msg)

    return r


@pg.production("msgs : msg")
def msgs_msg(state, p):
    return ValueList([p[0]])


@pg.production("msgs : msg msgs")
def msgs_msgs(state, p):
    return ValueList([p[0]] + p[1].getitems())


@pg.production("value : pair_head")
def value_pair_head(state, p):
    return p[0]


@pg.production("value : pair")
def value_pair(state, p):
    return p[0]


@pg.production("pair : pair_head colon value")
def pair(state, p):
    return Pair(p[0], p[2])


@pg.production("pair_head : scalar")
def pair_head_scalar(state, p):
    return p[0]


@pg.production("pair_head : at value")
def pair_head_later(state, p):
    return Later(p[1])


@pg.production("pair_head : opar send cpar")
def pair_head_par_send(state, p):
    return p[1]


@pg.production("pair_head : opar send cpar")
def pair_head_par_send(state, p):
    return p[1]


@pg.production("pair_head : block")
def pair_head_block(state, p):
    return p[0]


@pg.production("pair_head : array")
def pair_head_array(state, p):
    return p[0]


@pg.production("pair_head : map")
def pair_head_map(state, p):
    return p[0]


@pg.production("block : oblock exprs cblock")
def block(state, p):
    return Block(p[1].getitems())


@pg.production("array : oarray carray")
def array_empty(state, p):
    return Array([])


@pg.production("array : oarray exprs carray")
def array(state, p):
    return Array(p[1].getitems())


@pg.production("map : omap cblock")
def map_empty(state, p):
    return Map({})


@pg.production("map : omap map_kvs cblock")
def map(state, p):
    r = {}

    for pair in p[1].getitems():
        # make rpython happy
        if isinstance(pair, Pair):
            k = pair.a
            if isinstance(k, Str):
                r[t.unquote_str(k.sval)] = pair.b

    return Map(r)


@pg.production("map_kvs : map_kv")
def map_kvs_one(state, p):
    return ValueList([p[0]])


@pg.production("map_kvs : map_kv sep map_kvs")
def map_kvs_many(state, p):
    return ValueList([p[0]] + p[2].getitems())


@pg.production("map_kv : string colon value")
def map_kv(state, p):
    return Pair(Str(p[0].getstr()), p[2])


@pg.production("exprs : send")
def exprs_one(state, p):
    return ValueList([p[0]])


@pg.production("exprs : send sep exprs")
def exprs_many(state, p):
    return ValueList([p[0]] + p[2].getitems())


@pg.production("scalar : opar cpar")
def scalar_nil(state, p):
    return NIL


@pg.production("scalar : number")
def scalar_integer(state, p):
    return Int(int(p[0].getstr()))


@pg.production("scalar : float")
def scalar_float(state, p):
    return Float(float(p[0].getstr()))


@pg.production("scalar : string")
def scalar_string(state, p):
    return Str(t.unquote_str(p[0].getstr()))


@pg.production("scalar : name")
def scalar_name(state, p):
    return Name(p[0].getstr())


@pg.production("scalar : bslash msg")
def scalar_msg_quote(state, p):
    return p[1]


@pg.production("msg : verb value")
def value_string(state, p):
    return Msg(p[0].getstr(), p[1])


@pg.error
def error_handler(state, token):
    raise ParsingError(
        "Unexpected token of type %s ('%s')" % (token.gettokentype(), token.getstr()),
        token.getsourcepos(),
    )


parser = pg.build()


def parse(code):
    state = State()
    return parser.parse(lexer.lex(code), state)
