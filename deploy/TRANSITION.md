# Navigation release

`src/navigation.js` supplies the short pizza cue for the opening-to-menu or product route. It renders the next page immediately, retains the existing native view transition on routine routes, cancels a cue on subsequent navigation, and skips animation for reduced motion. The local demo loads `src/navigation.css` separately.

Archive an exact Git revision, verify the archive checksum, extract it to an inactive incoming directory, then run:

```sh
bash /absolute/path/to/repository/deploy/platform-transition.sh /absolute/path/to/repository <40-character-git-revision>
```

The helper locks deployment and copies the currently active storefront. The compiler adds only the navigator import/declaration and replaces `navigate()`, checking that all other app source is byte-identical before cache tags are refreshed. It adds the isolated navigation stylesheet before the opening stylesheet marker, so subsequent opening releases preserve it, and copies the navigator module plus the existing pizza photo and its provenance. Opening, menu, tenant settings, order/payment adapters and shared runtime stay incumbent.

Before activation, source hashes and backend/storefront targets must still match. The helper switches the storefront symlink atomically, then verifies health, the served app/styles/navigation and photo hashes, the entry cache tag, and the unchanged public catalog. Failure after activation restores the previous storefront. The previous path is retained in `/opt/pizza-manager/platform-ui-backups/<backend-release>.previous`.

## Inactive compiler check

```sh
node deploy/platform-transition.mjs <repository> <source-storefront> <inactive-copy> <40-character-git-revision>
node scripts/navigation-check.mjs
```

The compiler executes the adapted route selection across opening/menu/product/cart/checkout/status cases and runs the navigator behavior checks on the emitted module. Browser checks still verify the actual animation, interaction and reduced-motion experience before release is declared complete. This helper performs no backend, admin, order database or catalog writes.
