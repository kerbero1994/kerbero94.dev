#!/usr/bin/env bash
# The static layer, all of it even when one part fails, with machine-readable results in
# results/ for the PR report: HTML validity, unit tests (incl. CSP and structured data),
# and spelling. Exits 1 if any part failed.
set -u
mkdir -p results
status=0
npx html-validate "site/**/*.html" -f json > results/html.json || status=1
npx html-validate "site/**/*.html" -f stylish || true
node --test --test-reporter=spec --test-reporter-destination=stdout \
  --test-reporter=junit --test-reporter-destination=results/unit.xml "tests/unit/*.test.mjs" || status=1
node checks/spell.mjs > results/spell.txt; spell=$?
cat results/spell.txt; (( spell == 0 )) || status=1
exit $status
