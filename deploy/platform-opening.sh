#!/usr/bin/env bash
set -euo pipefail
umask 022
base=/opt/pizza-manager
platform=/opt/pizza-manager-platform
url=https://lawebs.co.il/PizzaManager
repository=${1:-}
revision=${2:-}
[[ "$revision" =~ ^[0-9a-f]{40}$ ]] && test -f "$repository/deploy/platform-opening.mjs"
backend=$(readlink -f "$platform/current")
case "$backend" in "$platform"/releases/*) ;; *) echo 'Unexpected backend release' >&2; exit 1 ;; esac
storefront="$backend/storefront"
test -L "$storefront" && systemctl is-active --quiet pizza-manager-platform.service
exec 8>"$platform/deploy.lock"
flock -n 8 || { echo 'A platform deployment is already running' >&2; exit 1; }
old_target=$(readlink -f "$storefront")
case "$old_target" in "$base"/platform-ui-releases/*|"$backend"/.storefront.original.*) ;; *) echo 'Unexpected storefront' >&2; exit 1 ;; esac
catalog_hash() {
  curl -fsS --max-time 20 "$url/api/public/shops/oven-demo" | python3 -c 'import sys,json,hashlib; print(hashlib.sha256(json.dumps(json.load(sys.stdin),sort_keys=True,separators=(",",":")).encode()).hexdigest())'
}
atomic_link() { local next="${2}.next.$$"; ln -s -- "$1" "$next"; mv -Tf -- "$next" "$2"; }
switched=0
recover() { local status=$?; trap - EXIT; if (( status != 0 && switched )); then atomic_link "$old_target" "$storefront"; echo 'Restored previous storefront after failed opening verification' >&2; fi; exit "$status"; }
trap recover EXIT
catalog_before=$(catalog_hash)
source_hash=$(sha256sum "$storefront/src/app.js" "$storefront/src/styles.css" "$storefront/index.html")
install -d -m 755 "$base/platform-ui-releases" "$base/platform-ui-backups"
release=$(mktemp -d "$base/platform-ui-releases/$(basename "$backend")-opening-$revision.XXXXXXXX")
cp -a -- "$storefront/." "$release/"
install -d -m 755 "$release/assets/fonts"
for photo in mobile desktop; do
  install -m 644 "$repository/assets/hero-pizzeria-$photo-v2.webp" "$release/assets/"
  install -m 644 "$repository/assets/hero-pizzeria-$photo-v2.webp.json" "$release/assets/"
done
install -m 644 "$repository/assets/fonts/heebo-900.woff" "$release/assets/fonts/"
install -m 644 "$repository/assets/fonts/Heebo-OFL.txt" "$release/assets/fonts/"
install -m 644 "$repository/assets/brand/oven-mark-luxury.svg" "$release/assets/brand/"
node "$repository/deploy/platform-opening.mjs" "$repository" "$old_target" "$release" "$revision"
chmod -R a+rX "$release"
test "$source_hash" = "$(sha256sum "$storefront/src/app.js" "$storefront/src/styles.css" "$storefront/index.html")" || { echo 'Source changed during preparation' >&2; exit 1; }
test "$(readlink -f "$platform/current")" = "$backend"
test "$(readlink -f "$storefront")" = "$old_target"
atomic_link "$release" "$storefront"
switched=1
curl -fsS --max-time 20 "$url/api/health" | python3 -c 'import json,sys; assert json.load(sys.stdin)["ok"]'
curl -fsS --max-time 20 "$url/p/oven-demo/" | grep -F "opening1-${revision:0:12}" >/dev/null
for file in src/app.js src/styles.css; do
  remote=$(curl -fsS --max-time 20 "$url/storefront/$file?v=$revision" | sha256sum | cut -d' ' -f1)
  test "$remote" = "$(sha256sum "$storefront/$file" | cut -d' ' -f1)"
done
for asset in hero-pizzeria-mobile-v2.webp hero-pizzeria-desktop-v2.webp fonts/heebo-900.woff brand/oven-mark-luxury.svg; do
  curl -fsS --max-time 20 -o /dev/null "$url/assets/$asset"
done
test "$catalog_before" = "$(catalog_hash)" || { echo 'Managed catalog changed; reverting frontend' >&2; exit 1; }
state="$base/platform-ui-backups/$(basename "$backend")"
printf '%s\n' "$old_target" > "$state.previous.next"
mv -Tf -- "$state.previous.next" "$state.previous"
atomic_link "$release" "$state.current"
echo "Deployed opening $revision; live menu, catalog and backend preserved."
