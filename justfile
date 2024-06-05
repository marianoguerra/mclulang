set shell := ["nu", "-c"]

build:
    lit mclulang.lit

build-pandoc:
    lit --md-compiler pandoc mclulang.lit

cli-test:
    open oneliners.mclu | lines | where {|line| ($line | str length) > 0 and not ($line | str starts-with "#") } | each {|$line| ./mcli.js $"($line)"; print ""}
