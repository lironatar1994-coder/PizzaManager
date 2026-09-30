#!/usr/bin/env bash
set -euo pipefail
umask 022

base=/opt/pizza-manager
platform=/opt/pizza-manager-platform
url=https://lawebs.co.il/PizzaManager
repository=${1:-}
revision=${2:-}
[[ "$revision" =~ ^[0-9a-f]{40}$ ]] && test -f "$repository/deploy/platform-product.mjs"
exec 8>"$platform/deploy.lock"
flock -n 8 || { echo 'A platform deployment is already running' >&2; exit 1; }
backend=$(readlink -f "$platform/current")
case "$backend" in "$platform"/releases/*) ;; *) echo 'Unexpected backend release' >&2; exit 1 ;; esac
storefront="$backend/storefront"
test -d "$storefront" && systemctl is-active --quiet pizza-manager-platform.service
old_target=$(readlink -f "$storefront")
case "$old_target" in "$storefront"|"$base"/platform-ui-releases/*|"$backend"/.storefront.original.*) ;; *) echo 'Unexpected storefront target' >&2; exit 1 ;; esac
install -d -m 755 "$base/platform-ui-releases" "$base/platform-ui-backups"
state="$base/platform-ui-backups/$(basename "$backend")"
switched=0

catalog_hash() {
  curl -fsS --max-time 20 "$url/api/public/shops/oven-demo" | python3 -c 'import sys,json,hashlib; print(hashlib.sha256(json.dumps(json.load(sys.stdin),sort_keys=True,separators=(",",":")).encode()).hexdigest())'
}
atomic_link() { local next="${2}.next.$$"; ln -s -- "$1" "$next"; mv -Tf -- "$next" "$2"; }
source_fingerprint() { find "$old_target" -type f -print0 | sort -z | xargs -0 sha256sum; }
recover() {
  local status=$?
  trap - EXIT
  if (( status != 0 && switched )); then
    atomic_link "$old_target" "$storefront"
    echo 'Restored previous storefront after failed product UI verification' >&2
  fi
  exit "$status"
}
trap recover EXIT
verify() {
  local actual remote file
  curl -fsS --max-time 20 "$url/api/health" | python3 -c 'import json,sys; assert json.load(sys.stdin)["ok"]'
  actual=$(curl -fsS --max-time 20 "$url/assets/product-ui-version.json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["revision"])')
  test "$actual" = "$revision"
  curl -fsS --max-time 20 "$url/p/oven-demo/" | grep -F "product1-${revision:0:12}" >/dev/null
  for file in src/app.js src/styles.css src/floating-preview.js; do
    remote=$(curl -fsS --max-time 20 "$url/storefront/$file?v=$revision" | sha256sum | cut -d' ' -f1)
    test "$remote" = "$(sha256sum "$storefront/$file" | cut -d' ' -f1)"
  done
  for file in assets/pizza-base-v2.webp assets/pizza-base-thin-v2.webp; do
    remote=$(curl -fsS --max-time 20 "$url/$file" | sha256sum | cut -d' ' -f1)
    test "$remote" = "$(sha256sum "$storefront/$file" | cut -d' ' -f1)"
  done
  systemctl is-active --quiet pizza-manager-platform.service
  test "$(readlink -f "$platform/current")" = "$backend"
}

if [[ -f "$storefront/assets/product-ui-version.json" ]] && [[ "$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["revision"])' "$storefront/assets/product-ui-version.json")" == "$revision" ]]; then
  verify
  echo "Product UI $revision is already active."
  exit 0
fi

catalog_before=$(catalog_hash)
source_hash=$(source_fingerprint)
release=$(mktemp -d "$base/platform-ui-releases/$(basename "$backend")-product-$revision.XXXXXXXX")
cp -a -- "$storefront/." "$release/"
node "$repository/deploy/platform-product.mjs" "$repository" "$old_target" "$release" "$revision"
chmod -R a+rX "$release"
test "$source_hash" = "$(source_fingerprint)" || { echo 'Storefront source changed during preparation' >&2; exit 1; }
test "$(readlink -f "$platform/current")" = "$backend" || { echo 'Backend changed during preparation' >&2; exit 1; }
test "$(readlink -f "$storefront")" = "$old_target" || { echo 'Frontend changed during preparation' >&2; exit 1; }
test "$catalog_before" = "$(catalog_hash)" || { echo 'Managed catalog changed during preparation' >&2; exit 1; }
if [[ -L "$storefront" ]]; then
  atomic_link "$release" "$storefront"
  switched=1
else
  # The initial platform release may own a real directory. Atomic exchange
  # preserves that whole directory and avoids a gap in the public route.
  next="$backend/.storefront.next.$$"
  ln -s -- "$release" "$next"
  python3 - "$next" "$storefront" <<'PY'
import ctypes, os, sys
libc = ctypes.CDLL(None, use_errno=True)
if libc.renameat2(-100, os.fsencode(sys.argv[1]), -100, os.fsencode(sys.argv[2]), 2):
    raise OSError(ctypes.get_errno(), 'Atomic storefront exchange failed')
PY
  old_target="$next"
  switched=1
  original="$backend/.storefront.original.product.$(date -u +%Y%m%dT%H%M%SZ).$$"
  mv -T -- "$next" "$original"
  old_target="$original"
fi
verify
test "$catalog_before" = "$(catalog_hash)" || { echo 'Managed catalog changed; reverting frontend' >&2; exit 1; }
printf '%s\n' "$old_target" > "$state.previous.next"
mv -Tf -- "$state.previous.next" "$state.previous"
atomic_link "$release" "$state.current"
echo "Deployed product UI $revision; catalog unchanged; incumbent app logic, backend, cart and payment adapters preserved."
