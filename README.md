# McLulang

## Concepts

- NIL
  - `()`
- Int (BigInt)
  - `42`
- Pair
  - `1 : 2`
  - `1 : 2 : 3`
    - same as `1 : (2 : 3)`
- Name (variable)
  - `foo`
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
3n
>  1 ? @ 2 : 3
2n
>  () ? @ 2 : 3 ? @ 4 : 5
4n
>  () ? @ 2 : () ? @ 4 : 5
5n
>  {@(0 add+1 0) does @{it + that + 1}, 1 add+1 3}
5n
```
