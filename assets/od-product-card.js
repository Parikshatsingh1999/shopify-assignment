/*
  od-product-card.js · Test 2 — Product card

  Two independent pieces:

  1. Swatch switching — one delegated listener for the whole document rather
     than a controller per card. A forty-card grid with twelve colours each is
     480 potential listeners; delegation makes it one, and it keeps working for
     cards that arrive later from pagination, filtering or the theme editor.

  2. <od-quick-add> — a custom element wrapping a real product form. Without JS
     the form still posts to /cart/add and the shopper lands on the cart, so the
     card degrades rather than breaks.

  Both read their data from the card's own JSON island, so nothing global has to
  know how many cards are on the page.
*/

/* ===========================================================================
   1 · Swatches
   ======================================================================== */

const OdCard = {
  /** Parse (once) and cache the variant data a card was rendered with. */
  data(card) {
    if (card._odVariants) return card._odVariants;

    const node = card.querySelector('[data-od-card-variants]');
    if (!node) return [];

    try {
      card._odVariants = JSON.parse(node.textContent);
    } catch (error) {
      // Bad JSON shouldn't take the grid down with it — the card simply stops
      // switching and remains a working link to the product page.
      console.warn('[od-product-card] could not read variant data', error);
      card._odVariants = [];
    }

    return card._odVariants;
  },

  /**
   * Pick the variant to show for a colour: the first available one, falling
   * back to the first of that colour so a fully sold-out colour still shows its
   * image and price rather than silently doing nothing.
   */
  variantForColour(card, colour) {
    const variants = OdCard.data(card).filter((v) => v.colour === colour);
    if (!variants.length) return null;
    return variants.find((v) => v.available) || variants[0];
  },

  select(card, button) {
    const colour = button.dataset.colour;
    const variant = OdCard.variantForColour(card, colour);
    if (!variant) return;

    OdCard.markSelected(card, button);
    OdCard.paint(card, variant);
  },

  markSelected(card, button) {
    // Roving tabindex: the group is one tab stop, arrows move within it.
    card.querySelectorAll('[data-od-swatch]').forEach((el) => {
      const isTarget = el === button;
      el.setAttribute('aria-checked', String(isTarget));
      el.setAttribute('tabindex', isTarget ? '0' : '-1');
    });
  },

  paint(card, variant) {
    // Image
    const image = card.querySelector('[data-od-card-image]');
    if (image && variant.image) {
      // srcset has to go, or the browser keeps serving the old candidate.
      image.removeAttribute('srcset');
      image.removeAttribute('sizes');
      image.src = variant.image;
      if (variant.imageAlt) image.alt = variant.imageAlt;
    }

    // Links — both the media link and the title link point at the variant, so
    // the shopper lands on the colour they were looking at.
    card.querySelectorAll('[data-od-card-link], [data-od-card-title-link]').forEach((link) => {
      if (variant.url) link.href = variant.url;
    });

    // The variant that quick add will send
    const input = card.querySelector('[data-od-variant-input]');
    if (input) input.value = variant.id;

    // Quick add availability for this specific variant
    const button = card.querySelector('[data-od-quick-add-button]');
    if (button) {
      button.disabled = !variant.available;
      button.classList.toggle('od-card__quick-add-button--sold-out', !variant.available);
    }

    // Price and the compare-at ("was") price
    const current = card.querySelector('[data-od-price-current]');
    const was = card.querySelector('[data-od-price-was]');
    if (current) {
      // The design keeps the current price black on sale; the struck-through
      // was-price and the Clearance line are what signal the discount.
      current.textContent = variant.price;
    }
    if (was) {
      was.textContent = variant.compareAt || '';
      was.hidden = !variant.onSale;
    }

    // Clearance badge follows the compare-at price of the selected variant
    const clearance = card.querySelector('[data-od-badge-clearance]');
    if (clearance) clearance.hidden = !variant.onSale;

    card.classList.toggle('od-card--variant-sold-out', !variant.available);
  },

  /** Arrow-key navigation inside the swatch radiogroup. */
  moveFocus(group, currentButton, delta) {
    const buttons = Array.from(group.querySelectorAll('[data-od-swatch]')).filter((b) => !b.hidden);
    if (!buttons.length) return;

    const index = buttons.indexOf(currentButton);
    const next = buttons[(index + delta + buttons.length) % buttons.length];

    next.focus();
    next.click();
  },
};

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-od-swatch]');
  if (!button) return;

  const card = button.closest('[data-od-card]');
  if (!card) return;

  OdCard.select(card, button);
});

document.addEventListener('keydown', (event) => {
  const button = event.target.closest('[data-od-swatch]');
  if (!button) return;

  const group = button.closest('[data-od-swatches]');
  if (!group) return;

  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      event.preventDefault();
      OdCard.moveFocus(group, button, 1);
      break;
    case 'ArrowLeft':
    case 'ArrowUp':
      event.preventDefault();
      OdCard.moveFocus(group, button, -1);
      break;
    default:
      break;
  }
});

/* ===========================================================================
   2 · Quick add
   ======================================================================== */

class OdQuickAdd extends HTMLElement {
  connectedCallback() {
    this.form = this.querySelector('form');
    this.button = this.querySelector('[data-od-quick-add-button]');
    this.errorEl = this.querySelector('[data-od-quick-add-error]');
    this.idleEl = this.querySelector('[data-od-quick-add-idle]');
    this.busyEl = this.querySelector('[data-od-quick-add-busy]');
    this.doneEl = this.querySelector('[data-od-quick-add-done]');

    if (!this.form || !this.button) return;

    // Where the added item should land. Dawn ships one or the other depending
    // on the merchant's cart setting; page-cart stores have neither.
    this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');

    this.onSubmit = this.onSubmit.bind(this);
    this.form.addEventListener('submit', this.onSubmit);
  }

  disconnectedCallback() {
    if (this.form) this.form.removeEventListener('submit', this.onSubmit);
    if (this.resetTimer) clearTimeout(this.resetTimer);
  }

  async onSubmit(event) {
    event.preventDefault();

    // Double-click guard. The disabled attribute alone isn't enough: a fast
    // double click can fire the second submit before the first paint lands.
    if (this.pending) return;
    this.pending = true;

    this.setState('busy');

    try {
      const response = await fetch(window.routes.cart_add_url, this.buildRequest());
      const result = await response.json();

      // The Cart API answers 422 with a body rather than throwing — an
      // inventory race (someone bought the last one a second ago) arrives here.
      if (result.status) {
        throw new Error(result.description || result.message || 'Could not add to cart');
      }

      this.renderCart(result);
      this.setState('done');
    } catch (error) {
      this.setState('error', error.message);
    } finally {
      this.pending = false;
    }
  }

  buildRequest() {
    const formData = new FormData(this.form);

    // Ask Shopify to re-render the cart sections in the same round trip, so the
    // cart updates without a second request.
    if (this.cart && typeof this.cart.getSectionsToRender === 'function') {
      formData.append('sections', this.cart.getSectionsToRender().map((section) => section.id));
      formData.append('sections_url', window.location.pathname);
      if (typeof this.cart.setActiveElement === 'function') {
        this.cart.setActiveElement(document.activeElement);
      }
    }

    // fetchConfig comes from Dawn's global.js; fall back so this snippet still
    // works if it is lifted into a theme that doesn't have it.
    const config =
      typeof window.fetchConfig === 'function'
        ? window.fetchConfig('javascript')
        : { method: 'POST', headers: { Accept: 'application/javascript' } };

    config.headers['X-Requested-With'] = 'XMLHttpRequest';
    delete config.headers['Content-Type']; // let the browser set the multipart boundary
    config.body = formData;

    return config;
  }

  renderCart(result) {
    if (this.cart && typeof this.cart.renderContents === 'function') {
      this.cart.renderContents(result);
    }

    // Tell the rest of the theme (cart bubble, free-shipping bar, upsells) that
    // the cart moved. This is Dawn's own event, so everything already listening
    // updates itself.
    if (typeof window.publish === 'function' && window.PUB_SUB_EVENTS) {
      window.publish(window.PUB_SUB_EVENTS.cartUpdate, {
        source: 'od-quick-add',
        productVariantId: new FormData(this.form).get('id'),
        cartData: result,
      });
    }
  }

  /**
   * Whether the variant currently in the form can still be bought.
   * Returning to the idle state must not re-enable the button for a sold-out
   * variant just because an add succeeded or failed a moment ago.
   */
  currentVariantAvailable() {
    const card = this.closest('[data-od-card]');
    const input = this.querySelector('[data-od-variant-input]');
    if (!card || !input) return true;

    const variant = OdCard.data(card).find((v) => String(v.id) === String(input.value));
    return variant ? variant.available : true;
  }

  setState(state, message = '') {
    if (this.resetTimer) clearTimeout(this.resetTimer);

    const busy = state === 'busy';

    this.button.setAttribute('aria-busy', String(busy));
    this.button.disabled = busy || !this.currentVariantAvailable();

    if (this.idleEl) this.idleEl.hidden = state !== 'idle';
    if (this.busyEl) this.busyEl.hidden = !busy;
    if (this.doneEl) this.doneEl.hidden = state !== 'done';

    if (this.errorEl) {
      this.errorEl.textContent = state === 'error' ? message : '';
      this.errorEl.hidden = state !== 'error';
    }

    if (state === 'done' || state === 'error') {
      // Return to the neutral state so the shopper can add another.
      this.resetTimer = setTimeout(() => this.setState('idle'), state === 'done' ? 1800 : 5000);
    }
  }
}

if (!customElements.get('od-quick-add')) {
  customElements.define('od-quick-add', OdQuickAdd);
}
