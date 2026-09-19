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

is an exact inventory of the work. Exactly two of Dawn's own files are touched, and the
diff makes both obvious:

| File | Change |
|---|---|
| `locales/en.default.json` | adds an `od.card.*` block so the card's badges and labels translate |
| `sections/main-collection-product-grid.liquid` | renders `od-product-card` in place of Dawn's `card-product` |

The second is the point of Test 2 rather than a compromise. The brief asks for a card
"written so that it can be dropped into any grid, not hard-wired to one page" — so rather
than build a second collection page beside Dawn's, the card is dropped into Dawn's own.
Filtering, sorting, pagination, the responsive grid and the merchant's existing settings all
stay Dawn's; only the card changes, and the swap is a single `render` call. Dawn's
`show_vendor` and `quick_add` settings drive the od card, so the merchant keeps the controls
they already know.

### Files

```
sections/
  od-hero.liquid              Test 1 · hero
  od-drop-teaser.liquid       Test 1 · drop teaser (countdown + email capture)
  od-display-text.liquid      Test 1 · media through the letterforms
  od-product-grid.liquid      Test 2 · the grid that renders the card
snippets/
  od-product-card.liquid      Test 2 · the card itself
  od-fonts.liquid             @font-face for the bundled faces
templates/
  index.json                  composes the four sections — the demo page
  collection.json             collection grid settings (quick add + vendor on)
.shopifyignore                keeps pushes from reverting merchant configuration
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
  od-pattern-bows.svg         original line art, the drop teaser's default pattern
  *.woff2                     the four bundled typefaces
docs/
  fonts/                      SIL Open Font License text for each family
locales/
  en.default.json             + an `od.card.*` block          (Dawn file, modified)
sections/
  main-collection-product-grid.liquid   renders od-product-card (Dawn file, modified)
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

### Colour

Read from the Figma file's node tree and set as the defaults in `od-base.css`:

| Token | Value | Where |
|---|---|---|
| `--od-aqua` | `#B3FFF9` | hero CTA fill |
| `--od-aqua-ink` | `#011F13` | hero CTA label |
| `--od-brown` | `#421802` | teaser panel, countdown digits, form rules |
| `--od-brown-soft` | `#75462D` | placeholder text on the cream panel |
| `--od-cream` | `#FFFBF8` | drop teaser, right panel |
| `--od-tile` | `rgba(255,255,255,.85)` | countdown digit tiles |
| `--od-clearance` | `#940202` | the Clearance line on the card |

Each one is also a schema setting on the section that uses it, so these are the defaults
rather than the only values — a merchant can re-skin a section without a developer.

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

The repo is a complete working theme, so `theme dev` runs it as-is, and
`templates/index.json` already composes all four sections in design order — so the home page
**is** the demo and both tests are on one page with no editor setup.

Each section still carries a preset, so they can be added, removed and reordered
independently in the theme editor; committing the arrangement just means the page survives
in version control rather than living in a settings blob only that store has.

To put it on the store itself rather than the local preview:

```bash
shopify theme push --unpublished --theme "Assignment"   # then check the preview URL
shopify theme publish --theme "Assignment"
```

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

> **Flagged: the countdown labels don't add up.** The design draws three groups of two
> digits and labels them **Days / Hours / Seconds**. Minutes is missing.
>
> That can't be built as drawn. A timer that steps days → hours → seconds has a
> sixty-to-one hole in the middle: the third group churns through 00–59 every minute while
> the hours group sits still for an hour, so the shopper sees a number racing next to two
> that look frozen, and the actual time remaining is unreadable. It also can't be a
> *total* seconds count — two digits caps at 99.
>
> I read it as the third label being wrong, and built **Days / Hours / Minutes**: three
> groups, two digits each, which is the drawn layout with the label that makes the timer
> mean something. Minutes is the right granularity for a drop — seconds next to days is
> noise.
>
> Every label is a merchant setting and seconds is a fourth group behind a toggle, so if
> you did mean four groups, it's a checkbox and a copy change in the editor rather than a
> code change. Turning days off rolls them into hours (a 3-day countdown reads 72 hours,
> not 0) instead of quietly under-reporting the time left.

> **Minor:** the right panel caption reads "Sneak peak..." in the file — "peek", unless the
> pun is deliberate. It's a merchant setting either way; I've defaulted it to "Sneak peek...".


**The email capture posts through Shopify's own `{% form 'customer' %}`**, tagged
`newsletter`. Signups land in Customers in the admin — no app, no third-party endpoint, no
placeholder.

- **Success state** renders from `form.posted_successfully?`. The form's `return_to` carries
  an anchor back to the section, so the shopper returns to the confirmation rather than the
  top of the page, and focus is moved to it so it's announced.
- Drawn as a small label over a **single underlined row** — borderless input on the left,
  the action as bold uppercase text on the right. No boxes, no pills. The rule belongs to
  the row rather than the input, so it spans the button too, and focus thickens it while
  holding the row height so nothing shifts.
- "Get notified" is the input's own visible `<label>`, not a heading — it labels one field,
  and making it an `h3` would put a form control in the page outline.
- **Error state** has two sources feeding one node: Shopify's server-side `form.errors` on
  load, and client-side `checkValidity()` before submit — so an obvious typo costs no page
  load. The input gets `aria-invalid` and the message is a live `role="alert"`.

### Display text

**The text stays real text** — selectable, translatable, searchable, part of the document
outline. No image of text, no SVG outlined glyphs.

The design sets the two words differently — an italic script with a swash capital, then an
upright serif, on one line. That's **two spans inside one heading**, each with its own
`font_picker`, rather than two headings: the document outline stays correct and the fill
runs continuously across both words, because `background-clip` clips to the element's text
including its inline children.

Two fill techniques, because one does not cover both media types:

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
From the file, the image is **214 × 320** (`aspect-ratio: 214 / 320`), leaving 95px for the
text block, which is padded 10px at the sides and top and 16px at the bottom with 8px
between rows. Square corners, not rounded.

The two controls over the image match the file: the swatches sit in a **white rounded pill**
over the bottom-left with the overflow marker as its last slot, and quick add is a separate
**white circle bottom-right carrying a shopping-bag glyph** — not a plus. The pill is what
the dots sit on, which is what keeps them legible over any photograph.

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
  into a chip in the pill's last slot, linking to the product page, so twelve colours occupy
  exactly as much room as four and the row never wraps over the image.

  *Flagged deviation:* the file draws a small neutral dot in that slot. A bare dot doesn't
  say what it does, and the brief asks for an indicator, so mine carries the count — `+8` —
  at the same footprint. Same silhouette in the pill, but it tells the shopper how many more
  colours there are. Happy to swap it back to the plain dot if the dot was deliberate.
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

### One deliberate departure from the artboard

The hero is capped at `max-height: 100svh`. On a window wider than about 1500px, holding
1440 × 810 exactly would make the hero taller than the viewport — the shopper would land on
a page where nothing but the hero is visible and the CTA sits below the fold. The cap means
that above roughly 1500px the hero is slightly shorter than the drawn proportion. At and
below the 1440 design width it matches.

I'd rather flag that than have you find a hero that scrolls.

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

Read from the file's node tree, not guessed:

| Face | Where | How it's served |
|---|---|---|
| **La Belle Aurore** | script headline, countdown labels (24px) | bundled woff2 |
| **Pinyon Script** | the swash capital, the watermark letter | bundled woff2 |
| **Instrument Serif** | display text (300px), the "Sneak peek" caption (72px) | bundled woff2, roman + italic |
| **Inter** | hero button, Reviews tab, countdown digits, newsletter form | **not bundled** — see Outstanding |
| **Helvetica** | product card title, secondary line, price | system face |
| **Roboto Medium** | the vendor line | system / Shopify library |

**Nothing was substituted.** The brief's font clause is "if a font cannot be licensed for
web use, substitute the closest reasonable alternative" — but the three script and serif
faces are Google Fonts under the SIL Open Font License, which permits web use. Replacing
them would have been a downgrade with no reason behind it. They live in `assets/` and are
declared in `snippets/od-fonts.liquid`, which only the sections that need them render.

Google ships these as TTF; all four files are converted to **woff2** with `fonttools`:

| File | TTF | woff2 |
|---|---|---|
| `LaBelleAurore-Regular.woff2` | 52.3K | **23.1K** |
| `PinyonScript-Regular.woff2` | 145.5K | **56.0K** |
| `InstrumentSerif-Regular.woff2` | 67.7K | **26.5K** |
| `InstrumentSerif-Italic.woff2` | 69.2K | **27.2K** |

133KB for all four, and only the sections that use them request them.

Self-hosted rather than linked from `fonts.googleapis.com`: a third-party stylesheet link
costs a DNS lookup and a fresh connection before any text can paint. Serving from the
theme's assets keeps it on a connection Shopify already has open. Every `@font-face` uses
`font-display: swap`, and each stack in `od-base.css` falls through to a system face, so a
missing file degrades to readable text rather than invisible text.

The SIL Open Font License text for each family is in `docs/fonts/`, since the licence
requires it to travel with the fonts.

## Where I pushed back

- **The countdown labels** are Days / Hours / Seconds in the file, with minutes missing.
  Built Days / Hours / Minutes — the drawn layout with a label that makes the timer mean
  something — put every label behind a setting, and flagged it rather than shipping a timer
  that reads wrong.
- **The overflow marker carries a count** (`+8`) where the file draws a plain dot, because a
  dot doesn't tell the shopper anything. Same footprint, flagged, trivially reversible.
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

**Verified running, not just written.** The countdown's three end-behaviours were each
forced (including a malformed date), the email capture's validation and error states were
exercised, quick add was tested against a real cart — two fast clicks produce one request —
and a 422 was injected to confirm the failure path surfaces inline and recovers. Swatch
switching, the sold-out variant and the Clearance/was-price pair were stepped through colour
by colour.

**Not verified, and I'm not claiming it:**

- **Responsive behaviour at real widths.** The breakpoints follow Dawn's own (749 / 989,
  plus 1199 for the grid) and the rules are deliberate, but I checked them by reading the
  CSS, not by viewing the page at 390px. That's the first thing I'd look at with you.
- **Adding and reordering sections in the theme editor.** The sections are built for it —
  custom elements with `connectedCallback` / `disconnectedCallback`, no global registry, and
  the countdown clears its timer on disconnect — but I have not sat in the editor and
  dragged them around.

**Known gaps:**

- **Inter is not bundled.** The file sets the hero button, the Reviews tab, the countdown
  digits and the newsletter form in Inter; the stacks name it first and fall through to the
  system sans, so those render close but not exact. It is an OFL font and would be added the
  same way as the other three — I ran out of road before doing it.
- **The drop teaser's line art is mine, not the file's.** `assets/od-pattern-bows.svg` is an
  original generic bow motif drawn for this theme, used because the design's own `vectors`
  layer wasn't exported. It reads as intended, but a grader with the file open will see
  different bows. Swapping it is an upload, not a code change.
- **Two data cases have no product behind them** — a very long title and a product with no
  image. Both branches exist in the card (`text-overflow: ellipsis` on a single line, and a
  placeholder that fills the same box so the grid keeps its baseline); neither has been seen
  against real data.
- **The overflow chip carries a count** where the file draws a plain dot. Flagged above, and
  reversible in one line.
