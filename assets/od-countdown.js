/*
  od-countdown.js · Test 1 — Drop teaser countdown

  A custom element so the theme editor gets correct behaviour for free: adding,
  duplicating or reordering the section re-runs connectedCallback, and removing
  it runs disconnectedCallback, which clears the timer. No global registry, no
  listeners left behind.

  Design notes
  - The deadline is a wall-clock time in the *store's* timezone. We append the
    store's UTC offset so every shopper counts down to the same instant.
  - The tick is scheduled to the next second boundary rather than every 1000ms,
    so the display doesn't drift on a throttled tab.
  - Digit tiles are aria-hidden; a polite live region carries the same
    information as a sentence, updated once a minute.
*/

class OdCountdown extends HTMLElement {
  connectedCallback() {
    this.unitsEl = this.querySelector('[data-countdown-units]');
    this.expiredEl = this.querySelector('[data-countdown-expired]');
    this.announcerEl = this.querySelector('[data-countdown-announcer]');
    this.onExpire = this.dataset.onExpire || 'message';

    this.deadline = this.parseDeadline(this.dataset.deadline, this.dataset.utcOffset);

    if (!this.deadline) {
      // A malformed date should never leave a shopper staring at a broken timer.
      this.showExpiredState({ invalid: true });
      return;
    }

    this.unitEls = new Map();
    this.querySelectorAll('[data-unit]').forEach((el) => {
      this.unitEls.set(el.dataset.unit, {
        root: el,
        tiles: el.querySelector('.od-countdown__tiles'),
      });
    });

    if (this.unitsEl) this.unitsEl.setAttribute('aria-hidden', 'true');

    this.lastAnnouncedMinute = null;
    this.handleVisibility = this.handleVisibility.bind(this);
    document.addEventListener('visibilitychange', this.handleVisibility);

    this.tick();
  }

  disconnectedCallback() {
    this.stop();
    document.removeEventListener('visibilitychange', this.handleVisibility);
  }

  /* --------------------------------------------------------------------- */

  /**
   * "2026-12-01T10:00" + "+0530" -> Date
   * Falls back to the browser's local time if the offset is missing, which is
   * still correct for the merchant previewing their own store.
   */
  parseDeadline(raw, utcOffset) {
    if (!raw) return null;

    let value = raw.trim().replace(' ', 'T');
    if (value.length === 10) value += 'T00:00'; // date with no time
    if (value.length === 16) value += ':00';

    if (utcOffset && /^[+-]\d{4}$/.test(utcOffset)) {
      value += `${utcOffset.slice(0, 3)}:${utcOffset.slice(3)}`;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  stop() {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.timeoutId = null;
  }

  handleVisibility() {
    // Background tabs get their timers throttled. Rather than let the display
    // drift, stop while hidden and recompute from the clock on return.
    if (document.hidden) {
      this.stop();
    } else if (this.deadline && !this.expired) {
      this.tick();
    }
  }

  tick() {
    this.stop();

    const remaining = this.deadline.getTime() - Date.now();

    if (remaining <= 0) {
      this.render(0);
      this.showExpiredState();
      return;
    }

    this.render(remaining);

    // Land on the next whole second rather than 1000ms from now.
    this.timeoutId = setTimeout(() => this.tick(), remaining % 1000 || 1000);
  }

  render(remainingMs) {
    const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    // When days aren't shown, roll them into hours so the total stays truthful.
    const showsDays = this.unitEls.has('days');
    const showsSeconds = this.unitEls.has('seconds');

    const values = {
      days,
      hours: showsDays ? hours : days * 24 + hours,
      minutes,
      seconds,
    };

    this.unitEls.forEach((refs, unit) => {
      this.paintTiles(refs.tiles, values[unit]);
    });

    this.announce(days, values.hours, minutes, seconds, showsSeconds);
  }

  /**
   * Writes a number across individual digit tiles, growing the tile count when
   * the value needs more room (a 120-day countdown must not clip to "20").
   */
  paintTiles(container, value) {
    if (!container) return;

    const text = String(Math.max(0, value)).padStart(2, '0');
    const needed = text.length;
    const tiles = container.querySelectorAll('.od-countdown__tile');

    if (tiles.length < needed) {
      for (let i = tiles.length; i < needed; i += 1) {
        const tile = document.createElement('span');
        tile.className = 'od-countdown__tile';
        tile.dataset.digit = String(i);
        container.appendChild(tile);
      }
    }

    container.querySelectorAll('.od-countdown__tile').forEach((tile, index) => {
      const next = text[index] ?? '';
      if (tile.textContent === next) return; // avoid pointless repaints every second
      tile.textContent = next;
      tile.classList.remove('od-countdown__tile--flip');
      // Restart the flip animation. Skipped entirely under reduced motion
      // because the CSS animation is a no-op there.
      void tile.offsetWidth;
      tile.classList.add('od-countdown__tile--flip');
    });
  }

  announce(days, hours, minutes, seconds, showsSeconds) {
    if (!this.announcerEl) return;

    // Once a minute is enough context without flooding a screen reader.
    if (this.lastAnnouncedMinute === minutes) return;
    this.lastAnnouncedMinute = minutes;

    const parts = [];
    if (days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
    if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
    parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
    if (!days && !hours && showsSeconds) parts.push(`${seconds} seconds`);

    this.announcerEl.textContent = `${parts.join(', ')} until the drop.`;
  }

  showExpiredState({ invalid = false } = {}) {
    if (this.expired) return;
    this.expired = true;
    this.stop();

    const inEditor = Boolean(window.Shopify && window.Shopify.designMode);
    const behavior = invalid ? 'message' : this.onExpire;

    // The announcer is set for every ended state, not just the message one.
    // On "zero" a screen reader would otherwise keep reading the last tick —
    // "0 minutes, 0 seconds until the drop" — for a drop that has landed.
    if (this.announcerEl) this.announcerEl.textContent = this.expiredEl ? this.expiredEl.textContent.trim() : 'The drop is live.';

    if (behavior === 'zero') {
      this.unitEls.forEach((refs) => this.paintTiles(refs.tiles, 0));
      return;
    }

    if (behavior === 'hide' && !inEditor) {
      // Hide the whole section, not just the timer — an expired teaser with a
      // live signup form is worse than no teaser.
      const wrapper = this.closest('.shopify-section');
      if (wrapper) wrapper.hidden = true;
      return;
    }

    if (this.unitsEl) this.unitsEl.hidden = true;
    if (this.expiredEl) {
      this.expiredEl.hidden = false;
      if (inEditor && behavior === 'hide') {
        this.expiredEl.dataset.editorNote = 'This section is hidden for shoppers now that the countdown has ended.';
      }
    }
  }
}

if (!customElements.get('od-countdown')) {
  customElements.define('od-countdown', OdCountdown);
}

/* ---------------------------------------------------------------------------
   Email capture
   Shopify's customer form does the real work; this only stops an obviously
   invalid address from costing a page load, and gives the shopper an error
   state that appears instantly.
--------------------------------------------------------------------------- */

function odInitSignup(root = document) {
  root.querySelectorAll('.od-teaser__form').forEach((form) => {
    if (form.dataset.odBound === 'true') return;
    form.dataset.odBound = 'true';

    const input = form.querySelector('input[type="email"]');
    const errorEl = form.querySelector('[data-signup-error]');
    if (!input || !errorEl) return;

    const message = errorEl.dataset.defaultMessage || 'Enter a valid email address.';

    const clearError = () => {
      errorEl.hidden = true;
      input.removeAttribute('aria-invalid');
    };

    form.addEventListener('submit', (event) => {
      // checkValidity covers both "empty" and "not an email" via the required
      // and type attributes already on the input.
      if (input.checkValidity()) {
        clearError();
        return;
      }

      event.preventDefault();
      errorEl.textContent = message;
      errorEl.hidden = false;
      input.setAttribute('aria-invalid', 'true');
      input.focus();
    });

    input.addEventListener('input', clearError);
  });

  // After a successful post Shopify returns to the anchor; move focus to the
  // confirmation so it's announced rather than silently replacing the form.
  const success = root.querySelector('[data-signup-success]');
  if (success && !success.dataset.odFocused) {
    success.dataset.odFocused = 'true';
    success.focus({ preventScroll: true });
  }
}

document.addEventListener('DOMContentLoaded', () => odInitSignup());

// Theme editor: a re-rendered section brings an unbound form with it.
document.addEventListener('shopify:section:load', (event) => odInitSignup(event.target));
