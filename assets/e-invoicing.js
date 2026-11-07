/* UAE e-invoicing landing page: attribution, CTA routing, measurement and the readiness-check form.
   Events go to window.dataLayer for GTM. Only `lead_form_success` represents an accepted lead. */
(() => {
  const dl = (window.dataLayer = window.dataLayer || []);
  const push = (event, params) => dl.push(Object.assign({ event, page_type: 'e_invoicing_landing' }, params || {}));

  /* ---------- Attribution: capture once per session, survive in-page navigation ---------- */
  const ATTR_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'gbraid', 'wbraid'];
  const STORE = 'fs_ei_attribution';
  function readStore() { try { return JSON.parse(sessionStorage.getItem(STORE) || '{}'); } catch (e) { return {}; } }
  function writeStore(v) { try { sessionStorage.setItem(STORE, JSON.stringify(v)); } catch (e) { /* storage blocked: keep in memory */ } }
  const params = new URLSearchParams(location.search);
  let attribution = readStore();
  if (ATTR_KEYS.some((k) => params.get(k))) {
    attribution = {};
    ATTR_KEYS.forEach((k) => { if (params.get(k)) attribution[k] = params.get(k).slice(0, 200); });
    attribution.landing_page = location.href.split('#')[0].slice(0, 500);
    attribution.referrer = (document.referrer || '').slice(0, 500);
    writeStore(attribution);
  } else if (!attribution.landing_page) {
    attribution.landing_page = location.href.split('#')[0].slice(0, 500);
    attribution.referrer = (document.referrer || '').slice(0, 500);
    writeStore(attribution);
  }

  /* ---------- Shared header / mobile bar: point the consultation CTA at this page's form ---------- */
  document.querySelectorAll('.fs-header [data-fs-cta="consultation"], .fs-mobile-cta [data-fs-cta="consultation"]').forEach((a) => {
    a.setAttribute('href', '#readiness-check');
    a.textContent = 'Free Readiness Check';
    a.dataset.eiEvent = 'readiness_check_click';
    a.dataset.eiLoc = a.closest('.fs-mobile-cta') ? 'mobile-sticky' : 'header';
  });

  /* ---------- CTA clicks (intent signals, not conversions) ---------- */
  const form = document.getElementById('ei-form');
  const leadTypeInput = form ? form.querySelector('[name="lead_type"]') : null;
  const submitLabel = form ? form.querySelector('.ei-btn-label') : null;
  const LABELS = {
    readiness_check: 'Get my free readiness check',
    annual_plan: 'Get my free readiness check',
    monthly_plan: 'Ask about monthly billing',
    erp_integration: 'Request my integration quote',
    demo: 'Request my product demo',
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('a, button');
    if (!el) return;
    const href = el.getAttribute('href') || '';
    const loc = el.dataset.eiLoc || '';
    if (/^https:\/\/wa\.me\//.test(href)) {
      push('whatsapp_click', { cta_location: loc || 'unknown' });
      return;
    }
    const ev = el.dataset.eiEvent;
    if (ev && ev !== 'whatsapp_click') push(ev, { cta_location: loc });
    if (href === '#readiness-check' && leadTypeInput) {
      const type = el.dataset.eiLeadType || 'readiness_check';
      leadTypeInput.value = type;
      if (submitLabel) submitLabel.textContent = LABELS[type] || LABELS.readiness_check;
      // On narrow screens, jump straight to the form card rather than the section intro.
      const cardEl = document.getElementById('ei-form-card');
      if (window.matchMedia('(max-width: 900px)').matches && cardEl) {
        e.preventDefault();
        cardEl.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        try { history.replaceState(null, '', '#readiness-check'); } catch (err) { /* ignore */ }
      }
      // Move focus to the first field after the scroll, for keyboard and screen-reader users.
      setTimeout(() => { const f = document.getElementById('ei-name'); if (f && !form.hidden) f.focus({ preventScroll: true }); }, 450);
    }
  });

  /* ---------- view_pricing: once, when the pricing section is meaningfully visible ---------- */
  const pricing = document.getElementById('pricing');
  if (pricing && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((en) => en.isIntersecting)) { push('view_pricing'); io.disconnect(); }
    }, { threshold: 0.35 });
    io.observe(pricing);
  }

  /* ---------- Motion helpers ---------- */
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const whenVisible = (el, cb, threshold = 0.25) => {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { cb(true); return; }
    new IntersectionObserver((en) => en.forEach((e) => cb(e.isIntersecting)), { threshold }).observe(el);
  };
  const raf = window.requestAnimationFrame || ((f) => setTimeout(() => f(Date.now()), 16));

  /* ---------- Hero: the 5-corner model, played as a live sequence ---------- */
  (() => {
    const st = document.getElementById('ei-stage');
    if (!st) return;
    const P = [1, 2, 3, 4, 5].map((i) => document.getElementById('ei-p' + i));
    const K = [1, 2, 3, 4, 5].map((i) => document.getElementById('ei-k' + i));
    const N = { 2: 'ei-n2', 3: 'ei-n3', 4: 'ei-n4', 5: 'ei-n5' };
    const label = document.getElementById('ei-st'), cnt = document.getElementById('ei-cnt');
    P.forEach((p) => { try { p.style.setProperty('--len', Math.ceil(p.getTotalLength())); } catch (e) { /* ignore */ } });
    const set = (n) => { st.classList.remove('s0', 's1', 's2', 's3', 's4', 's5'); st.classList.add('s' + n); };
    const node = (n, v) => { const el = document.getElementById(N[n]); el.classList.toggle('on', v); if (v) { el.classList.remove('ping'); void el.offsetWidth; el.classList.add('ping'); } };
    // draw a path and move a glowing packet along it
    const travel = (i, ms) => {
      const p = P[i], k = K[i];
      p.style.setProperty('--d', ms / 1000 + 's');
      p.classList.add('on');
      let len = 0; try { len = p.getTotalLength(); } catch (e) { return; }
      const t0 = performance.now();
      k.style.opacity = 1;
      const tick = (now) => {
        const t = Math.min(1, (now - t0) / ms), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const pt = p.getPointAtLength(e * len);
        k.setAttribute('cx', pt.x); k.setAttribute('cy', pt.y);
        if (t < 1) raf(tick); else setTimeout(() => { k.style.opacity = 0; }, 120);
      };
      raf(tick);
    };
    const reset = () => { set(0); label.textContent = 'Draft'; cnt.textContent = '312'; P.forEach((p) => p.classList.remove('on')); K.forEach((k) => { k.style.opacity = 0; }); [2, 3, 4, 5].forEach((n) => node(n, false)); };
    const final = () => { set(5); label.textContent = 'Delivered'; cnt.textContent = '313'; P.forEach((p) => p.classList.add('on')); [2, 3, 4, 5].forEach((n) => document.getElementById(N[n]).classList.add('on')); };
    if (reduced) { final(); return; }
    const steps = [
      [0, reset],
      [700, () => { set(1); label.textContent = 'Validating'; }],
      [1000, () => { set(2); label.textContent = 'Sending'; travel(0, 550); }],
      [1600, () => node(2, true)],
      [1800, () => { set(3); travel(1, 750); }],
      [2600, () => node(3, true)],
      [2800, () => { set(4); travel(2, 750); }],
      [3600, () => { node(4, true); label.textContent = 'Reporting'; }],
      [3800, () => { travel(3, 1000); travel(4, 1000); }],
      [4850, () => { node(5, true); set(5); label.textContent = 'Delivered'; cnt.textContent = '313'; }],
    ];
    let timers = [], loop = null;
    const run = () => { timers.forEach(clearTimeout); timers = steps.map(([t, f]) => setTimeout(f, t)); };
    whenVisible(st, (vis) => {
      if (vis && !loop) { run(); loop = setInterval(run, 9000); }
      else if (!vis && loop) { clearInterval(loop); loop = null; timers.forEach(clearTimeout); final(); }
    }, 0.2);
  })();

  /* ---------- Dark section: strike the jargon, then walk the five corners (click to explore) ---------- */
  (() => {
    const box = document.getElementById('ei-corners');
    if (!box) return;
    const jar = [...document.querySelectorAll('#ei-jar span')];
    const btns = [...box.querySelectorAll('.ei-stn')];
    const fill = document.getElementById('ei-fill'), chip = document.getElementById('ei-chip');
    const panel = document.getElementById('ei-cpanel');
    const pn = document.getElementById('ei-cp-n'), pt = document.getElementById('ei-cp-t'), pd = document.getElementById('ei-cp-d');
    const last = btns.length - 1;
    let cur = 0, auto = !reduced, loop = null;
    const show = (i, focus) => {
      cur = i;
      btns.forEach((b, k) => {
        b.setAttribute('aria-selected', String(k === i));
        b.tabIndex = k === i ? 0 : -1;
        b.classList.toggle('on', k < i);
      });
      fill.style.width = (i / last) * 100 + '%';
      chip.style.left = `calc(24px + 10% + (100% - 48px - 20%) * ${i / last})`;
      panel.classList.add('swap');
      setTimeout(() => {
        const b = btns[i];
        pn.textContent = i + 1;
        pt.textContent = `${b.querySelector('strong').textContent} · ${b.querySelector('small').textContent.toLowerCase()}`;
        pd.textContent = b.querySelector('.ei-stn__d').textContent;
        panel.classList.remove('swap');
      }, 180);
      if (focus) btns[i].focus();
    };
    const stop = () => { auto = false; clearInterval(loop); loop = null; };
    btns.forEach((b, i) => {
      b.addEventListener('click', () => { stop(); show(i); push('five_corner_click', { corner: i + 1 }); });
      b.addEventListener('keydown', (e) => {
        const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (d) { e.preventDefault(); stop(); show((i + d + btns.length) % btns.length, true); }
      });
    });
    if (reduced) { jar.forEach((j) => j.classList.add('x')); return; }
    let struck = false;
    whenVisible(box.closest('section'), (vis) => {
      if (vis && !struck) { struck = true; jar.forEach((j, k) => setTimeout(() => j.classList.add('x'), 200 + k * 180)); }
      if (vis && auto && !loop) { loop = setInterval(() => show(cur === last ? 0 : cur + 1), 2200); }
      else if (!vis && loop) { clearInterval(loop); loop = null; }
    }, 0.35);
  })();

  /* ---------- "Keep it. We'll connect it." -> highlight the ERP card ---------- */
  document.querySelectorAll('[data-ei-switch="erp"]').forEach((a) => a.addEventListener('click', () => {
    push('erp_integration_enquiry', { cta_location: a.dataset.eiLoc || '' });
    const card = document.getElementById('ei-way-erp');
    if (!card) return;
    setTimeout(() => { card.classList.add('flash'); setTimeout(() => card.classList.remove('flash'), 1800); }, 500);
  }));

  /* ---------- Pricing: yearly / monthly toggle + "will it be enough?" estimator ---------- */
  (() => {
    const grid = document.querySelector('.ei-pricing');
    const radios = [...document.querySelectorAll('[data-ei-bill]')];
    if (!grid || !radios.length) return;
    const cta = document.getElementById('ei-price-cta');
    const range = document.getElementById('ei-calc-r'), outV = document.getElementById('ei-calc-v'), out = document.getElementById('ei-calc-out');
    const bill = () => grid.dataset.bill;
    const calc = () => {
      if (!range) return;
      const n = +range.value, yearly = bill() === 'yearly';
      outV.textContent = n;
      range.style.setProperty('--fill', (n / +range.max) * 100 + '%');
      if (yearly) {
        const yr = n * 12, spare = 1500 - yr;
        out.innerHTML = n === 0 ? 'Move the slider to your typical month.'
          : spare >= 0 ? `<b class="ok">Covered.</b> About ${yr.toLocaleString('en-US')} a year, inside your 1,500${spare >= 300 ? ` with ${spare.toLocaleString('en-US')} to spare` : ''}.`
          : `<b class="up">You'll need a top-up.</b> About ${yr.toLocaleString('en-US')} a year. We'll size it with you on your call.`;
      } else {
        out.innerHTML = n === 0 ? 'Move the slider to your typical month.'
          : n <= 125 ? `<b class="ok">Covered.</b> ${n} a month, inside your 125.`
          : `<b class="up">You'll need a top-up.</b> ${n} a month is above 125. We'll size it with you on your call.`;
      }
    };
    const select = (r, focus) => {
      radios.forEach((x) => { const on = x === r; x.setAttribute('aria-checked', String(on)); x.tabIndex = on ? 0 : -1; });
      grid.dataset.bill = r.dataset.eiBill;
      if (cta) cta.dataset.eiLeadType = r.dataset.eiBill === 'yearly' ? 'annual_plan' : 'monthly_plan';
      const total = grid.querySelector('.ei-receipt__total p');
      if (total) { total.classList.remove('ei-pop'); void total.offsetWidth; total.classList.add('ei-pop'); }
      calc();
      if (focus) r.focus();
    };
    radios.forEach((r, i) => {
      r.addEventListener('click', () => { if (r.getAttribute('aria-checked') !== 'true') { select(r); push('pricing_toggle', { billing_period: r.dataset.eiBill }); } });
      r.addEventListener('keydown', (e) => {
        const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (d) { e.preventDefault(); const nr = radios[(i + d + radios.length) % radios.length]; select(nr, true); push('pricing_toggle', { billing_period: nr.dataset.eiBill }); }
      });
    });
    if (range) { range.addEventListener('input', calc); calc(); }
  })();

  /* ---------- Mobile sticky bar: step aside while the form itself is on screen ---------- */
  const sticky = document.querySelector('.fs-mobile-cta');
  const leadSection = document.getElementById('readiness-check');
  if (sticky && leadSection && 'IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      const visible = entries.some((en) => en.isIntersecting);
      sticky.style.visibility = visible ? 'hidden' : '';
    }, { threshold: 0.15 }).observe(leadSection);
  }

  /* ---------- Readiness-check form ---------- */
  if (!form) return;
  const card = document.getElementById('ei-form-card');
  const statusEl = document.getElementById('ei-form-status');
  const success = document.getElementById('ei-success');
  const button = form.querySelector('button[type="submit"]');
  const fields = {
    full_name: form.elements.full_name,
    company: form.elements.company,
    phone: form.elements.phone,
    email: form.elements.email,
  };
  const WA = 'https://wa.me/971522015270';
  let started = false;
  let submitting = false;

  form.addEventListener('focusin', () => {
    if (started) return;
    started = true;
    push('lead_form_start', { lead_type: leadTypeInput.value });
  });

  function normalisePhone(raw) {
    let d = String(raw || '').replace(/[^\d]/g, '');
    if (d.startsWith('00971')) d = d.slice(5);
    else if (d.startsWith('971')) d = d.slice(3);
    if (d.startsWith('0')) d = d.slice(1);
    return d;
  }

  const validators = {
    full_name: (v) => (v.trim().length < 2 ? 'Please enter your name.' : ''),
    company: (v) => (v.trim().length < 2 ? 'Please enter your company name.' : ''),
    phone: (v) => (/^5\d{8}$/.test(normalisePhone(v)) || /^[2-9]\d{7}$/.test(normalisePhone(v)) ? '' : 'Enter a UAE number, e.g. 50 123 4567.'),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter a valid email address.'),
  };

  function showError(name, msg) {
    const input = fields[name];
    const err = document.getElementById(input.getAttribute('aria-describedby'));
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (err) err.textContent = msg;
  }

  Object.keys(fields).forEach((name) => {
    fields[name].addEventListener('blur', () => { if (fields[name].value) showError(name, validators[name](fields[name].value)); });
    fields[name].addEventListener('input', () => { if (fields[name].getAttribute('aria-invalid') === 'true') showError(name, validators[name](fields[name].value)); });
  });

  function setStatus(html) {
    if (!html) { statusEl.hidden = true; statusEl.innerHTML = ''; return; }
    statusEl.dataset.status = 'error';
    statusEl.innerHTML = html;
    statusEl.hidden = false;
  }

  function setLoading(on) {
    submitting = on;
    form.classList.toggle('is-loading', on);
    button.disabled = on;
    button.setAttribute('aria-busy', String(on));
  }

  function waFallback(data) {
    const text = `Hi Finasheet, I'd like an e-invoicing readiness check.\nName: ${data.full_name}\nCompany: ${data.company}\nPhone: ${data.phone}\nEmail: ${data.email}`;
    return `${WA}?text=${encodeURIComponent(text)}`;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitting) return;
    setStatus('');

    let firstBad = null;
    Object.keys(fields).forEach((name) => {
      const msg = validators[name](fields[name].value);
      showError(name, msg);
      if (msg && !firstBad) firstBad = fields[name];
    });
    if (firstBad) { firstBad.focus(); return; }

    const data = {
      full_name: fields.full_name.value.trim(),
      company: fields.company.value.trim(),
      phone: '+971' + normalisePhone(fields.phone.value),
      email: fields.email.value.trim().toLowerCase(),
      current_software: form.elements.current_software.value,
      monthly_volume: form.elements.monthly_volume.value,
      lead_type: leadTypeInput.value,
      website: form.elements.website.value, // honeypot
      page_url: location.href.split('#')[0].slice(0, 500),
      submitted_at: new Date().toISOString(),
    };
    Object.assign(data, attribution);

    push('lead_form_submit', { lead_type: data.lead_type });

    const endpoint = (form.dataset.endpoint || '').trim();
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(endpoint)) {
      // Not configured: never pretend it worked. Offer a working route instead.
      setStatus(`We couldn't send your request online right now. Please <a href="${waFallback(data)}" target="_blank" rel="noopener" data-ei-loc="form-fallback">send it to us on WhatsApp</a> or email <a href="mailto:support@finasheet.com">support@finasheet.com</a>.`);
      push('lead_form_error', { reason: 'endpoint_not_configured' });
      return;
    }

    setLoading(true);
    const controller = 'AbortController' in window ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 15000) : null;
    try {
      // text/plain keeps this a "simple" CORS request, which Apps Script web apps accept.
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data),
        signal: controller ? controller.signal : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'rejected');

      push('lead_form_success', { lead_type: data.lead_type, lead_id: json.lead_id || '' });
      if (window.fbq) { try { window.fbq('track', 'Lead', { content_name: 'E-invoicing readiness check', lead_type: data.lead_type }); } catch (err) { /* ignore */ } }
      document.getElementById('ei-success-phone').textContent = data.phone;
      form.hidden = true;
      success.hidden = false;
      success.focus();
      card.scrollIntoView({ block: 'nearest' });
    } catch (err) {
      const reason = err && err.name === 'AbortError' ? 'timeout' : 'network_or_rejected';
      push('lead_form_error', { reason });
      setStatus(`Something went wrong sending your request. Please try again, or <a href="${waFallback(data)}" target="_blank" rel="noopener" data-ei-loc="form-fallback">send it to us on WhatsApp</a>.`);
    } finally {
      if (timer) clearTimeout(timer);
      setLoading(false);
    }
  });
})();
