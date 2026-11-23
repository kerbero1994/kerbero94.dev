#!/usr/bin/env bash
# Prints cv/cv.html to site/eduardo-gonzalez-cv.pdf with headless Chrome: tagged PDF,
# no header or footer. Then update the size on the résumé button if the test asks for it.
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME=${CHROME:-"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}
profile=$(mktemp -d)
"$CHROME" --headless --disable-gpu --no-pdf-header-footer --generate-pdf-document-outline \
  --user-data-dir="$profile" --print-to-pdf=site/eduardo-gonzalez-cv.pdf "file://$PWD/cv/cv.html" 2>/dev/null
rm -rf "$profile"
ls -l site/eduardo-gonzalez-cv.pdf
