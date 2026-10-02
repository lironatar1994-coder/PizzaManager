# Additional demonstration ingredients

Four transparent, photographed-style synthetic assets were created with the built-in ImageGen tool on 2026-10-02:

| Ingredient | File | WebP size |
| --- | --- | --- |
| Green olives | `green-olive.webp` | 11,538 bytes |
| Tomatoes | `tomato.webp` | 9,704 bytes |
| Roasted pepper | `roasted-pepper.webp` | 8,270 bytes |
| Pineapple | `pineapple.webp` | 7,538 bytes |

The original prompt accompanies each asset in its `.webp.json` file. Original PNGs remain in the generator output directory. Generated alpha is preserved; transparent margin was trimmed and padded before resizing to 192×192, WebP quality 88. Existing ingredient images are unchanged.

The existing renderer handles scatter, whole/right/left placement, natural landing and removal for these assets. Demonstration prices are ₪6 per whole pizza, with the shop's configured half-price factor. Prices and appearance can be edited in product management. `deploy/extra-toppings.json` records the initial authorized demonstration additions; subsequent UI deployments do not reset catalog choices or prices.
