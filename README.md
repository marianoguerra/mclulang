# McLulang

## Motivation

> Yes, that was the big revelation to me when I was in graduate school—when I finally understood that the half page of code on the bottom of page 13 of the Lisp 1.5 manual was Lisp in itself. These were “Maxwell’s Equations of Software!” This is the whole world of programming in a few lines that I can put my hand over. 
>
> -- [A Conversation with Alan Kay](https://queue.acm.org/detail.cfm?id=1039523)

Which are Maxwell's equations of Object Oriented software?

This is an attempt at answering that question based on the following:

> OOP to me means only messaging, local retention and protection and 
> hiding of state-process, and extreme late-binding of all things.
>
> -- [Dr. Alan Kay on the Meaning of “Object-Oriented Programming”](http://userpage.fu-berlin.de/~ram/pub/pub_jf47ht81Ht/doc_kay_oop_en)


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
    - `() ? @ 2 : 3` -> 3
    - `1 ? @ 2 : 3` -> 2
- Env: bindings and handlers

## mcli

```sh
./mcli.js '() ? @ 2 : 3' '1 ? @ 2 : 3' '() ? @ 2 : 3 ? @ 4 : 5' '() ? @ 2 : () ? @ 4 : 5' '{@(0 add+1 0) does @{it + that + 1}, 1 add+1 3}'

>  () ? @ 2 : 3
3
>  1 ? @ 2 : 3
2
>  () ? @ 2 : 3 ? @ 4 : 5
4
>  () ? @ 2 : () ? @ 4 : 5
5
>  {@(0 add+1 0) does @{it + that + 1}, 1 add+1 3}
5
```

Other examples:

```js
>  ()
()

>  'hi' * 5
'hihihihihi'

>  1 send \ + 2
3

>  1 : 2 : 3 send \ + 2
3 : 4 : 5

>  []
[]

>  [10]
[10]

>  [1, 1.2, 'hi', (), {42}, 1 + 2]
[1, 1.2, 'hi', (), 42, 3]

>  [1, 2 : 3, [4]] send \ + 1
[2, 3 : 4, [5]]
```
