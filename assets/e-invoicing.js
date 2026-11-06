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
    readiness_check: 'Get My Free Readiness Check',
    annual_plan: 'Get My Free Readiness Check',
    monthly_plan: 'Ask About Monthly Billing',
    erp_integration: 'Request My Integration Quote',
    demo: 'Request My Product Demo',
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
