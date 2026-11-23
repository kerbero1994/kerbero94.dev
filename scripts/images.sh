#!/usr/bin/env bash
# Responsive variants for every original in site/img (the originals stay as the <img src>
# fallback): AVIF and WebP at 480, 800, 1200, 1600 px and the source width, never wider than it.
# Needs ffmpeg (with libsvtav1), cwebp and sips (macOS). Run after adding or changing an image.
set -euo pipefail
cd "$(dirname "$0")/../site/img"
for src in *.jpg; do
  [[ "$src" =~ -[0-9]+\.jpg$ ]] && continue
  name=${src%.jpg}
  if [[ "$name" == *-poster ]]; then # a video poster can't be responsive: one 1200px WebP
    sips -s format png --resampleWidth 1200 "$src" --out "/tmp/$name.png" >/dev/null
    cwebp -quiet -q 80 -m 6 "/tmp/$name.png" -o "$name-1200.webp" && rm "/tmp/$name.png"
    continue
  fi
  full=$(sips -g pixelWidth "$src" | awk '/pixelWidth/{print $2}')
  for w in $(printf "%s\n" 480 800 1200 1600 "$full" | sort -nu); do
    (( w > full )) && continue
    ffmpeg -loglevel error -y -i "$src" -vf "scale=$w:-2:flags=lanczos" -frames:v 1 \
      -c:v libsvtav1 -crf 30 -preset 4 -pix_fmt yuv420p "$name-$w.avif" 2> >(grep -v "^Svt" >&2 || true)
    sips -s format png --resampleWidth "$w" "$src" --out "/tmp/$name-$w.png" >/dev/null
    cwebp -quiet -q 80 -m 6 "/tmp/$name-$w.png" -o "$name-$w.webp"
    rm "/tmp/$name-$w.png"
  done
done
