/* Finasheet blog listing: category filter + search over the article cards.
   Each card needs data-cat="vat" (etc.) and data-search="words to match". */
(function () {
  function init() {
    var cards = Array.prototype.slice.call(document.querySelectorAll('.bl-grid .bl-card[data-cat]'));
    var chips = Array.prototype.slice.call(document.querySelectorAll('.bl-chip[data-filter]'));
    var input = document.getElementById('bl-q');
    var empty = document.querySelector('.bl-empty');
    var soon = document.querySelector('.bl-soon');
    var countEl = document.querySelector('[data-count-label]');
    var active = 'all';

    // Fill the number badge on each chip
    chips.forEach(function (c) {
      var f = c.getAttribute('data-filter');
      var n = f === 'all' ? cards.length : cards.filter(function (k) { return k.getAttribute('data-cat') === f; }).length;
      var b = c.querySelector('span'); if (b) b.textContent = n;
    });

    function apply() {
      var q = (input && input.value || '').trim().toLowerCase();
      var shown = 0;
      cards.forEach(function (card) {
        var okCat = active === 'all' || card.getAttribute('data-cat') === active;
        var hay = (card.getAttribute('data-search') || '') + ' ' + card.textContent;
        var okQ = !q || hay.toLowerCase().indexOf(q) !== -1;
        var show = okCat && okQ;
        if (show && card.hidden) {
          card.hidden = false;
          card.classList.remove('bl-anim-in'); void card.offsetWidth; card.classList.add('bl-anim-in');
        } else if (!show) card.hidden = true;
        if (show) shown++;
      });
      if (empty) empty.classList.toggle('show', shown === 0);
      if (soon) soon.hidden = shown === 0;
      if (countEl) countEl.textContent = shown + (shown === 1 ? ' article' : ' articles');
    }

    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        active = c.getAttribute('data-filter');
        chips.forEach(function (x) { x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
        apply();
      });
    });
    if (input) {
      input.addEventListener('input', apply);
      document.addEventListener('keydown', function (e) {
        if (e.key === '/' && document.activeElement !== input && !/input|textarea/i.test(document.activeElement.tagName)) {
          e.preventDefault(); input.focus();
        }
      });
    }
    var reset = document.querySelector('[data-reset]');
    if (reset) reset.addEventListener('click', function () {
      if (input) input.value = '';
      active = 'all';
      chips.forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-filter') === 'all' ? 'true' : 'false'); });
      apply();
    });
    apply();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
