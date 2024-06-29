import sys
from fatt_types import *
from fatt_parser import parse
from rply import LexingError, ParsingError

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

def entry_point(argv):
    f = Frame()

    nil_proto = Frame()
    nil_proto.bind("eval", Handler(lambda s, m, e: s))

    int_proto = Frame()
    int_proto.bind("eval", Handler(lambda s, m, e: s))

    int_proto.bind("+", int_binop(lambda a, b: a + b))
    int_proto.bind("-", int_binop(lambda a, b: a - b))
    int_proto.bind("*", int_binop(lambda a, b: a * b))

    int_proto.bind("<", int_compop(lambda a, b: a < b))
    int_proto.bind("<=", int_compop(lambda a, b: a <= b))
    int_proto.bind(">", int_compop(lambda a, b: a > b))
    int_proto.bind(">=", int_compop(lambda a, b: a >= b))
    int_proto.bind("=", int_compop(lambda a, b: a == b))
    int_proto.bind("!=", int_compop(lambda a, b: a != b))

    float_proto = Frame()
    float_proto.bind("eval", Handler(lambda s, m, e: s))

    float_proto.bind("+", float_binop(lambda a, b: a + b))
    float_proto.bind("-", float_binop(lambda a, b: a - b))
    float_proto.bind("*", float_binop(lambda a, b: a * b))
    float_proto.bind("/", float_binop(lambda a, b: a / b))

    float_proto.bind("<", float_compop(lambda a, b: a < b))
    float_proto.bind("<=", float_compop(lambda a, b: a <= b))
    float_proto.bind(">", float_compop(lambda a, b: a > b))
    float_proto.bind(">=", float_compop(lambda a, b: a >= b))
    float_proto.bind("=", float_compop(lambda a, b: a == b))
    float_proto.bind("!=", float_compop(lambda a, b: a != b))


    str_proto = Frame()
    str_proto.bind("eval", Handler(lambda s, m, e: s))

    str_proto.bind("+", str_binop(lambda a, b: a + b))

    str_proto.bind("<", str_compop(lambda a, b: a < b))
    str_proto.bind("<=", str_compop(lambda a, b: a <= b))
    str_proto.bind(">", str_compop(lambda a, b: a > b))
    str_proto.bind(">=", str_compop(lambda a, b: a >= b))
    str_proto.bind("=", str_compop(lambda a, b: a == b))
    str_proto.bind("!=", str_compop(lambda a, b: a != b))


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

    f.bind_type(TYPE_NIL, nil_proto)
    f.bind_type(TYPE_INT, int_proto)
    f.bind_type(TYPE_FLOAT, float_proto)
    f.bind_type(TYPE_STR, str_proto)
    f.bind_type(TYPE_LATER, later_proto)
    f.bind_type(TYPE_BLOCK, block_proto)
    f.bind_type(TYPE_PAIR, pair_proto)
    f.bind_type(TYPE_ARRAY, array_proto)
    f.bind_type(TYPE_MAP, map_proto)
    f.bind_type(TYPE_NAME, name_proto)
    f.bind_type(TYPE_MSG, msg_proto)
    f.bind_type(TYPE_SEND, send_proto)

    f1 = f.right().down()

    if len(argv) > 1:
        code = argv[1]
        try:
            expr = parse(code).to_type()
            print f1.eval(expr).to_str()
        except Error as err:
            print "Runtime Error:", err.msg
        except LexingError as err:
            print "Lexing Error:", err.message, "|", format_pos(err.source_pos)
        except ParsingError as err:
            print "Parsing Error:", err.message, "|", format_pos(err.source_pos)
        except Exception as err:
            print "Error:", str(err)
    else:
        print "usage: fatt '1 + 2'"


    return 0

def format_pos(pos):
    if pos is None:
        return "no source position available"
    else:
        return "line: %d, column: %d" % (pos.lineno, pos.colno)

def target(*args):
    return entry_point, None

if __name__ == "__main__":
    entry_point(sys.argv)
