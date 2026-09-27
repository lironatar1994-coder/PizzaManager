#!/usr/bin/env bash
set -euo pipefail
umask 022

base=/opt/pizza-manager
site_link=/etc/nginx/sites-enabled/lawebs.co.il.conf
snippet=/etc/nginx/snippets/pizza-manager-locations.conf
include_line='    include /etc/nginx/snippets/pizza-manager-locations.conf;'
url=https://lawebs.co.il/PizzaManager
action=${1:-}

install -d -m 755 "$base" "$base/incoming" "$base/releases" "$base/backups"
exec 9>"$base/deploy.lock"
flock -n 9 || { echo 'Another PizzaManager deployment is running' >&2; exit 1; }

atomic_link() {
    local target=$1 destination=$2 next
    next="${destination}.next.$$"
    ln -s -- "$target" "$next"
    mv -Tf -- "$next" "$destination"
}

verify_web() {
    local expected=$1 actual
    actual=$(curl -fs --max-time 20 "$url/version.txt" | tr -d '\r\n') || return 1
    test "$actual" = "$expected" || return 1
    curl -fs --max-time 20 "$url/" | grep -q 'noindex,nofollow'
    curl -fs --max-time 20 -o /dev/null "$url/src/app.js"
    curl -fs --max-time 20 -o /dev/null "$url/src/styles.css"
    curl -fs --max-time 20 -o /dev/null "$url/assets/pizza-hero-mobile.jpg"
}

verify_with_retries() {
    local expected=$1 attempt
    for attempt in 1 2 3 4 5; do
        if verify_web "$expected"; then return 0; fi
        sleep 2
    done
    echo "Could not verify public revision $expected" >&2
    return 1
}

if [[ "$action" == rollback ]]; then
    test -L "$base/current" && test -L "$base/previous" || { echo 'No rollback release exists' >&2; exit 1; }
    current=$(readlink "$base/current")
    previous=$(readlink "$base/previous")
    case "$current" in "$base"/releases/*) ;; *) echo 'Unexpected current target' >&2; exit 1 ;; esac
    case "$previous" in "$base"/releases/*) ;; *) echo 'Unexpected previous target' >&2; exit 1 ;; esac
    atomic_link "$previous" "$base/current"
    if ! verify_with_retries "$(basename "$previous")"; then
        atomic_link "$current" "$base/current"
        echo 'Rollback verification failed; restored prior live release' >&2
        exit 1
    fi
    atomic_link "$current" "$base/previous"
    echo "Rolled back to $(basename "$previous")"
    exit 0
fi

[[ "$action" == deploy ]] || { echo 'Usage: deploy_linux.sh deploy REVISION SHA256 | rollback' >&2; exit 2; }
revision=${2:-}
digest=${3:-}
[[ "$revision" =~ ^[0-9a-f]{40}$ && "$digest" =~ ^[0-9a-f]{64}$ ]] || { echo 'Invalid revision or digest' >&2; exit 2; }
archive="$base/incoming/$revision.tar.gz"
test -f "$archive" || { echo 'Missing release archive' >&2; exit 1; }
printf '%s  %s\n' "$digest" "$archive" | sha256sum -c -

stage=$(mktemp -d "$base/.stage.XXXXXXXX")
site=$(readlink -f "$site_link")
test "$site" = /etc/nginx/sites-available/lawebs.co.il.conf || { echo 'Unexpected Nginx site target' >&2; exit 1; }
old_target=$(readlink "$base/current" 2>/dev/null || true)
if [[ -n "$old_target" ]]; then
    case "$old_target" in "$base"/releases/*) ;; *) echo 'Unexpected current release target' >&2; exit 1 ;; esac
fi
site_backup=
snippet_backup=
snippet_created=0
switched=0
release_tmp=

recover() {
    local status=$?
    trap - EXIT
    if (( status != 0 )); then
        echo 'Deployment failed; restoring previous site state' >&2
        if (( switched )); then
            if [[ -n "$old_target" ]]; then atomic_link "$old_target" "$base/current"; else rm -f -- "$base/current"; fi
        fi
        if [[ -n "$site_backup" ]]; then cp -p -- "$site_backup" "$site"; fi
        if [[ -n "$snippet_backup" ]]; then cp -p -- "$snippet_backup" "$snippet"; fi
        if (( snippet_created )); then rm -f -- "$snippet"; fi
        nginx -t && systemctl reload nginx || true
    fi
    if [[ -n "$release_tmp" ]]; then
        case "$release_tmp" in "$base"/releases/.*.next.*) rm -rf -- "$release_tmp" ;; esac
    fi
    case "$stage" in "$base"/.stage.*) rm -rf -- "$stage" ;; esac
    exit "$status"
}
trap recover EXIT

tar -xzf "$archive" -C "$stage"
test -f "$stage/index.html" && test -d "$stage/src" && test -d "$stage/assets" && test -f "$stage/deploy/pizza-manager-locations.conf" || {
    echo 'Archive lacks runtime files' >&2; exit 1;
}
grep -q 'noindex,nofollow' "$stage/index.html" || { echo 'Demo index safeguard missing' >&2; exit 1; }
grep -q 'demoOnly: true' "$stage/src/data.js" || { echo 'Demo-only safeguard missing' >&2; exit 1; }

release="$base/releases/$revision"
if [[ ! -e "$release" ]]; then
    release_tmp="$base/releases/.${revision}.next.$$"
    install -d -m 755 "$release_tmp"
    install -m 644 "$stage/index.html" "$release_tmp/index.html"
    cp -a -- "$stage/src" "$release_tmp/src"
    cp -a -- "$stage/assets" "$release_tmp/assets"
    printf '%s\n' "$revision" > "$release_tmp/version.txt"
    chmod -R a+rX "$release_tmp"
    mv -T -- "$release_tmp" "$release"
    release_tmp=
else
    test "$(cat "$release/version.txt")" = "$revision" || { echo 'Existing release is incomplete' >&2; exit 1; }
fi

if [[ ! -e "$snippet" ]]; then
    snippet_created=1
elif ! cmp -s "$stage/deploy/pizza-manager-locations.conf" "$snippet"; then
    snippet_backup="$base/backups/pizza-manager-locations.$(date +%Y%m%d-%H%M%S).conf"
    cp -p -- "$snippet" "$snippet_backup"
fi
install -m 644 "$stage/deploy/pizza-manager-locations.conf" "$snippet"

if ! grep -Fq "$include_line" "$site"; then
    test "$(grep -Fc '    location / {' "$site")" = 1 || { echo 'Cannot locate unique LAwebs root location' >&2; exit 1; }
    site_backup="$base/backups/lawebs.$(date +%Y%m%d-%H%M%S).conf"
    cp -p -- "$site" "$site_backup"
    python3 - "$site" "$include_line" <<'PY'
from pathlib import Path
import sys
path = Path(sys.argv[1])
include = sys.argv[2]
text = path.read_text()
needle = '    location / {'
if text.count(needle) != 1:
    raise SystemExit('LAwebs root location is ambiguous')
path.write_text(text.replace(needle, include + '\n\n' + needle, 1))
PY
fi

nginx -t
atomic_link "$release" "$base/current"
switched=1
systemctl reload nginx
verify_with_retries "$revision"
if [[ -n "$old_target" && "$old_target" != "$release" ]]; then atomic_link "$old_target" "$base/previous"; fi
echo "Deployed https://lawebs.co.il/PizzaManager/ ($revision)"
