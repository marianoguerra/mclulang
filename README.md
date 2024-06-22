# McLulang: The message is the language

## Motivation

> Yes, that was the big revelation to me when I was in graduate school—when I finally understood that the half page of code on the bottom of page 13 of the Lisp 1.5 manual was Lisp in itself. These were **“Maxwell’s Equations of Software!”** This is the whole world of programming in a few lines that I can put my hand over.
>
> -- [A Conversation with Alan Kay](https://queue.acm.org/detail.cfm?id=1039523)

Which are Maxwell's equations of Object Oriented software?

This is an attempt at answering that question based on the following:

> **OOP to me means only messaging**, local retention and protection and 
> hiding of state-process, **and extreme late-binding of all things**.
>
> -- [Dr. Alan Kay on the Meaning of “Object-Oriented Programming”](http://userpage.fu-berlin.de/~ram/pub/pub_jf47ht81Ht/doc_kay_oop_en)

>  I think our confusion with objects is **the problem that in our Western culture, we have a language that has very hard nouns and verbs in it**. Our process words stink. It's much easier for us when we think of an object—and I have apologized profusely over the last twenty years for making up the term object-oriented, because as soon as it started to be misapplied, I realized that I should have used a much more process-oriented term for it.—The Japanese have an interesting word, which is called ma. Spelled in English, just ma. **Ma is the stuff in-between what we call objects. It's the stuff we don't see, because we're focused on the nounness of things rather than the processness of things**. Japanese has a more process-feel oriented way of looking at how things relate to each other. You can always tell that by looking at the size of [the] word it takes to express something that is important. Ma is very short. We have to use words like interstitial or worse to approximate what the Japanese are talking about.
>
> -- [Alan Kay at OOPSLA 1997: The Computer Revolution has not Happened Yet](https://tinlizzie.org/IA/index.php/Alan_Kay_at_OOPSLA_1997:_The_Computer_Revolution_has_not_Happened_Yet)



## Concepts

- NIL
  - `()`
- Int (BigInt)
  - `42`
- String
  - `'hi'`
- Pair
  - `1 : 2`
  - `1 : 2 : 3`
    - same as `1 : (2 : 3)`
- Name (variable)
  - `foo`
- Array (JS Array)
  - `[]`
  - `[1]`
  - `[1, 2, 3]`
- Map (JS Map)
  - `#{}`
  - `#{1: 'one'}`
  - `#{1: 'one', 'two': 2}`
- Block
  - `{1}`
  - `{1, 2, 3}`
- Msg: verb object
  - `+ 1`
- MsgQuote: \ verb object
  - `\ + 1`
- Send: subject verb object
  - `1 + 2`
  - `1 : 2 map \ + 1`
  - `1 + 2 * 3`
    - same as `(1 + 2) * 3`
  - msg send handler enters a nested frame with subject bound to `it` and object bound to `that`, native handlers have access to the message object and current stack
- Later: ignores first eval
  - `@a`
  - `@(a + b)`
  - binding a name to a value is a native handler for the Name tag
    - `@a is 42`
  - message handlers are a later value bound to the Msg tag
    - `@(0 add 0) does @(it + that)`
  - conditions can be expressed with a native handler and Later for short circut behavior
    - `() ? @ 2 : 3` -> `3`
    - `1 ? @ 2 : 3` -> `2`
- Env: bindings and handlers

## Fatt CLI

```sh
./fatt.cli.js '42' '10 + 2' '1 : 2.5 : () : "hi"' '() ? @ "true" : "false"' '\ + 2' '@(1 + 2)' '[]' '[1, 1.4, ["hi", ()]]' '"my-type" as-type ()' '@{42, ()}' '#{1: "one", "two
": 2}' '#{} . "foo"' '#{"foo": "bar"} . "foo"' '@ @ @ foo'
```

```js
>  42
42

>  10 + 2
12

>  1 : 2.5 : () : "hi"
1 : 2.5 : () : "hi"

>  () ? @ "true" : "false"
"false"

>  \ + 2
\ + 2

>  @(1 + 2)
1 + 2

>  []
[]

>  [1, 1.4, ["hi", ()]]
[1, 1.4, ["hi", ()]]

>  "my-type" as-type ()
("my-type" as-type ())

>  @{42, ()}
{42, ()}

>  #{1: "one", "two": 2}
#{1: "one", "two": 2}

>  #{} . "foo"
()

>  #{"foo": "bar"} . "foo"
"bar"

>  @ @ @ foo
@(@(foo))
```

## Phases CLI

```sh
./fatt.phases.cli.js '1 + 2' '1.5 + 1.2' '"hello " + "joe"' '(1 + 2) : 3' '@ (1 + 2)' '{@foo is (1 + 42), foo}' '(0 add+1 (0 + 2)) replies (0 + 1 + it + that)' '{1 + 2, 42, () }' '#{"a": (1 + 3), ("key" + "One"): 42}' '() ? 1 : 2' '42 ? 1 : 2' '1 > 2' '2 > 1' ' 3 > 2 > 1' '3 > 2 < 1' '{@a is (), a ? 1 : 2}' '{@a is 10, (a > 10) ? 1 : 2}' '1 ? 2' '{@a is 1, a ? 1}' '{@a is 1, a ? @ 1}'
```

```js
>  1 + 2

#   comp
in  1 + 2
out 3

#   run
in  3
out 3

>  1.5 + 1.2

#   comp
in  1.5 + 1.2
out 2.7

#   run
in  2.7
out 2.7

>  "hello " + "joe"

#   comp
in  "hello " + "joe"
out "hello joe"

#   run
in  "hello joe"
out "hello joe"

>  (1 + 2) : 3

#   comp
in  (1 + 2) : 3
out 3 : 3

#   run
in  3 : 3
out 3 : 3

>  @ (1 + 2)

#   comp
in  @(1 + 2)
out @(3)

#   run
in  @(3)
out 3

>  {@foo is (1 + 42), foo}

#   comp
in  {@(foo) is (1 + 42), foo}
out {@(foo) is 43, foo}

#   run
in  {@(foo) is 43, foo}
out 43

>  (0 add+1 (0 + 2)) replies (0 + 1 + it + that)

#   comp
in  (0 add+1 (0 + 2)) replies (((0 + 1) + it) + that)
out @(0 add+1 2) replies @((1 + it) + that)

#   run
in  @(0 add+1 2) replies @((1 + it) + that)
out ()

>  {1 + 2, 42, ()}

#   comp
in  {1 + 2, 42, ()}
out {3, 42, ()}

#   run
in  {3, 42, ()}
out ()

>  #{"a": (1 + 3), ("key" + "One"): 42}

#   comp
in  #{"a": 1 + 3, "key" + "One": 42}
out #{"a": 4, "keyOne": 42}

#   run
in  #{"a": 4, "keyOne": 42}
out #{"a": 4, "keyOne": 42}

>  () ? 1 : 2

#   comp
in  () ? 1 : 2
out 2

#   run
in  2
out 2

>  42 ? 1 : 2

#   comp
in  42 ? 1 : 2
out 1

#   run
in  1
out 1

>  1 > 2

#   comp
in  1 > 2
out ()

#   run
in  ()
out ()

>  2 > 1

#   comp
in  2 > 1
out 2

#   run
in  2
out 2

>   3 > 2 > 1

#   comp
in  (3 > 2) > 1
out 3

#   run
in  3
out 3

>  3 > 2 < 1

#   comp
in  (3 > 2) < 1
out ()

#   run
in  ()
out ()

>  {@a is (), a ? 1 : 2}

#   comp
in  {@(a) is (), a ? 1 : 2}
out {@(a) is (), a ? @(1 : 2)}

#   run
in  {@(a) is (), a ? @(1 : 2)}
out 2

>  {@a is 10, (a > 10) ? 1 : 2}

#   comp
in  {@(a) is 10, (a > 10) ? 1 : 2}
out {@(a) is 10, (a > 10) ? @(1 : 2)}

#   run
in  {@(a) is 10, (a > 10) ? @(1 : 2)}
out 2

>  1 ? 2

#   comp
in  1 ? 2
out 2

#   run
in  2
out 2

>  {@a is 1, a ? 1}

#   comp
in  {@(a) is 1, a ? 1}
out {@(a) is 1, a ? @(1 : ())}

#   run
in  {@(a) is 1, a ? @(1 : ())}
out 1

>  {@a is 1, a ? @ 1}

#   comp
in  {@(a) is 1, a ? @(1)}
out {@(a) is 1, a ? @(1 : ())}

#   run
in  {@(a) is 1, a ? @(1 : ())}
out 1
```
