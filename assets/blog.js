/* Finasheet blog article: scroll reveal, reading progress, table of contents, share, counters. */
(function () {
  var doc = document.documentElement;
  doc.classList.add('bl-js');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    /* 1. Scroll reveal (also triggers the cover, checklist and callout animations) */
    var targets = document.querySelectorAll('[data-reveal], .bl-cover, .bl-check, .bl-callout');
    if ('IntersectionObserver' in window && !reduce) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
      targets.forEach(function (el, i) {
        if (el.hasAttribute('data-delay')) el.style.transitionDelay = el.getAttribute('data-delay') + 'ms';
        io.observe(el);
      });
    } else {
      targets.forEach(function (el) { el.classList.add('is-in'); });
    }

    /* 2. Count-up numbers in the cover card */
    var counters = document.querySelectorAll('[data-count]');
    function runCount(el) {
      var end = parseFloat(el.getAttribute('data-count')), start = null, dur = 1600;
      function fmt(n) { return 'AED ' + Math.round(n).toLocaleString('en-US'); }
      if (reduce) { el.textContent = fmt(end); return; }
      function step(t) {
        if (!start) start = t;
        var p = Math.min((t - start) / dur, 1), eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(end * eased);
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    var cover = document.querySelector('.bl-cover');
    if (cover && counters.length) {
      if ('IntersectionObserver' in window) {
        var co = new IntersectionObserver(function (es) {
          if (es[0].isIntersecting) { counters.forEach(runCount); co.disconnect(); }
        }, { threshold: 0.3 });
        co.observe(cover);
      } else counters.forEach(runCount);
    }

    /* 3. Reading progress + active table-of-contents link */
    var article = document.querySelector('.bl-article');
    var bar = document.querySelector('.bl-progress');
    var tocBar = document.querySelector('.bl-toc-bar i');
    var tocPct = document.querySelector('.bl-toc-pct');
    var links = Array.prototype.slice.call(document.querySelectorAll('.bl-toc a[href^="#"]'));
    var sections = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
    var ticking = false;

    function update() {
      ticking = false;
      if (!article) return;
      var r = article.getBoundingClientRect();
      var total = r.height - window.innerHeight * 0.6;
      var p = Math.max(0, Math.min(1, (-r.top + window.innerHeight * 0.2) / (total > 0 ? total : 1)));
      if (bar) bar.style.transform = 'scaleX(' + p + ')';
      if (tocBar) tocBar.style.width = (p * 100).toFixed(1) + '%';
      if (tocPct) tocPct.textContent = Math.round(p * 100) + '% read';

      var current = 0;
      sections.forEach(function (s, i) { if (s && s.getBoundingClientRect().top < 220) current = i; });
      links.forEach(function (a, i) { a.classList.toggle('is-active', i === current); });
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();

    /* On mobile the table of contents is collapsible; keep it open on desktop. */
    var toc = document.querySelector('.bl-toc');
    var mq = window.matchMedia('(max-width: 900px)');
    function syncToc() { if (toc) toc.open = !mq.matches; }
    syncToc();
    if (mq.addEventListener) mq.addEventListener('change', syncToc);
    if (toc) {
      toc.querySelector('summary').addEventListener('click', function (e) { if (!mq.matches) e.preventDefault(); });
      links.forEach(function (a) { a.addEventListener('click', function () { if (mq.matches) toc.open = false; }); });
    }

    /* 4. Copy link button */
    var copyBtn = document.querySelector('[data-copy-link]');
    var copied = document.querySelector('.bl-copied');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var url = window.location.href.split('#')[0];
        var done = function () { if (copied) { copied.classList.add('show'); setTimeout(function () { copied.classList.remove('show'); }, 1800); } };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, done);
        else { var t = document.createElement('textarea'); t.value = url; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (err) {} document.body.removeChild(t); done(); }
      });
    }

    /* 5. Smooth FAQ open/close */
    if (!reduce) {
      document.querySelectorAll('.bl-faq details').forEach(function (d) {
        var sum = d.querySelector('summary'), ans = d.querySelector('.ans');
        if (!sum || !ans || !ans.animate) return;
        sum.addEventListener('click', function (e) {
          e.preventDefault();
          if (d.open) {
            var h = ans.offsetHeight;
            ans.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 260, easing: 'ease' }).onfinish = function () { d.open = false; };
          } else {
            d.open = true;
            var h2 = ans.offsetHeight;
            ans.animate([{ height: '0px', opacity: 0 }, { height: h2 + 'px', opacity: 1 }], { duration: 320, easing: 'ease' });
          }
        });
      });
    }
  });
})();
