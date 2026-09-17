# Web development assignment — Shopify theme sections

Four Shopify sections built on a clean Dawn 16.0.0, from the Figma file "Test".

- **Test 1** — `Hero`, `Drop teaser`, `Display text`, as three independent sections
- **Test 2** — a reusable product card rendered from real product data in a collection grid

| | |
|---|---|
| Live preview | `https://1rzg6i-6z.myshopify.com/` — storefront password in the email |
| Repository | `https://github.com/Parikshatsingh1999/shopify-assignment` |
| Base theme | Dawn `16.0.0` (`Shopify/dawn` @ `258f00f`) |
| `shopify theme check` | 0 errors, 0 offenses in any `od-*` file |

---

## How to read this repo

The first commit is **clean, unmodified Dawn 16.0.0**. Everything after it is mine, so:

```bash
git diff 56717c0..HEAD --stat
```

is an exact inventory of the work. Nothing in Dawn's own files was touched except one
locale file (see below), which the diff makes obvious.

### Files

```
sections/
  od-hero.liquid              Test 1 · hero
  od-drop-teaser.liquid       Test 1 · drop teaser (countdown + email capture)
  od-display-text.liquid      Test 1 · media through the letterforms
  od-product-grid.liquid      Test 2 · the grid that renders the card
snippets/
  od-product-card.liquid      Test 2 · the card itself
bin/
  check-ranges.py             pre-push validation of range settings (see below)
assets/
  od-base.css                 shared design tokens + shared button
  od-hero.css
  od-drop-teaser.css
  od-countdown.js             <od-countdown> + email capture validation
  od-display-text.css
  od-product-card.css
  od-product-card.js          swatch switching + <od-quick-add>
  od-grid.css
locales/
  en.default.json             + an `od.card.*` block (the only Dawn file modified)
```

### Conventions

Three conventions, chosen so that several people could work on this in parallel
without stepping on each other:

1. **`od-` prefix on every file, class and custom element.** One namespace, zero
   collisions with Dawn's own classes, and `git log --  '*od-*'` is the project history.
   A prefix also means Dawn can be upgraded underneath this work without a merge fight.
2. **One stylesheet and one script per section, loaded by that section.** A section owns
   its assets; deleting the section deletes its cost. Nothing is added to a global bundle,
   so two people editing two sections never touch the same file.
3. **Shared values live in `od-base.css` as custom properties; per-section values are
   written inline on the section element from schema settings.** So a design change is a
   one-file edit, and a merchant change never needs a developer.

The card is a **snippet, not a section**, and it reads nothing from `section` — everything
arrives as an argument with a documented default. That is what makes it droppable into any
grid: this repo's grid, Dawn's featured-collection, search results, related products.

### `bin/check-ranges.py`

Shopify rejects a `range` setting whose default doesn't land exactly on a step, or whose
range spans more than 101 steps. `shopify theme check` enforces neither, so both surface as
an upload error mid-`theme dev` that names the setting but not the rule. I hit it once
(`panel_height`), so it's a script now:

```bash
python3 bin/check-ranges.py    # non-zero exit on any violation
```

Worth having for the same reason as the prefix: with several people adding settings, the
person who breaks it isn't necessarily the person who finds out.

---

## Setup

```bash
git clone https://github.com/Parikshatsingh1999/shopify-assignment.git theme
cd theme
shopify theme dev --store 1rzg6i-6z.myshopify.com
```

The repo is a complete working theme, so `theme dev` runs it as-is. Then in the theme
editor, add `Hero`, `Drop teaser`, `Display text` and `Product grid` to a page — each has a
preset and can be added, removed and reordered independently.

---

## Test 1

### Hero

The section holds the design's **1440 × 810 aspect ratio** rather than a fixed height, so
the crop survives every viewport width, with a `min-height` floor for short windows.

- Background image is the LCP element, so it loads `eager` with `fetchpriority="high"` and
  a srcset that stops at 2880px (2× the artboard). Anything larger is wasted bytes.
- **Headline can be artwork or live text.** When artwork is used it is marked decorative
  (`alt=""`) and the headline text is still rendered in a visually-hidden heading — so the
  page keeps a valid outline and the copy stays translatable even though the visible
  lettering is an image.
- Heading level is a merchant setting ("Main page heading" / "Section heading") because
  only one section on a page should be the `h1`, and the merchant is the only one who knows
  which.
- The CTA takes a **collection picker** as the primary control, with a free URL field as an
  escape hatch. In the editor, an unset link shows an inline hint instead of silently
  rendering nothing.
- The **Reviews tab** is a real link when the merchant sets a destination, and an inert
  `<div>` when they don't, so keyboard users never land on a control that does nothing.

### Drop teaser

**The countdown is real.** `<od-countdown>` counts down from a merchant-set date and time,
with individual digit tiles as drawn.

- **Timezone.** The merchant enters a wall-clock time; the section appends the store's UTC
  offset before handing it to the browser. Without that, a shopper in Tokyo and one in
  Berlin would see two different countdowns to the same drop.
- **Drift.** The tick is scheduled to the next whole second rather than every 1000 ms, and
  the timer stops on `visibilitychange` and recomputes from the clock on return, so a
  backgrounded tab doesn't come back wrong.
- **Overflow.** A 120-day countdown grows a third digit tile rather than clipping to "20".
- **Accessibility.** The tiles are `aria-hidden` — read literally they are a stream of loose
  numbers. A polite live region carries the same information as a sentence, updated once a
  minute, which informs without flooding a screen reader.
- **At zero**, behaviour is a merchant setting, because all three answers are defensible and
  it isn't a developer's call: *replace the timer with a message* (default — the section still
  sells), *keep the timer at all zeros*, or *hide the section entirely*. "Hide" is ignored inside
  the theme editor, where the merchant would otherwise lose the section they're editing.

> **Flagged: the countdown labels.** The design labels four tile groups DAYS / HOURS /
> MINUTES / SECONDS, but the tile groups as drawn don't line up with four two-digit units at
> that width. I built the version that makes sense: four units, each two digits, labels as
> **merchant settings**, and toggles for days and seconds. Turning days off rolls them into
> hours (so a 3-day countdown reads 72 hours, not 0) rather than quietly under-reporting the
> time left. Once the labels are settled, matching the design exactly is a copy change in
> the editor, not a code change.

**The email capture posts through Shopify's own `{% form 'customer' %}`**, tagged
`newsletter`. Signups land in Customers in the admin — no app, no third-party endpoint, no
placeholder.

- **Success state** renders from `form.posted_successfully?`. The form's `return_to` carries
  an anchor back to the section, so the shopper returns to the confirmation rather than the
  top of the page, and focus is moved to it so it's announced.
- **Error state** has two sources feeding one node: Shopify's server-side `form.errors` on
  load, and client-side `checkValidity()` before submit — so an obvious typo costs no page
  load. The input gets `aria-invalid` and the message is a live `role="alert"`.

### Display text

**The text stays real text** — selectable, translatable, searchable, part of the document
outline. No image of text, no SVG outlined glyphs.

Two techniques, because one does not cover both media types:

- **Image fill** — `background-clip: text` with the image as the heading's own background.
- **Video fill** — `background-clip` cannot take a `<video>`. So the video sits behind an
  opaque panel whose text is blended with `mix-blend-mode`: a dark surround uses white text
  and `multiply`, a light surround uses black text and `screen`. The letters read through to
  the video while the surround stays solid. The blend/ink pair is derived in Liquid from the
  merchant's light/dark choice, because getting it wrong inverts the effect.

**Fallback.** The text is styled **visible first**, and only made transparent inside
`@supports`. On a browser without `background-clip: text` the shopper sees solid coloured
text; without `mix-blend-mode` the video is dropped rather than painted over. The text is
never invisible — which is the failure mode this technique usually ships with.

Under `prefers-reduced-motion` the video is swapped for its still frame, so there is still
something behind the letters.

---

## Test 2

The card is **214 × 415 at the 1440 artboard**, which is what six columns with a 16px gap
gives you at full width — so `columns_desktop: 6` is the default rather than a coincidence.

### Colour swatches

- **Source of truth is Shopify's own swatch data** (Products → Options → swatch) via Dawn's
  `swatch` snippet when the merchant has set it: it survives theme changes and matches the
  swatches shown in filters and on the product page. With no swatch configured, the option
  name is used as a CSS colour keyword, which covers "Black", "Ivory", "Olive" and most of
  what merchants actually type; an unrecognised word paints a neutral dot and the ring plus
  the screen-reader label still identify it.
- Selecting a swatch repaints the **image, both links, the variant the form will add, the
  price, the compare-at price and the Clearance badge** from a small per-card JSON island —
  id, colour, availability, url, price, compare-at, image. Not the whole variant object:
  twelve colours across forty products is a payload nobody needs.
- **Overflow indicator.** Past the merchant's limit (default 4) the extra colours collapse
  into a `+N` chip linking to the product page, so twelve colours occupy exactly as much
  room as four and the row never wraps over the image.
- **A sold-out colour is still selectable** — a shopper may well want to look at it — but it
  is struck through, and selecting it disables quick add. Picking the variant to show for a
  colour prefers the first *available* one, so a partially sold-out colour isn't
  misrepresented.
- Keyboard: the swatch row is a `radiogroup` with roving tabindex, so it is **one** tab stop
  and arrow keys move within it. Forty cards × twelve colours as individual tab stops would
  make the grid unusable.

### Quick add

`<od-quick-add>` wraps a **real product form**. With JS off it posts to `/cart/add` and the
shopper lands on the cart — it degrades rather than breaks.

- Posts to `routes.cart_add_url` asking for Dawn's cart sections in the same round trip, then
  calls `renderContents` and publishes Dawn's own `PUB_SUB_EVENTS.cartUpdate`. Everything
  already listening — cart bubble, drawer, free-shipping bar — updates itself. Works with a
  cart drawer, a cart notification, or neither.
- **Double click** is guarded by a `pending` flag, not just the `disabled` attribute: a fast
  second click can fire before the first paint lands.
- **Failure** is handled from both directions — a rejected `fetch` and the Cart API's 422,
  which answers with a body rather than throwing (this is how an inventory race arrives:
  someone bought the last one a second ago). Either way the message is shown inline on the
  card and the button returns to its neutral state after a few seconds.
- States are idle → busy → done → idle, with `aria-busy` on the button.

### The hidden Figma states

All four are wired to real product data, not to settings:

| State | Condition |
|---|---|
| **Clearance** badge | selected variant's `compare_at_price > price` |
| **Final Sale** badge | product carries the merchant-named tag (default `final-sale`) |
| **Vendor** line | `product.vendor` present and the line is enabled |
| **Was** price | selected variant on sale — struck through beside the current price |

Clearance and the was-price follow the **selected variant**, not the product, so switching
to a full-price colour clears both.

### Data cases

| Case | Behaviour |
|---|---|
| 1 colour | no swatch row rendered at all (a single swatch is decoration, not a control) |
| 12 colours | first 4 shown, `+8` chip links to the product; row never wraps |
| Sold out product | muted image, Sold out badge, quick add disabled |
| Sold-out variant in an available product | that swatch struck through; selecting it disables quick add |
| No compare-at price | was-price and Clearance badge stay hidden |
| Very long title | clamped to two lines, so one card can't push its neighbours' prices out of line |
| Missing image | placeholder fills the same box, so the grid keeps its baseline |

---

## Responsive

The Figma is desktop only. Breakpoints follow **Dawn's own — 749px and 989px** — plus 1199px
for the grid. Reusing the theme's breakpoints rather than inventing a third set means these
sections change shape at the same widths as the header, footer and everything else on the
page; a section that reflows 40px before the header does looks like a bug.

| Width | Behaviour |
|---|---|
| ≥ 1200px | design layout: hero at 16:9, teaser side by side, grid at the merchant's column count |
| 990–1199px | grid drops one column; everything else unchanged |
| 750–989px | teaser panels **stack** — at 50/50 the countdown is the first thing to get cramped, so it takes the full width; grid drops two columns; hero keeps its ratio |
| < 750px | hero goes to a **4:5 crop** (16:9 is too letterboxed to hold a headline on a phone — the focal-point setting decides what stays in frame) with copy bottom-aligned; the Reviews tab lies **flat** at the bottom right, because vertical text beside a phone-width headline is a thumb trap; grid at the merchant's mobile column count; swatch and quick-add hit areas grow 8px past their visual size while the design size is kept |

---

## Accessibility

- Keyboard reachable throughout, with a visible `:focus-visible` ring on a non-theme colour.
- **One tab stop per card.** The image link is `aria-hidden` / `tabindex="-1"` because it
  duplicates the title link; the swatch row is a single roving-tabindex radiogroup.
- Heading level is a merchant setting where the right answer depends on the page.
- Decorative media carries `alt=""`; headline artwork keeps its text in a visually-hidden
  heading.
- Countdown digits are hidden from assistive tech in favour of a once-a-minute live region.
- Form errors use `role="alert"` + `aria-invalid`; the success message receives focus.
- `prefers-reduced-motion` is honoured — transition durations collapse, the tile flip and
  card zoom stop, the spinner freezes, and the fill video is replaced by its still frame.

## Performance

- One stylesheet and one script per section, requested only by that section.
- `defer` on both scripts; no render-blocking JS; no jQuery, no CSS framework, no apps.
- Hero image `eager`/`fetchpriority="high"`; the grid's first row eager, the rest lazy.
- Swatch switching is **one delegated listener for the document**, not one per card — a
  forty-card grid with twelve colours each would otherwise mean 480 listeners. It also means
  cards arriving later from pagination, filtering or the theme editor work with no rebinding.
- The per-card JSON island carries only the six fields the card repaints.

## Theme-editor safety

Both behaviours are custom elements, so `connectedCallback` / `disconnectedCallback` do the
work: adding, duplicating, reordering or removing a section is handled with no page reload
and nothing left behind (the countdown clears its timer on disconnect). The email capture
also rebinds on `shopify:section:load`. Sections that need a setting the merchant hasn't
filled in show an inline hint under `request.design_mode` rather than rendering an empty box.

---

## Fonts

*To be completed against the Figma file — the exact families, any substitution and the reason
for it will be recorded here before submission.*

The script headline and the section fonts are **`font_picker` settings**, so the face is a
merchant choice served from Shopify's own font library rather than a hardcoded webfont, and
no third-party font request is added to the page. `od-base.css` carries a system-stack
fallback for the script face.

## Where I pushed back

- **The countdown labels** don't add up in the design (above). Built the version that makes
  sense, made the labels merchant settings, flagged it rather than shipping something that
  reads wrong.
- **"Hide the section at zero"** is offered but disabled inside the theme editor. Obeying it
  there would make the merchant's section vanish while they were editing it.
- **Behaviour at zero is a setting, not a decision I made for you.** Three answers are
  defensible and the right one depends on how the drop is run.
- **A single-colour product renders no swatch row.** One swatch isn't a control, it's noise.
- **The "was" price and Clearance badge follow the variant, not the product**, which is
  stricter than most themes and the only version that isn't misleading when colours are
  priced differently.

## Outstanding

*Kept current deliberately — I'd rather tell you what isn't finished than have you find it.*

- **Pixel-fidelity pass against the Figma.** The structure, states and behaviour are
  complete, and every value the design controls is a token in `od-base.css` or a schema
  setting. The exact type sizes, spacing, colours and the image/text proportions inside the
  card still need to be read off the file and dialled in. Dimensions taken from the brief
  (1440 × 810, 1440 × 567, 214 × 415, six columns at 16px) are in place; the card's 3:4
  image ratio is an assumption and a merchant setting.
- **Exported assets** (background image, pattern, headline artwork, card imagery) are not in
  the repo yet — the sections render placeholders until they're uploaded.
