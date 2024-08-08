(eval for all)

- Nil
  - eval: returns itself
  - <
  - =
- Int / Float:
  - eval: returns itself
  - arithmetic: + - * /
  - <
  - =
- Str:
  - eval: returns itself
  - +
  - <
  - =
- Later
  - eval: unwraps
- Frame
  - eval: returns itself
  - up: returns parent (used for var bindings)
  - eval-in: evals object in subject
  - find: lookups str name in subject
  - bind: binds pair b as pair a (str name) in subject
  - get-type: returns type of object (could be defined on each type)
  - new-frame: returns a new root frame
- Name
  - eval: looks up str name in environment
  - e always evals to current environment
- Pair
  - pair: returns new pair with a and b evaluated
  - accessors: a, b
- Msg
  - eval: returns a new mesg with obj evaluated
  - accessors: verb, obj
- Send
  - eval: 
    - evals subj and msg
    - down()
    - binds subj as it, msg as msg, msg.obj as that and sends msg to subj
  - accessors: subj, msg
- Block
  - eval: evals all items returns last
- Array
  - eval: evals all items and returns list of results

Bootstrapped:

- reply: define a msg handler for a type
- @name is value: bind value to name
- not
- remaining comparisons: <= > >=
- and, or
- ternary operator

