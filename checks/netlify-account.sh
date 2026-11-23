#!/usr/bin/env bash
# Netlify health from the API: the deploy token still works, and how many production
# deploys this billing period has used. Each costs 15 of the 300 monthly credits
# (traffic uses some too, so this is a floor). Warns at 10 deploys, fails at 16
# (240 credits): when credits run out, Netlify pauses the site.
set -euo pipefail
API=https://api.netlify.com/api/v1
auth=(-H "Authorization: Bearer $NETLIFY_AUTH_TOKEN")
curl -fsS "${auth[@]}" -o /dev/null "$API/sites/$NETLIFY_SITE_ID" || { echo "FAIL Netlify token rejected: create a new one (README > Secrets)"; exit 1; }
echo "ok   Netlify token valid"
account=$(curl -fsS "${auth[@]}" "$API/accounts" | jq '.[0]')
start=$(jq -r '.current_usage_period_start' <<<"$account"); next=$(jq -r '.next_usage_period_start' <<<"$account")
plan=$(jq -r '.plan_credits // 300' <<<"$account")
since=$(date -u -d "$start" +%Y-%m-%dT%H:%M:%SZ)
n=$(curl -fsS "${auth[@]}" "$API/sites/$NETLIFY_SITE_ID/deploys?production=true&state=ready&per_page=100" |
  jq --arg s "$since" '[.[] | select(.context == "production" and .created_at >= $s)] | length')
used=$(( n * 15 ))
echo "Billing period ${start%%T*} to ${next%%T*}: $n production deploys, at least $used of $plan credits"
if (( n >= 16 )); then echo "FAIL $n deploys this period: stop deploying until ${next%%T*}"; exit 1; fi
if (( n >= 10 )); then echo "::warning::$n production deploys this period (~$used of $plan credits)"; fi
