# Shopify theme sections — technical assignment

Four sections and one product card, built on a clean Dawn 16.0.0 from the Figma file "Test".

| | |
|---|---|
| Live preview | `https://1rzg6i-6z.myshopify.com/` — storefront password in the email |
| Repository | `https://github.com/Parikshatsingh1999/shopify-assignment` |
| Base theme | Dawn `16.0.0` (`Shopify/dawn` @ `258f00f`) |
| `shopify theme check` | 0 errors |

---

## What was added

### Test 1

**`sections/od-hero.liquid`** — Hero
Full-bleed background image with the headline lockup over it, a call-to-action button
linking to a collection the merchant picks, and the vertical "Reviews" tab on the right
edge. The headline can be artwork or live text; the Reviews tab can be turned off.

**`sections/od-drop-teaser.liquid`** — Drop teaser
Two panels. Left: patterned background, script headline, and a countdown built from
individual digit tiles that counts down in real time to a date and time the merchant sets.
Right: image card with an overlaid caption and a "Get notified" email capture that submits
through Shopify's own customer form, with success and error states.

**`sections/od-display-text.liquid`** — Display text
Large display text with an image or video showing through the letterforms. The text stays
real, selectable, translatable text.

### Test 2

**`snippets/od-product-card.liquid`** — Product card
Colour swatches over the image that switch the image, the variant and the price; quick add
to cart without a page reload; and the states from the hidden Figma layers — Clearance,
the vendor line and the compare-at price. The Final Sale pill is the product's own tags:
every tag on the product prints on the card exactly as it was typed.

**`sections/od-product-grid.liquid`** — Product grid
A collection grid that renders the card. Added so the card can be shown on the home page.

---

## Where they are

- **Home page** — Hero, Drop teaser, Display text, Product grid. Both tests on one page.
- **Collection page** — the same card renders inside Dawn's own collection grid, so Dawn's
  filtering, sorting and pagination still work.

Every section has a preset and can be added, removed and reordered on its own.

---

## Running it

```bash
shopify theme dev --store 1rzg6i-6z.myshopify.com
```

---
