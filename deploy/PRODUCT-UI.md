# Product customizer release

The mobile customizer keeps one existing live pizza SVG and its order action at the bottom. Its quantity and price controls move with their existing listeners; desktop and teardown restore their original DOM positions. The warm cream surface and compact topping cards live in `src/floating-preview.css`.

This release uses a narrow adapter rather than the broader menu/customer release. Archive an exact Git revision, verify the archive checksum and extract it into an inactive incoming directory, then run:

```sh
bash /absolute/path/to/repository/deploy/platform-product.sh /absolute/path/to/repository <40-character-git-revision>
```

The compiler replaces exactly one marked floating preview CSS block in the currently active storefront and copies `src/floating-preview.js`. The platform's earlier quantity control delegates clicks through the form; the adapter moves its exact existing handler body onto the quantity element and scopes its three display queries to that element, so the control remains functional in the dock. Its arithmetic, draft, price and cart code remain identical. The adapter also changes only the floating module import cache query and the two entry cache queries. Restoring those exact presentation edits must reproduce the original app byte-for-byte. All other stylesheet blocks, modules, catalog assets and shared platform adapters remain byte-identical. The new scoped manifest is `/PizzaManager/assets/product-ui-version.json`; older surface manifests retain their original release identity.

The helper locks platform deployment, prepares a copy and rechecks source hashes, backend/frontend targets and the public catalog before activation. It switches an existing symlink atomically. When the platform initially owns a real storefront directory, Linux rename exchange switches it atomically and retains the entire original directory. Served app, stylesheet, module and pizza photo hashes, health, service and unchanged catalog are checked after activation. Any failure restores the previous storefront. The rollback path is saved in `/opt/pizza-manager/platform-ui-backups/<backend-release>.previous`.

An inactive compiler check uses a full copy of the current storefront:

```sh
node deploy/platform-product.mjs <repository> <current-storefront> <inactive-copy> <40-character-git-revision>
```

Compile that output into a second inactive copy with the same arguments/revision and compare the four emitted files and manifest to confirm idempotence. Browser verification covers real topping updates, placement/half prices, quantity, preview collapse/expand, keyboard/layout behavior and cart preservation before the release is reported complete. The release does not write backend, admin, catalog, payment or order data.
