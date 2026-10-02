#!/usr/bin/env bash
set -Eeuo pipefail
umask 022
repository=${1:?Repository required}
revision=${2:?Git revision required}
[[ "$revision" =~ ^[0-9a-f]{40}$ ]]
base=/opt/pizza-manager-platform
old=$(readlink -f "$base/current")
case "$old" in "$base"/releases/*) ;; *) echo 'Unexpected platform release' >&2; exit 1 ;; esac
exec 8>"$base/deploy.lock"
flock -n 8 || { echo 'Another platform deployment is running' >&2; exit 1; }
test -f "$repository/deploy/extra-toppings.json"
if grep -Fq "'green-olive','tomato','roasted-pepper','pineapple'" "$old/shared/domain.ts"; then
  echo 'Additional ingredient shapes are already supported.'
  exit 0
fi
release_id=$(date -u +%Y%m%dT%H%M%SZ)
release="$base/releases/$release_id"
backup="$base/backups/$release_id"
test ! -e "$release" && test ! -e "$backup"
install -d -m 755 "$release"
install -d -m 700 "$backup"
printf '%s\n' "$old" > "$backup/previous-release.txt"
cp -p "$old/shared/domain.ts" "$backup/domain.ts"
cp -p "$old/admin/main.tsx" "$backup/admin-main.tsx"
switched=0
atomic_link() {
  ln -s -- "$1" "$base/current.next.$$"
  mv -Tf -- "$base/current.next.$$" "$base/current"
}
recover() {
  status=$?
  trap - EXIT
  if (( status != 0 && switched )); then
    atomic_link "$old"
    systemctl restart pizza-manager-platform.service
    echo 'Ingredient support activation failed; restored the previous platform release.' >&2
  fi
  exit "$status"
}
trap recover EXIT
catalog_before=$(curl -fsS --max-time 20 https://lawebs.co.il/PizzaManager/api/public/shops/oven-demo | sha256sum | cut -d' ' -f1)
source_before=$(sha256sum "$old/shared/domain.ts" "$old/admin/main.tsx")
# Copy the exact active runtime, including the existing storefront symlink.
cp -a --reflink=auto "$old/." "$release/"
node "$repository/deploy/platform-toppings.mjs" "$old" "$release" "$repository/deploy/extra-toppings.json"
test "$(readlink -f "$release/storefront")" = "$(readlink -f "$old/storefront")"
set -a
source /etc/pizza-manager-platform.env
set +a
cd "$release"
npm run build
printf '%s\n' "$release_id" > "$release/version.txt"
printf '%s\n' "$revision" > "$release/topping-support-version.txt"
chmod -R a+rX "$release"
test "$source_before" = "$(sha256sum "$old/shared/domain.ts" "$old/admin/main.tsx")"
test "$(readlink -f "$base/current")" = "$old"
atomic_link "$release"
switched=1
systemctl restart pizza-manager-platform.service
for attempt in $(seq 1 15); do
  if curl -fsS --max-time 3 http://127.0.0.1:4180/PizzaManager/api/health >/dev/null; then break; fi
  sleep 1
done
curl -fsS --max-time 10 https://lawebs.co.il/PizzaManager/api/health
test "$catalog_before" = "$(curl -fsS --max-time 20 https://lawebs.co.il/PizzaManager/api/public/shops/oven-demo | sha256sum | cut -d' ' -f1)"
test "$(curl -fsS --max-time 10 https://lawebs.co.il/PizzaManager/version.txt)" = "$release_id"
systemctl is-active --quiet pizza-manager-platform.service
echo "Ingredient support active in $release_id; catalog, storefront, orders and settings preserved."
