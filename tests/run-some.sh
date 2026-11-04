#!/bin/sh
# Runs the named checks one after another, each alone (for working on a few):  sh tests/run-some.sh check-board check-arrows
cd "$(dirname "$0")/.." || exit 1
for c in "$@"; do
  echo "=== $c"
  node tests/run-one.js "$c" 2>&1 | tail -40
done
