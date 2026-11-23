#!/usr/bin/env bash
# Smoke test of production: every page and asset answers, redirects point home,
# and the certificate has at least 14 days left. Used by deploy.yml and monitor.yml.
set -euo pipefail
HOST=kerbero94.dev
fail=0
check() { # url, expected status, [expected content-type]
  read -r code type < <(curl -sS -o /dev/null -w '%{http_code} %{content_type}\n' "$1")
  if [[ "$code" != "$2" || ( -n "${3:-}" && "$type" != *"$3"* ) ]]; then echo "FAIL $1: $code $type"; fail=1; else echo "ok   $1: $code"; fi
}
for p in / /sitimm/ /accessibility/ /sitimmvito/ /architecture/; do check "https://$HOST$p" 200 text/html; done
check "https://$HOST/eduardo-gonzalez-cv.pdf" 200 application/pdf
check "https://$HOST/og.png" 200 image/png
check "https://$HOST/sitemap.xml" 200
check "https://$HOST/robots.txt" 200
check "https://$HOST/.well-known/security.txt" 200 text/plain
check "https://$HOST/fonts/bodoni-moda.woff2" 200 font/woff2
check "http://$HOST/" 301
check "https://www.$HOST/" 301
end=$(echo | openssl s_client -servername "$HOST" -connect "$HOST:443" 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
days=$(( ( $(date -d "$end" +%s) - $(date +%s) ) / 86400 ))
if (( days < 14 )); then echo "FAIL certificate expires in $days days"; fail=1; else echo "ok   certificate: $days days left"; fi
exit $fail
