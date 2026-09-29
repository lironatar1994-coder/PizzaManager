# Opening screen release

The local demo loads `src/opening.css` separately. The managed platform receives the same CSS appended to its incumbent stylesheet, and only the opening block of `src/app.js` is adapted.

After checking and archiving an exact Git revision, extract it into an inactive incoming directory and run:

```sh
bash /absolute/path/to/repository/deploy/platform-opening.sh /absolute/path/to/repository <40-character-git-revision>
```

The helper locks platform deployment, copies the active storefront, adds the new photo/font/icon assets, and compiles into that inactive copy. The compiler verifies that all JavaScript outside the opening block is unchanged before updating import cache tags. Live menu code and tenant data remain the source of truth.

Before activation, source hashes and the current backend/storefront targets must still match. After the atomic storefront switch, the helper checks health, the served app/CSS hashes, the new assets, and the public demo catalog hash. Any verification failure after switching restores the previous storefront. The previous target is recorded in `/opt/pizza-manager/platform-ui-backups/<backend-release>.previous` for the existing frontend rollback flow.

This release does not update the backend, admin app, order database, or tenant catalog. Subsequent menu-only releases preserve the opening block and its CSS.

## Local adapter check

Compile a separate inactive copy of actual platform source with:

```sh
node deploy/platform-opening.mjs <repository> <source-storefront> <inactive-copy> <40-character-git-revision>
```

The source and output must be different directories. The compiler also executes the adapted opening in an isolated context for the demo, a configured tenant logo, and an empty catalog, checking rendered photo, logo and symbol URL interpolation before activation. `node scripts/check.mjs` verifies the static demo and its existing bundle/pricing/privacy gates; browser checks cover the opening at 390×844, 320×568, 390×600, 844×390, and 1265×711.
