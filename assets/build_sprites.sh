#!/bin/bash
# Converts every green-screen animation clip into transparent frames + a horizontal sprite sheet.
cd /e/RushRoyaleTD/assets
for dir in units units_awakened units_hd heroes heroes_hd monsters monsters_hd bosses bosses_hd vfx; do
  for f in animations/$dir/*.mp4; do
    [ -f "$f" ] || continue
    n=$(basename "$f" .mp4); out="sprites/$dir/$n"
    [ -f "${out}_sheet.png" ] && continue
    size=256; [[ $dir == *_hd ]] && size=384
    python tospritesheet.py "$f" "$out" 16 $size >/dev/null 2>&1 || echo "FAIL $f"
  done
done
echo DONE; ls sprites/*/ | grep -c _sheet.png
