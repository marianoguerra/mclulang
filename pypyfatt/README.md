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
just fatt-c
```
