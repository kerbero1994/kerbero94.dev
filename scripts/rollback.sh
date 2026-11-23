#!/usr/bin/env bash
# Restore a previous production deploy on Netlify (no build, no credits). With no
# DEPLOY_ID, picks the newest production deploy older than the one live now.
# DRY_RUN=true only prints the choice. Needs NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID.
set -euo pipefail
API=https://api.netlify.com/api/v1
auth=(-H "Authorization: Bearer $NETLIFY_AUTH_TOKEN")
site=$(curl -fsS "${auth[@]}" "$API/sites/$NETLIFY_SITE_ID")
live_id=$(jq -r '.published_deploy.id' <<<"$site")
live_at=$(jq -r '.published_deploy.created_at' <<<"$site")
if [[ -z "${DEPLOY_ID:-}" ]]; then
  DEPLOY_ID=$(curl -fsS "${auth[@]}" "$API/sites/$NETLIFY_SITE_ID/deploys?production=true&state=ready&per_page=50" |
    jq -r --arg at "$live_at" '[.[] | select(.context == "production" and .created_at < $at)][0].id // empty')
fi
[[ -n "$DEPLOY_ID" ]] || { echo "No earlier production deploy to restore." >&2; exit 1; }
target=$(curl -fsS "${auth[@]}" "$API/sites/$NETLIFY_SITE_ID/deploys/$DEPLOY_ID")
echo "Live now:   $live_id ($live_at)"
echo "Restoring:  $DEPLOY_ID ($(jq -r '.created_at' <<<"$target")) \"$(jq -r '.title // .commit_ref // ""' <<<"$target")\""
echo "deploy_id=$DEPLOY_ID" >> "${GITHUB_OUTPUT:-/dev/null}"
[[ "${DRY_RUN:-false}" == true ]] && { echo "Dry run: nothing restored."; exit 0; }
curl -fsS -X POST "${auth[@]}" "$API/sites/$NETLIFY_SITE_ID/deploys/$DEPLOY_ID/restore" >/dev/null
echo "Restored. Production now serves $DEPLOY_ID."
