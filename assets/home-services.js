(function(){
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var WA = 'https://wa.me/971522015270?text=';
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

  /* menus */
  var mb = document.getElementById('menu-btn'), mp = document.getElementById('m-panel');
  function closeM(){ mp.hidden = true; mb.setAttribute('aria-expanded','false'); mb.setAttribute('aria-label','Open menu'); }
  mb.addEventListener('click', function(){ if (mp.hidden){ mp.hidden = false; mb.setAttribute('aria-expanded','true'); mb.setAttribute('aria-label','Close menu'); } else closeM(); });
  mp.addEventListener('click', function(e){ if (e.target.tagName === 'A') closeM(); });
  var dd = document.getElementById('svc-dd');
  document.addEventListener('click', function(e){ if (dd.open && !dd.contains(e.target)) dd.open = false; });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && dd.open){ dd.open = false; dd.querySelector('summary').focus(); } });

  /* hero: before / after comparison */
  var cmp = document.getElementById('cmp'), cmpBtns = cmp.querySelectorAll('.cmp-switch button'), hint = document.getElementById('cmp-hint');
  var ringV = document.getElementById('ring-v'), ringN = document.getElementById('ring-n'), RC = 144.51, ringShown = 30, view = 'before', timer = null, DUR = 4600;
  function ringTo(v, col){
    ringV.style.stroke = col; ringV.style.strokeDashoffset = String(RC * (1 - v / 100));
    if (reduce){ ringN.textContent = v; ringShown = v; return; }
    var from = ringShown, t0 = performance.now();
    (function tick(n){ var p = Math.min(1, (n - t0) / 1000); ringN.textContent = Math.round(from + (v - from) * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick); else ringShown = v; })(t0);
  }
  function setView(v){
    view = v;
    cmp.classList.toggle('is-after', v === 'after');
    cmpBtns.forEach(function(b){ b.setAttribute('aria-pressed', String(b.dataset.view === v)); });
    if (v === 'after') ringTo(100, '#10B981'); else ringTo(30, '#EF4444');
  }
  function restartProg(){ cmp.classList.remove('playing'); void cmp.offsetWidth; cmp.classList.add('playing'); }
  function play(){
    if (reduce || timer) return;
    cmp.style.setProperty('--dur', DUR + 'ms'); restartProg();
    timer = setInterval(function(){ setView(view === 'before' ? 'after' : 'before'); restartProg(); }, DUR);
  }
  function pause(){ if (timer){ clearInterval(timer); timer = null; } cmp.classList.remove('playing'); }
  var userStopped = false;
  cmpBtns.forEach(function(b){ b.addEventListener('click', function(){
    userStopped = true; pause(); setView(b.dataset.view);
    hint.querySelector('span').innerHTML = 'Switch between <strong>Before</strong> and <strong>After</strong> to compare.';
  }); });
  if (!reduce){
    if ('IntersectionObserver' in window){
      new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting && !userStopped) play(); else if (!e.isIntersecting) pause(); }); }, {threshold:.35}).observe(cmp);
    } else play();
  } else {
    hint.querySelector('span').innerHTML = 'Switch between <strong>Before</strong> and <strong>After</strong> to compare.';
  }

  /* Clarity Score */
  var Q = [
    {k:'Reports', q:'When did you last receive a profit & loss statement and balance sheet?', o:[['This month','g','Current'],['1 to 3 months ago','a','Getting old'],['More than 3 months ago','r','Out of date','Without recent reports, you can\'t see profit, cash or tax due until it\'s too late to act.'],['I have never received one','r','None received','Without recent reports, you can\'t see profit, cash or tax due until it\'s too late to act.']]},
    {k:'VAT reconciliation', q:'Was your last VAT return reconciled with your bank statements and books?', o:[['Yes, fully reconciled','g','Reconciled'],['Filed, but not reconciled','r','Not reconciled','A VAT return that doesn\'t match your books and bank is hard to defend if the FTA asks questions.'],['Not sure','a','Unclear'],['We are not VAT registered','a','Check threshold','VAT registration is required once taxable supplies pass AED 375,000 in 12 months.']]},
    {k:'Corporate tax', q:'When was your last corporate tax return filed?', o:[['Before the deadline','g','Filed on time'],['After the deadline','r','Filed late','Late corporate tax returns can attract FTA penalties.'],['Not filed yet','a','Return pending'],['Not registered, or not sure','r','Registration needed','UAE companies, including free zone companies, generally need to register for corporate tax.']]},
    {k:'Tax invoices', q:'Do your sales invoices meet the FTA tax invoice requirements?', h:'For example: titled “Tax Invoice”, showing your TRN, and showing VAT separately.', o:[['Yes, every invoice','g','Compliant'],['Some of them','a','Partly','Tax invoices need set details, including the words “Tax Invoice”, your TRN and the VAT amount.'],['No','r','Not compliant','Tax invoices need set details, including the words “Tax Invoice”, your TRN and the VAT amount.'],['Not sure','a','Unclear']]},
    {k:'Bills & receipts', q:'Are your purchase bills and receipts all filed in one place?', o:[['Yes, everything is filed','g','Complete'],['A few are missing','a','A few missing'],['A lot is missing or scattered','r','Scattered'],['Not sure','a','Unclear']]}
  ];
  var PTS = {g:20, a:10, r:0};
  var ans = [], step = 0, tool = document.getElementById('tool'), areasEl = document.getElementById('areas');
  var gVal = document.getElementById('g-val'), gNum = document.getElementById('g-num'), gLbl = document.getElementById('g-lbl'), ARC = 282.74, shown = 0;
  function scoreNow(){ return ans.reduce(function(s, a, i){ return a == null ? s : s + PTS[Q[i].o[a][1]]; }, 0); }
  function countTo(t){
    if (reduce){ shown = t; gNum.textContent = t; return; }
    var from = shown, t0 = performance.now();
    (function tick(n){ var p = Math.min(1, (n - t0) / 700); gNum.textContent = Math.round(from + (t - from) * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick); else shown = t; })(t0);
  }
  function setGauge(final){
    var s = scoreNow(), done = ans.filter(function(a){ return a != null; }).length;
    gVal.style.stroke = !done ? '#38BDF8' : s >= 80 ? '#10B981' : s >= 50 ? '#F59E0B' : '#EF4444';
    gVal.style.strokeDashoffset = String(ARC * (1 - s / 100));
    countTo(s);
    gLbl.textContent = !done ? 'of 100 · answer to start' : final ? 'of 100 · ' + (s >= 80 ? 'clear' : s >= 50 ? 'some gaps' : 'needs attention') : 'of 100 · ' + done + ' of 5 answered';
  }
  function renderAreas(cur){
    areasEl.innerHTML = Q.map(function(item, i){
      var a = ans[i], cls = '', lab = 'Not checked';
      if (a != null){ cls = Q[i].o[a][1]; lab = Q[i].o[a][2]; }
      if (i === cur) cls += ' now';
      return '<div class="area ' + cls + '"><span><i></i>' + esc(item.k) + '</span><em>' + (i === cur && a == null ? 'Answering…' : esc(lab)) + '</em></div>';
    }).join('');
  }
  function renderQ(focus){
    var item = Q[step];
    var h = '<div class="fade"><div class="q-top"><span>Question ' + (step + 1) + ' of 5</span><span>' + esc(item.k) + '</span></div>' +
      '<div class="bar"><span style="width:' + (step / 5 * 100 + 4) + '%"></span></div>' +
      '<fieldset class="q"><legend tabindex="-1">' + esc(item.q) + '</legend>' + (item.h ? '<p class="q-hint">' + esc(item.h) + '</p>' : '') + '<div class="opts">';
    item.o.forEach(function(o, i){ var id = 'q' + step + '-' + i;
      h += '<label class="opt" for="' + id + '"><input type="radio" id="' + id + '" name="q' + step + '" value="' + i + '"' + (ans[step] === i ? ' checked' : '') + '><span>' + esc(o[0]) + '</span></label>'; });
    h += '</div></fieldset></div><div class="q-nav"><button type="button" class="text-btn" id="q-back"' + (step === 0 ? ' disabled' : '') + '>← Back</button><a class="text-btn" href="#book">Skip to booking →</a></div>';
    tool.innerHTML = h; renderAreas(step);
    tool.querySelectorAll('input').forEach(function(inp){
      inp.addEventListener('change', function(){
        ans[step] = Number(inp.value); setGauge(false); renderAreas(step);
        setTimeout(function(){ if (step < 4){ step++; renderQ(true); } else renderResult(); }, reduce ? 0 : 260);
      });
    });
    document.getElementById('q-back').addEventListener('click', function(){ if (step > 0){ step--; renderQ(true); } });
    if (focus) tool.querySelector('legend').focus({preventScroll:true});
  }
  function renderResult(){
    var rows = Q.map(function(item, i){ var o = item.o[ans[i]]; return {k:item.k, s:o[1], label:o[2], pick:o[0], note:o[3]}; });
    var s = scoreNow(), reds = rows.filter(function(r){ return r.s === 'r'; }).length;
    var head = s >= 80 ? 'Your books look clear. Let\'s keep them that way.' : reds ? 'A few areas need attention before they turn into deadlines.' : 'Mostly on track, with a few gaps to close.';
    var reco;
    if (rows[0].s === 'r' || rows[4].s === 'r') reco = '<strong>Where we\'d start:</strong> an accounting cleanup to bring your records up to date, then monthly bookkeeping and reports.';
    else if (rows[2].s === 'r') reco = '<strong>Where we\'d start:</strong> sort out your corporate tax position, then keep the books monthly so every return is on time.';
    else if (rows[1].s === 'r' || rows[3].s === 'r') reco = '<strong>Where we\'d start:</strong> a VAT review to reconcile past returns and fix your invoice format, then monthly bookkeeping.';
    else if (s < 100) reco = '<strong>Where we\'d start:</strong> monthly bookkeeping and a report pack, so these gaps don\'t grow.';
    else reco = '<strong>Keep it that way:</strong> monthly bookkeeping and on-time returns, handled for you.';
    var seen = {}, notes = rows.filter(function(r){ if (!r.note || seen[r.note]) return false; seen[r.note] = 1; return true; }).map(function(r){ return '<li>' + esc(r.note) + '</li>'; }).join('');
    var msg = 'Hi Finasheet, my Clarity Score is ' + s + '/100:\n' + rows.map(function(r){ return '• ' + r.k + ': ' + r.pick; }).join('\n') + '\nI\'d like the full Books Status Check.';
    tool.innerHTML = '<div class="fade"><div class="q-top"><span>Your result</span><span>' + s + ' / 100</span></div><div class="bar"><span style="width:100%"></span></div>' +
      '<div class="res-head" tabindex="-1">' + head + '</div><p>Your full breakdown is on the left.</p>' +
      (notes ? '<ul class="clean res-notes">' + notes + '</ul>' : '') +
      '<div class="res-reco">' + reco + '</div>' +
      '<div class="cta-row"><a class="btn btn-wa btn-lg" href="' + WA + encodeURIComponent(msg) + '" target="_blank" rel="noopener">Send my score on WhatsApp</a><a class="btn btn-secondary btn-lg" href="#book">Book the full check</a></div>' +
      '<p class="res-foot">A quick self-assessment, not tax advice. <button type="button" class="text-btn" id="q-again" style="padding:0;font-size:13px">Start over</button></p></div>';
    renderAreas(-1); setGauge(true);
    document.getElementById('q-again').addEventListener('click', function(){ ans = []; step = 0; setGauge(false); renderQ(true); });
    tool.querySelector('.res-head').focus({preventScroll:true});
  }
  renderQ(false);

  /* report highlighter */
  var ANS = {
    profit:'Yes. You made AED 52,400 profit in September, up from AED 47,800 in August.',
    owed:'AED 21,600 is overdue from 3 customers. The oldest invoice is 47 days late.',
    cash:'AED 96,750 in the bank. After AED 38,200 of supplier bills due in October, about AED 58,550 is free.',
    vat:'About AED 9,150 for July to September. The return and payment are due on 28 October.'
  };
  var rqBtns = document.querySelectorAll('#rq button'), lns = document.querySelectorAll('.paper .ln'), ansT = document.getElementById('ans-t'), cyc = null, ki = 0, keys = ['profit','owed','cash','vat'], stopped = false;
  function pick(k){
    rqBtns.forEach(function(b){ b.setAttribute('aria-pressed', String(b.dataset.k === k)); });
    lns.forEach(function(l){ l.classList.toggle('on', l.dataset.k === k); });
    ansT.textContent = ANS[k]; ki = keys.indexOf(k);
  }
  rqBtns.forEach(function(b){ b.addEventListener('click', function(){ stopped = true; if (cyc){ clearInterval(cyc); cyc = null; } pick(b.dataset.k); }); });
  pick('profit');
  if (!reduce && 'IntersectionObserver' in window){
    new IntersectionObserver(function(es){ es.forEach(function(e){
      if (e.isIntersecting && !cyc && !stopped){ cyc = setInterval(function(){ pick(keys[(ki + 1) % keys.length]); }, 4200); }
      if (!e.isIntersecting && cyc){ clearInterval(cyc); cyc = null; }
    }); }, {threshold:.5}).observe(document.getElementById('report'));
  }

  /* scope builder */
  var form = document.getElementById('scope-form'), linesEl = document.getElementById('rcpt-lines'), basisEl = document.getElementById('rcpt-basis'), waEl = document.getElementById('rcpt-wa');
  var d = new Date(), MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  document.getElementById('rcpt-date').textContent = d.getDate() + ' ' + MON[d.getMonth()].toUpperCase() + ' ' + d.getFullYear();
  var bankN = 2, bankOut = document.getElementById('bank-n');
  function bankLabel(){ return bankN >= 10 ? '10+' : String(bankN); }
  document.getElementById('bank-dn').addEventListener('click', function(){ if (bankN > 1){ bankN--; bankOut.textContent = bankLabel(); build(); } });
  document.getElementById('bank-up').addEventListener('click', function(){ if (bankN < 10){ bankN++; bankOut.textContent = bankLabel(); build(); } });
  var TICK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
  var prev = [];
  function val(n){ var el = form.querySelector('input[name="' + n + '"]:checked'); return el ? el.value : ''; }
  function build(){
    var L = [], back = val('back'), vat = val('vat'), ct = val('ct'), vol = val('vol');
    if (back === '1-6') L.push('Catch-up of 1 to 6 months of past records');
    if (back === '6+') L.push('Cleanup of 6+ months of past records');
    L.push('Monthly bookkeeping: sales, purchases and expenses');
    L.push('Bank reconciliation for ' + bankLabel() + ' account' + (bankN > 1 ? 's' : ''));
    L.push('Monthly report pack in plain English');
    if (vat === 'reg') L.push('VAT returns prepared for your approval');
    else L.push('VAT threshold check (AED 375,000 a year)');
    if (ct === 'return') L.push('Corporate tax return, prepared from your books');
    if (ct === 'reg') L.push('Corporate tax registration, then the annual return');
    if (document.getElementById('audit').checked) L.push('Year-end schedules for your auditor');
    linesEl.innerHTML = L.map(function(t){ return '<li class="rl"' + (prev.indexOf(t) > -1 ? ' style="animation:none"' : '') + '>' + TICK + '<span>' + esc(t) + '</span></li>'; }).join('');
    prev = L;
    var basis = 'Based on ' + vol + ' transactions a month and ' + bankLabel() + ' bank account' + (bankN > 1 ? 's' : '');
    basisEl.textContent = basis;
    waEl.href = WA + encodeURIComponent('Hi Finasheet, I\'d like a quote for this scope:\n' + L.map(function(t){ return '• ' + t; }).join('\n') + '\n' + basis + '.');
  }
  form.addEventListener('change', build);
  build();

  /* steps track */
  if (!reduce && 'IntersectionObserver' in window){
    var steps = document.getElementById('steps');
    if (steps.getBoundingClientRect().top > window.innerHeight){
      steps.classList.add('pre');
      new IntersectionObserver(function(es, ob){ es.forEach(function(e){ if (e.isIntersecting){ steps.classList.remove('pre'); ob.disconnect(); } }); }, {rootMargin:'0px 0px -20% 0px'}).observe(steps);
    }
  }
})();
