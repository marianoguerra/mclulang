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
- Env: bindings and handlers

