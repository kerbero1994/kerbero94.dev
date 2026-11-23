#!/usr/bin/env bash
# DNS hardening for kerbero94.dev. Reported as warnings until each record exists;
# set STRICT=1 to fail once they're all in place.
set -uo pipefail
D=kerbero94.dev; missing=0
note() { if [[ "$2" == ok ]]; then echo "ok   $1"; else echo "::warning::$1 missing"; missing=1; fi; }
[[ -n "$(dig +short CAA $D @1.1.1.1)" ]] && note "CAA (which CAs may issue)" ok || note "CAA (which CAs may issue)" no
dig +dnssec SOA $D @1.1.1.1 | grep -q 'flags:.* ad' && note "DNSSEC" ok || note "DNSSEC" no
dig +short TXT _dmarc.$D @1.1.1.1 | grep -q 'v=DMARC1' && note "DMARC" ok || note "DMARC" no
dig +short TXT $D @1.1.1.1 | grep -q 'v=spf1' && note "SPF" ok || note "SPF" no
[[ "${STRICT:-0}" == 1 ]] && exit $missing || exit 0
