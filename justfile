set shell := ["nu", "-c"]

test-all: test-single test-phases

test-single: (test "cli.tests" "fatt.cli.js")

test-phases: (test "phases.tests" "fatt.phases.cli.js")

test FILE BIN:
    open {{FILE}} | lines | where {|line| ($line | str length) > 0 and not ($line | str starts-with "#") } | each {|$line| ./{{BIN}} $"($line)"; print ""}


