#!/usr/bin/env bash
set -euo pipefail
umask 022

base=/opt/pizza-manager
platform=/opt/pizza-manager-platform
url=https://lawebs.co.il/PizzaManager
action=${1:-}
backend=$(readlink -f "$platform/current")
case "$backend" in "$platform"/releases/*) ;; *) echo 'Unexpected active platform release' >&2; exit 1 ;; esac
test -d "$backend/storefront" && systemctl is-active --quiet pizza-manager-platform.service
exec 8>"$platform/deploy.lock"
flock -n 8 || { echo 'A platform deployment is already running' >&2; exit 1; }
install -d -m 755 "$base/platform-ui-releases" "$base/platform-ui-backups"
state="$base/platform-ui-backups/$(basename "$backend")"
storefront="$backend/storefront"
previous="$state.previous"
old_target=$(readlink -f "$storefront")
switched=0
product_stage=

validate_target() {
  case "$1" in "$base"/platform-ui-releases/*|"$backend"/.storefront.original.*) test -d "$1" ;; *) echo 'Unexpected storefront target' >&2; return 1 ;; esac
}
atomic_link() {
  local target=$1 destination=$2 next="${2}.next.$$"
  ln -s -- "$target" "$next"
  mv -Tf -- "$next" "$destination"
}
activate() {
  local target=$1 next="$backend/.storefront.next.$$"
  validate_target "$target"
  test "$(readlink -f "$platform/current")" = "$backend" || { echo 'Platform changed during UI preparation' >&2; return 1; }
  if [[ -L "$storefront" ]]; then
    atomic_link "$target" "$storefront"
  else
    # Linux rename exchange swaps the original directory and the prepared link
    # atomically. Keep the entire original storefront as a rollback target.
    ln -s -- "$target" "$next"
    python3 - "$next" "$storefront" <<'PY'
import ctypes, os, sys
libc = ctypes.CDLL(None, use_errno=True)
if libc.renameat2(-100, os.fsencode(sys.argv[1]), -100, os.fsencode(sys.argv[2]), 2):
    raise OSError(ctypes.get_errno(), 'Atomic storefront exchange failed')
PY
    old_target="$next"
    switched=1
    original="$backend/.storefront.original.$(date -u +%Y%m%dT%H%M%SZ)"
    mv -T -- "$next" "$original"
    old_target="$original"
  fi
  switched=1
}
catalog_hash() {
  curl -fsS --max-time 20 "$url/api/public/shops/oven-demo" | python3 -c 'import sys,json,hashlib; print(hashlib.sha256(json.dumps(json.load(sys.stdin),sort_keys=True,separators=(",",":")).encode()).hexdigest())'
}
verify() {
  local expected=${1:-} actual remote product_revision
  curl -fsS --max-time 20 "$url/api/health" | python3 -c 'import json,sys; assert json.load(sys.stdin)["ok"]'
  curl -fsS --max-time 20 "$url/p/oven-demo/" | grep -q '/storefront/src/app.js'
  if [[ -n "$expected" ]]; then
    actual=$(curl -fsS --max-time 20 "$url/assets/menu-ui-version.json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["revision"])')
    test "$actual" = "$expected"
    remote=$(curl -fsS --max-time 20 "$url/storefront/src/app.js?v=$expected" | sha256sum | cut -d' ' -f1)
    test "$remote" = "$(sha256sum "$storefront/src/app.js" | cut -d' ' -f1)"
    remote=$(curl -fsS --max-time 20 "$url/storefront/src/styles.css?v=$expected" | sha256sum | cut -d' ' -f1)
    test "$remote" = "$(sha256sum "$storefront/src/styles.css" | cut -d' ' -f1)"
    if [[ -f "$storefront/src/customer-flow.js" ]]; then
      remote=$(curl -fsS --max-time 20 "$url/storefront/src/customer-flow.js?v=$expected" | sha256sum | cut -d' ' -f1)
      test "$remote" = "$(sha256sum "$storefront/src/customer-flow.js" | cut -d' ' -f1)"
    fi
    if [[ -f "$storefront/assets/product-ui-version.json" ]]; then
      product_revision=$(curl -fsS --max-time 20 "$url/assets/product-ui-version.json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["revision"])')
      test "$product_revision" = "$expected"
      curl -fsS --max-time 20 "$url/p/oven-demo/" | grep -F "product1-${expected:0:12}" >/dev/null
    fi
    curl -fsS --max-time 20 -o /dev/null "$url/assets/menu-pizza-v1.webp"
    if grep -q 'menu-pizza-editorial-v2.webp' "$storefront/src/app.js"; then
      curl -fsS --max-time 20 -o /dev/null "$url/assets/menu-pizza-editorial-v2.webp"
    fi
    curl -fsS --max-time 20 -o /dev/null "$url/assets/hero-vapor-mobile-v1.mp4"
    curl -fsS --max-time 20 -o /dev/null "$url/assets/hero-vapor-desktop-v1.mp4"
  fi
}
recover() {
  local status=$?
  trap - EXIT
  if [[ -n "$product_stage" ]]; then
    case "$product_stage" in "$base"/.product-ui.*) rm -rf -- "$product_stage" ;; esac
  fi
  if (( status != 0 && switched )); then
    atomic_link "$old_target" "$storefront"
    echo 'Frontend activation failed; restored the previous platform storefront' >&2
  fi
  exit "$status"
}
trap recover EXIT

if [[ "$action" == rollback ]]; then
  test -L "$storefront" && test -f "$previous" || { echo 'No platform frontend rollback exists' >&2; exit 1; }
  target=$(cat "$previous")
  validate_target "$target"
  activate "$target"
  expected=
  if [[ -f "$target/assets/menu-ui-version.json" ]]; then expected=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["revision"])' "$target/assets/menu-ui-version.json"); fi
  verify "$expected"
  printf '%s\n' "$old_target" > "$previous.next"
  mv -Tf -- "$previous.next" "$previous"
  echo "Restored platform storefront $target"
  exit 0
fi

[[ "$action" == deploy ]] || { echo 'Usage: platform-ui.sh deploy REPOSITORY REVISION | rollback' >&2; exit 2; }
repository=${2:-}
revision=${3:-}
[[ "$revision" =~ ^[0-9a-f]{40}$ ]] && test -f "$repository/deploy/platform-storefront.mjs"
catalog_before=$(catalog_hash)
if [[ -f "$storefront/assets/menu-ui-version.json" ]]; then
  active_revision=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["revision"])' "$storefront/assets/menu-ui-version.json")
  if [[ "$active_revision" == "$revision" ]]; then
    verify "$revision"
    echo "Platform menu $revision is already active; catalog preserved."
    exit 0
  fi
fi
source_hash=$(sha256sum "$storefront/src/app.js" "$storefront/src/styles.css" "$storefront/index.html")
release=$(mktemp -d "$base/platform-ui-releases/$(basename "$backend")-$revision.XXXXXXXX")
cp -a -- "$storefront/." "$release/"
for photo in pizza garlic family combo; do
  install -m 644 "$repository/assets/menu-$photo-v1.webp" "$release/assets/"
  install -m 644 "$repository/assets/menu-$photo-v1.webp.json" "$release/assets/"
done
install -m 644 "$repository/assets/menu-pizza-editorial-v2.webp" "$release/assets/"
install -m 644 "$repository/assets/menu-pizza-editorial-v2.webp.json" "$release/assets/"
for viewport in mobile desktop; do
  install -m 644 "$repository/assets/hero-vapor-$viewport-v1.mp4" "$release/assets/"
  install -m 644 "$repository/assets/hero-vapor-$viewport-v1.mp4.json" "$release/assets/"
done
node "$repository/deploy/platform-storefront.mjs" "$repository" "$old_target" "$release" "$revision"
# The product-customizer release is authored independently of the menu. Apply
# it to an inactive copy so both current surfaces reach production together.
product_stage=$(mktemp -d "$base/.product-ui.XXXXXXXX")
cp -a -- "$release/." "$product_stage/"
node "$repository/deploy/platform-product.mjs" "$repository" "$release" "$product_stage" "$revision"
for file in src/app.js src/styles.css src/floating-preview.js index.html assets/product-ui-version.json; do
  install -m 644 "$product_stage/$file" "$release/$file"
done
chmod -R a+rX "$release"
test -f "$release/assets/product-ui-version.json"
test "$source_hash" = "$(sha256sum "$storefront/src/app.js" "$storefront/src/styles.css" "$storefront/index.html")" || { echo 'Storefront source changed during preparation' >&2; exit 1; }
activate "$release"
verify "$revision"
test "$catalog_before" = "$(catalog_hash)" || { echo 'Managed catalog changed during deployment; restoring UI' >&2; exit 1; }
printf '%s\n' "$old_target" > "$previous.next"
mv -Tf -- "$previous.next" "$previous"
atomic_link "$release" "$state.current"
echo "Deployed platform menu $revision; catalog unchanged; backend and orders preserved."
