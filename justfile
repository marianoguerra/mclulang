
build:
    lit mclulang.lit

build-pandoc:
    lit --md-compiler pandoc mclulang.lit

cli-test:
    ./mcli.js '() ? @ 2 : 3' '1 ? @ 2 : 3' '() ? @ 2 : 3 ? @ 4 : 5' '() ? @ 2 : () ? @ 4 : 5' '()' "'hi' * 5" '1 send \ + 2' '1 : 2 : 3 send \ + 2' '[]' '[10]' "[1, 1.2, 'hi', (), {42}, 1 + 2]" "[1, 2 : 3, [4]] send \ + 1" '{@a is 42, a}' '{@(0 add+1 0) does @{it + that + 1}, 1 add+1 3}' '{@a is 2, a ? @ a : b}' '#{}' "#{1: 'one', 'two': 2}" "#{1: 'one', 'two': 2} . 1" "{@MyType is ('MyType' as-tag ()), @m is #{}, m apply-tag MyType, @(m say-hello 'bob') does @('hello ' + that + '!'), m say-hello 'Joe'}"
