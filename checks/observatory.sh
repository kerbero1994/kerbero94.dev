#!/usr/bin/env bash
# Mozilla HTTP Observatory grade for kerbero94.dev: fails below A+.
set -euo pipefail
r=$(curl -sS -X POST "https://observatory-api.mdn.mozilla.net/api/v2/scan?host=kerbero94.dev")
grade=$(jq -r '.grade' <<<"$r"); score=$(jq -r '.score' <<<"$r")
echo "HTTP Observatory: $grade ($score/100), tests passed $(jq -r '.tests_passed' <<<"$r")/$(jq -r '.tests_quantity' <<<"$r")"
echo "Details: https://developer.mozilla.org/en-US/observatory/analyze?host=kerbero94.dev"
[[ "$grade" == "A+" ]]
