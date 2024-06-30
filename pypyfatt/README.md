# pypyfatt

fatt implementation using [rpython](https://rpython.readthedocs.io/en/latest/)

## Setup

```bash
just setup-dev
```

if you don't have [just](https://github.com/casey/just) installed you can copy and paste the commands from the `setup-dev` target in the `justfile` by hand.

## Build

```bash
nix-shell
cd pypy
pypy get_externals.py
```

If you want an interpreter but don't want to wait too long:

```bash
just fatt-c
```

If you want to see some nice fractals and have time for a coffee and get a JIT:

```bash
just fatt-c-jit
```
