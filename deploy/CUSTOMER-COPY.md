# Concise storefront copy

The ordering UI uses short nouns for its sections: size, dough, extras, address and contact details. Product identity, selected configuration, quantities, prices, availability, errors and payment state stay visible. Introductory instructions and placeholder summaries do not occupy the ordering flow.

- A pizza with no selected extras has no preview helper sentence or default crust caption.
- The product description stays in managed catalog data. It is not printed as an introduction to the builder. Real menu descriptions and bundle contents remain available; generic size-selection instructions are omitted.
- Optional item names and kitchen notes share a collapsed section. Existing names and notes open it automatically.
- Address-provider attribution and its data disclosure are available inside a native details control. Address validation, service-area restrictions, delivery minimum and unknown delivery fees remain explicit.
- Saving, sharing and repeating retain their controls and exception messages. Normal explanatory paragraphs are omitted or shortened.
- Demo and payment notices remain explicit. They are product state, not help copy.

`storefront-copy.mjs` applies the same copy edits to the current production storefront during the guarded UI deployment. This avoids replacing the platform's tenant, checkout, payment or order-status adapters. `DEPLOY.PS1 -Target Prod` can run from an isolated clean checkout whose commit exactly matches GitHub main; publication to GitHub still requires main.
