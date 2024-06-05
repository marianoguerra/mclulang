set shell := ["nu", "-c"]

build:
    lit mclulang.lit

build-pandoc:
    lit --md-compiler pandoc mclulang.lit

cli-test:
    open oneliners.mclu | lines | where {|line| ($line | str length) > 0 and not ($line | str starts-with "#") } | each {|$line| ./mcli.js $"($line)"; print ""}

cli-test-mcro:
    open oneliners.mclu | lines | where {|line| ($line | str length) > 0 and not ($line | str starts-with "#") } | each {|$line| ./mcro.js $"($line)"; print ""}
    ./mcro.js '(a + 1) does 2'
    ./mcro.js '[{#{"fn": ((a + 1) does 2)}}]'
