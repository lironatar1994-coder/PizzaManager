# Concise storefront copy

The ordering UI uses short nouns for its sections: size, dough, extras, address and contact details. Product identity, selected configuration, quantities, prices, availability, errors and payment state stay visible. Introductory instructions and placeholder summaries do not occupy the ordering flow.

- A pizza with no selected extras has no preview helper sentence or default crust caption.
- Size cards show only the size and price, with a small pizza image. Measurements, slice counts and audience descriptions stay in managed data. Crust cards show the choice and any extra price.
- Basket and projected totals are inside the price breakdown, keeping the fixed builder action focused on one price. On desktop the action is aligned to the choices column.
- On mobile, the live pizza and price/add action share one floating unit with a single outer shadow. The pizza area is about one quarter of the viewport height. The same SVG moves from the desktop column, so it does not leave an empty block above the choices. The panel can be minimized, opens the existing half editor on tap and temporarily folds while the keyboard is open. Its measured height keeps the last fields scrollable above it; the wrapper leaves price breakdowns unclipped.
- The product description stays in managed catalog data. It is not printed as an introduction to the builder. Real menu descriptions and bundle contents remain available; generic size-selection instructions are omitted.
- Optional item names and kitchen notes share a collapsed section. Existing names and notes open it automatically.
- Address-provider attribution and its data disclosure are available inside a native details control. Address validation, service-area restrictions, delivery minimum and unknown delivery fees remain explicit.
- Saving, sharing and repeating retain their controls and exception messages. Normal explanatory paragraphs are omitted or shortened.
- Demo and payment notices remain explicit. They are product state, not help copy.

`storefront-copy.mjs` applies the same copy edits to the current production storefront during the guarded UI deployment. This avoids replacing the platform's tenant, checkout, payment or order-status adapters. `DEPLOY.PS1 -Target Prod` can run from an isolated clean checkout whose commit exactly matches GitHub main; publication to GitHub still requires main.
