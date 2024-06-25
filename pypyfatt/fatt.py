import sys
from fatt_types import *
from fatt_parser import parse

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

    print parse("12").to_type().to_str()
    print parse("1.5").to_type().to_str()
    print parse("()").to_type().to_str()
    print parse('"hi"').to_type().to_str()
    print parse('foo').to_type().to_str()
    print parse('\\ + 1').to_type().to_str()
    print parse('@ 1').to_type().to_str()
    print parse('1 + 2').to_type().to_str()
    print parse('1 + 2 + 3').to_type().to_str()
    print parse('1 : 2').to_type().to_str()
    print parse('1 : 2 : 3').to_type().to_str()
    print parse('{1}').to_type().to_str()
    print parse('{1, 2}').to_type().to_str()
    print parse('{1, 2, 3}').to_type().to_str()
    print parse('[]').to_type().to_str()
    print parse('[1]').to_type().to_str()
    print parse('[1, 2]').to_type().to_str()
    print parse('[1, 2, 3]').to_type().to_str()
    print parse('#{}').to_type().to_str()
    print parse('#{"i": 1}').to_type().to_str()
    print parse('#{"i": 1, "f": 1.5}').to_type().to_str()
    print parse('#{"i": 1, "f": 1.5, "n": ()}').to_type().to_str()

    if len(argv) > 1:
        code = argv[1]
        try:
            expr = parse(code).to_type()
            print f1.eval(expr).to_str()
        except ValueError, err:
            print err


    return 0

def target(*args):
    return entry_point, None

if __name__ == "__main__":
    entry_point(sys.argv)
