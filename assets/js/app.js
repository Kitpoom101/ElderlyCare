/* JangChad demo app — hash router + views for the company side (#/c/…) and freelancer side (#/f/…). */
(function () {
  'use strict';
  const S = JC.store, T = JC.tax, D = JC.docs, I = JC.i18n;
  const t = (k, v) => I.t(k, v);
  const esc = D.esc;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const U = S.util;

  // ---------- formatting ----------
  const lang = () => I.lang;
  const loc = () => (lang() === 'th' ? 'th-TH' : 'en-GB');
  const money = n => '฿' + (+n || 0).toLocaleString(loc(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money0 = n => '฿' + Math.round(+n || 0).toLocaleString(loc());
  const fdate = d => (d ? new Date(d).toLocaleDateString(loc(), { day: 'numeric', month: 'short', year: 'numeric' }) : '–');
  const fmonth = m => new Date(m + '-15').toLocaleDateString(loc(), { month: 'long', year: 'numeric' });
  const nm = x => (x ? (lang() === 'en' && x.nameEn ? x.nameEn : x.name) : '–');
  const tl = o => (o ? o[lang()] || o.th : '');
  const typeName = k => (T.INCOME_TYPES[k] ? `${T.INCOME_TYPES[k].section} · ${tl(T.INCOME_TYPES[k].label)}` : k);
  const pct = r => (r * 100).toLocaleString(loc(), { maximumFractionDigits: 2 }) + '%';
  const chip = s => `<span class="chip st-${s}">${t('st.' + s)}</span>`;
  const yearOf = d => new Date(d).getFullYear();
  const thisYear = () => new Date().getFullYear();
  const num = v => { const n = parseFloat(String(v).replace(/,/g, '')); return isNaN(n) ? 0 : n; };
  const btn = (act, key, cls = 'line', data = {}) =>
    `<button type="button" class="btn ${cls} sm" data-act="${act}" ${Object.entries(data).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ')}>${t(key)}</button>`;
  const typeOptions = sel => Object.keys(T.INCOME_TYPES).map(k =>
    `<option value="${k}" ${k === sel ? 'selected' : ''}>${typeName(k)} — ${t('wht')} ${pct(T.INCOME_TYPES[k].rate)}</option>`).join('');

  // ---------- small components ----------
  const kpi = (label, val, sub = '', tone = '') => `<div class="kpi ${tone}"><span>${label}</span><b>${val}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
  const pageHead = (title, sub = '', actions = '') =>
    `<div class="ph"><div><h1>${title}</h1>${sub ? `<p class="muted">${sub}</p>` : ''}</div>${actions ? `<div class="ph-act">${actions}</div>` : ''}</div>`;
  function table(cols, rows, empty) {
    if (!rows.length) return `<div class="empty">${empty || t('empty')}</div>`;
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr>${cols.map(c => `<th class="${c.cls || ''}">${c.label}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(r => `<tr ${r.attrs || ''}>${r.cells.map((v, i) => `<td class="${cols[i].cls || ''}" data-label="${esc(cols[i].label)}"><div class="cv">${v ?? ''}</div></td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  const rowLink = href => `class="click" data-act="go" data-href="${href}"`;
  const tabs = (key, items, active) => `<div class="tabs" role="tablist">${items.map(([v, label, count]) =>
    `<button type="button" role="tab" class="${v === active ? 'on' : ''}" aria-selected="${v === active}" data-act="ui" data-key="${key}" data-val="${v}">${label}${count ? ` <em>${count}</em>` : ''}</button>`).join('')}</div>`;
  const yearSelect = (years, sel) => `<label class="fsel"><span>${t('taxYear')}</span><select data-ui="year">${years.map(y => `<option value="${y}" ${+y === +sel ? 'selected' : ''}>${lang() === 'th' ? y + 543 : y}</option>`).join('')}</select></label>`;
  const callout = (html, tone = 'info') => `<div class="callout ${tone}">${html}</div>`;
  const docBtn = (kind, id, label) => `<button type="button" class="link" data-act="doc" data-kind="${kind}" data-id="${id}">${label || t('view')}</button>`;

  let toastTimer;
  function toast(msg, isErr) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.toggle('err', !!isErr);
    el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('on'), 3200);
  }

  // ---------- UI state (filters etc., not persisted) ----------
  const ui = { jobs: 'all', fjobs: 'all', docTab: 'all', fdocTab: 'cert', q: '', party: '', year: thisYear(), month: '', other: 0 };
  let cur = { side: 'c', page: 'dashboard', id: null };

  const curC = () => S.company(S.session.companyId);
  const curF = () => S.freelancer(S.session.freelancerId);

  // ---------- issue / alert text ----------
  function issueText(i) {
    const o = i.orderId ? S.order(i.orderId) : null;
    const f = i.freelancerId ? S.freelancer(i.freelancerId) : o ? S.freelancer(o.freelancerId) : null;
    const v = { no: o ? o.no : '', name: nm(f), ...i.data };
    ['po', 'inv', 'paid', 'expected', 'actual', 'received'].forEach(k => { if (v[k] != null) v[k] = money(v[k]); });
    if (i.kind === 'kyc_missing') v.docs = i.data.docs.map(d => t('kyc.' + d)).join(', ');
    if (i.kind === 'filing_due') { v.month = fmonth(i.data.month); v.due = fdate(i.data.due.online); }
    return t('iss.' + i.kind, v);
  }
  function alertText(a) {
    if (a.kind === 'issue') return issueText(a.issue);
    const o = a.orderId ? S.order(a.orderId) : null;
    return t('al.' + a.kind, { no: o ? o.no : '', title: o ? o.title : '', name: o ? nm(S.freelancer(o.freelancerId)) : '', company: o ? nm(S.company(o.companyId)) : '', client: a.data ? a.data.client : '' });
  }
  function alertHref(a) {
    const side = S.session.role === 'company' ? 'c' : 'f';
    if (a.orderId) return `#/${side}/jobs/${a.orderId}`;
    if (a.kind === 'issue') return a.issue.freelancerId ? `#/c/freelancers/${a.issue.freelancerId}` : '#/c/checks';
    if (a.kind === 'ext_no_cert') return '#/f/income';
    return `#/${side}/dashboard`;
  }

  // =====================================================================
  // COMPANY SIDE
  // =====================================================================
  const companyOrders = () => S.state.orders.filter(o => o.companyId === curC().id);

  function cDashboard() {
    const c = curC(), orders = companyOrders();
    const active = orders.filter(o => ['sent', 'invoiced', 'approved', 'paid'].includes(o.status));
    const toApprove = orders.filter(o => o.status === 'invoiced'), toPay = orders.filter(o => o.status === 'approved');
    const m = U.monthKey(U.today());
    const pays = S.state.payments.filter(p => p.companyId === c.id);
    const whtMonth = U.sum(pays.filter(p => U.monthKey(p.paidAt) === m), p => p.wht);
    const paidYTD = U.sum(pays.filter(p => yearOf(p.paidAt) === thisYear()), p => p.gross);
    const issues = S.companyIssues(c.id);
    const queue = [...toApprove, ...toPay];
    const recent = orders.flatMap(o => o.history.map(h => ({ ...h, o }))).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
    return `${pageHead(t('c.dash.title', { name: nm(c) }), t('c.dash.sub'), btn('newPO', 'po.new', 'solid'))}
      <div class="kpis">
        ${kpi(t('kpi.active'), active.length, t('kpi.activeSub'))}
        ${kpi(t('kpi.toApprove'), toApprove.length, '', toApprove.length ? 'warn' : '')}
        ${kpi(t('kpi.toPay'), toPay.length, money0(U.sum(toPay, o => S.currentInvoice(o.id)?.amount)), toPay.length ? 'warn' : '')}
        ${kpi(t('kpi.whtMonth'), money0(whtMonth), t('kpi.whtMonthSub', { due: fdate(S.filingDue(m).online) }))}
        ${kpi(t('kpi.paidYTD'), money0(paidYTD))}
        ${kpi(t('kpi.issues'), issues.length, '', issues.some(i => i.severity === 'high') ? 'bad' : '')}
      </div>
      <div class="cols">
        <section class="card"><h2>${t('c.dash.queue')}</h2>
          ${queue.length ? `<ul class="queue">${queue.map(o => {
            const inv = S.currentInvoice(o.id), mism = inv && inv.amount !== o.amount;
            return `<li><div><span class="mono">${o.no}</span> ${chip(o.status)}${mism ? ` <span class="chip bad">${t('mismatch')}</span>` : ''}
              <b>${esc(o.title)}</b><small>${nm(S.freelancer(o.freelancerId))} · ${money(inv ? inv.amount : o.amount)}</small></div>
              ${o.status === 'invoiced' ? btn('go', 'act.review', 'solid', { href: `#/c/jobs/${o.id}` }) : btn('pay', 'act.pay', 'solid', { id: o.id })}</li>`;
          }).join('')}</ul>` : `<div class="empty">${t('c.dash.queueEmpty')}</div>`}
        </section>
        <section class="card"><h2>${t('c.dash.issues')} <a class="link" href="#/c/checks">${t('seeAll')}</a></h2>
          ${issues.length ? `<ul class="issues">${issues.slice(0, 5).map(i => `<li class="sev-${i.severity}">${issueText(i)}</li>`).join('')}</ul>` : `<div class="empty ok">${t('checks.clean')}</div>`}
        </section>
      </div>
      <section class="card"><h2>${t('recent')}</h2>
        <ul class="feed">${recent.map(h => `<li><time>${fdate(h.at)}</time><a href="#/c/jobs/${h.o.id}"><span class="mono">${h.o.no}</span> ${esc(h.o.title)}</a> — ${t('ev.' + h.status)}</li>`).join('')}</ul>
      </section>`;
  }

  function cFreelancers(id) {
    if (id) return cFreelancerDetail(id);
    const c = curC(), list = S.membersOf(c.id), orders = companyOrders();
    const rows = list.map(f => {
      const fo = orders.filter(o => o.freelancerId === f.id);
      const paid = U.sum(S.state.payments.filter(p => p.companyId === c.id && p.freelancerId === f.id && yearOf(p.paidAt) === thisYear()), p => p.gross);
      const ok = T.validTaxId(f.taxId);
      return {
        attrs: rowLink(`#/c/freelancers/${f.id}`),
        cells: [`<b>${nm(f)}</b><small class="muted block">${tl(f.role)}</small>`,
          `<span class="mono">${esc(T.formatTaxId(f.taxId))}</span> ${ok ? '<span class="ok-ic" title="OK">✓</span>' : `<span class="chip bad">${t('taxId.invalid')}</span>`}`,
          typeName(f.defaultType), fo.length, money(paid), kycChips(f)]
      };
    });
    return `${pageHead(t('nav.freelancers'), t('c.fl.sub'), btn('invite', 'fl.invite', 'solid'))}
      ${table([{ label: t('col.name') }, { label: t('col.taxId') }, { label: t('col.type') }, { label: t('col.jobs'), cls: 'r' }, { label: t('col.paidYTD'), cls: 'r' }, { label: t('col.docs') }], rows)}`;
  }
  const kycChips = f => Object.keys(f.kyc || {}).map(k => `<span class="chip ${f.kyc[k] ? 'good' : 'muted'}">${f.kyc[k] ? '✓' : '○'} ${t('kyc.' + k)}</span>`).join(' ');

  function cFreelancerDetail(id) {
    const c = curC(), f = S.freelancer(id);
    if (!f || !S.membersOf(c.id).includes(f)) return notFound();
    const orders = companyOrders().filter(o => o.freelancerId === f.id);
    const pays = S.state.payments.filter(p => p.companyId === c.id && p.freelancerId === f.id && yearOf(p.paidAt) === thisYear());
    const certs = S.state.certificates.filter(x => x.companyId === c.id && x.freelancerId === f.id);
    const ok = T.validTaxId(f.taxId);
    return `<a class="back" href="#/c/freelancers">← ${t('nav.freelancers')}</a>
      ${pageHead(nm(f), tl(f.role), btn('newPO', 'po.new', 'solid', { fid: f.id }))}
      <div class="cols">
        <section class="card"><h2>${t('fl.profile')}</h2>
          <dl class="dl">
            <dt>${t('col.taxId')}</dt><dd><span class="mono">${esc(T.formatTaxId(f.taxId))}</span> ${ok ? '<span class="ok-ic">✓</span>' : `<span class="chip bad">${t('taxId.invalid')}</span> ${btn('editTaxId', 'fix', 'line', { id: f.id })}`}</dd>
            <dt>${t('col.type')}</dt><dd>${typeName(f.defaultType)}</dd>
            <dt>${t('f.email')}</dt><dd>${esc(f.email || '–')}</dd>
            <dt>${t('f.phone')}</dt><dd>${esc(f.phone || '–')}</dd>
            <dt>${t('f.address')}</dt><dd>${esc(f.address || '–')}</dd>
          </dl></section>
        <section class="card"><h2>${t('fl.kyc')}</h2>
          <ul class="kyc">${Object.keys(f.kyc || {}).map(k => `<li><span>${t('kyc.' + k)}</span>${f.kyc[k] ? `<span class="chip good">✓ ${t('kyc.received')}</span>` : btn('kyc', 'kyc.request', 'line', { id: f.id, doc: k })}</li>`).join('')}</ul>
          <div class="mini-kpis">${kpi(t('col.jobs'), orders.length)}${kpi(t('col.paidYTD'), money0(U.sum(pays, p => p.gross)))}${kpi(t('kpi.whtYTD'), money0(U.sum(pays, p => p.wht)))}${kpi(t('doc.cert'), certs.length)}</div>
        </section>
      </div>
      <section class="card"><h2>${t('fl.history')}</h2>${ordersTable(orders, 'c')}</section>`;
  }

  function ordersTable(orders, side) {
    const party = side === 'c' ? o => nm(S.freelancer(o.freelancerId)) : o => nm(S.company(o.companyId));
    const rows = orders.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(o => {
      const inv = S.currentInvoice(o.id);
      return {
        attrs: rowLink(`#/${side}/jobs/${o.id}`),
        cells: [`<span class="mono">${o.no}</span>`, `<b>${esc(o.title)}</b><small class="muted block">${typeName(o.type)}</small>`, party(o), money(o.amount),
          chip(o.status) + (inv && inv.amount !== o.amount ? ` <span class="chip bad">${t('mismatch')}</span>` : '') + (o.dispute && o.dispute.open ? ` <span class="chip bad">${t('st.disputed')}</span>` : ''),
          fdate(o.updatedAt), nextAction(o, side)]
      };
    });
    return table([{ label: t('col.no') }, { label: t('col.job') }, { label: side === 'c' ? t('col.freelancer') : t('col.company') }, { label: t('col.amount'), cls: 'r' }, { label: t('col.status') }, { label: t('col.updated') }, { label: '', cls: 'r' }], rows, t('jobs.empty'));
  }
  function nextAction(o, side) {
    if (side === 'c') {
      if (o.status === 'draft') return btn('send', 'act.send', 'line', { id: o.id });
      if (o.status === 'invoiced') return btn('go', 'act.review', 'solid', { href: `#/c/jobs/${o.id}` });
      if (o.status === 'approved') return btn('pay', 'act.pay', 'solid', { id: o.id });
    } else {
      if (o.status === 'sent') return btn('invoice', 'act.acceptInvoice', 'solid', { id: o.id });
      if (o.status === 'paid' && !(o.dispute && o.dispute.open)) return btn('receipt', 'act.receipt', 'solid', { id: o.id });
    }
    return '';
  }

  function cJobs(id) {
    if (id) return jobDetail(id, 'c');
    const orders = companyOrders();
    const statuses = ['draft', 'sent', 'invoiced', 'approved', 'paid', 'completed'];
    const counts = s => orders.filter(o => o.status === s).length;
    const shown = ui.jobs === 'all' ? orders : orders.filter(o => o.status === ui.jobs);
    return `${pageHead(t('nav.jobs'), t('c.jobs.sub'), btn('newPO', 'po.new', 'solid'))}
      ${tabs('jobs', [['all', t('all'), orders.length], ...statuses.map(s => [s, t('st.' + s), counts(s)])], ui.jobs)}
      ${ordersTable(shown, 'c')}`;
  }

  // ---------- job detail (shared by both sides) ----------
  const FLOW = ['draft', 'sent', 'invoiced', 'approved', 'paid', 'completed'];
  function jobDetail(id, side) {
    const o = S.order(id);
    const isC = side === 'c';
    if (!o || (isC && o.companyId !== curC().id) || (!isC && (o.freelancerId !== curF().id || o.status === 'draft'))) return notFound();
    const c = S.company(o.companyId), f = S.freelancer(o.freelancerId), d = S.docsOf(o.id);
    const base = d.payment ? d.payment : T.calcWHT(d.invoice ? d.invoice.amount : o.amount, o.type);
    const idx = FLOW.indexOf(o.status);
    const steps = [['sent', 'step.po'], ['invoiced', 'step.inv'], ['approved', 'step.approved'], ['paid', 'step.paid'], ['completed', 'step.rc']];
    const stepper = `<ol class="stepper ${idx < 0 ? 'stopped' : ''}">${steps.map(([s, k], i) => {
      const si = FLOW.indexOf(s), done = idx >= si, now = idx === si - 1;
      return `<li class="${done ? 'done' : ''} ${now ? 'now' : ''}"><span>${i + 1}</span>${t(k)}</li>`;
    }).join('')}</ol>`;

    const docs = [];
    docs.push(['po', o.id, t('doc.po'), o.no, o.sentAt || o.createdAt, o.status === 'draft' ? t('st.draft') : '']);
    d.invoices.forEach(i => docs.push(['inv', i.id, t('doc.inv'), i.no, i.issuedAt, i.void ? t('void') : '']));
    if (d.certificate) docs.push(['cert', d.certificate.id, t('doc.cert'), d.certificate.no, d.certificate.issuedAt, '']);
    if (d.receipt) docs.push(['rc', d.receipt.id, t('doc.rc'), d.receipt.no, d.receipt.issuedAt, '']);

    return `<a class="back" href="#/${side}/jobs">← ${t(isC ? 'nav.jobs' : 'nav.fjobs')}</a>
      ${pageHead(`<span class="mono h-no">${o.no}</span> ${esc(o.title)}`, `${isC ? nm(f) : nm(c)} · ${typeName(o.type)}`, chip(o.status))}
      ${stepper}
      <div class="cols wide-left">
        <section class="card"><h2>${t('job.details')}</h2>
          <dl class="dl">
            <dt>${t('col.company')}</dt><dd>${nm(c)}</dd>
            <dt>${t('col.freelancer')}</dt><dd>${nm(f)} <small class="mono muted">${esc(T.formatTaxId(f.taxId))}</small></dd>
            <dt>${t('po.scope')}</dt><dd class="pre">${esc(o.scope || '–')}</dd>
            <dt>${t('po.period')}</dt><dd>${fdate(o.startDate)} – ${fdate(o.dueDate)}</dd>
            <dt>${t('po.terms')}</dt><dd>${t('po.termsVal', { n: o.terms })}</dd>
            <dt>${t('col.type')}</dt><dd>${typeName(o.type)}</dd>
          </dl>
          <table class="sum">
            <tr><th>${t('po.amount')}</th><td>${money(o.amount)}</td></tr>
            ${d.invoice ? `<tr class="${d.invoice.amount !== o.amount ? 'bad' : ''}"><th>${t('doc.inv')} ${d.invoice.no}</th><td>${money(d.invoice.amount)}</td></tr>` : ''}
            <tr><th>${t('wht')} ${pct(base.rate)}${base.gross < T.WHT_MIN_PAYMENT ? ` <small>(${t('wht.under1000')})</small>` : ''}</th><td>− ${money(base.wht)}</td></tr>
            <tr class="total"><th>${d.payment ? t('net.paid') : t('net.est')}</th><td>${money(base.net)}</td></tr>
          </table>
        </section>
        <div class="stack">
          <section class="card action"><h2>${t('job.next')}</h2>${actionPanel(o, d, isC)}</section>
          <section class="card"><h2>${t('job.docs')}</h2>
            <ul class="doclist">${docs.map(([k, did, label, no, at, tag]) => `<li><span class="dk dk-${k}">${label}</span><span class="mono">${no}</span>${tag ? `<span class="chip muted">${tag}</span>` : ''}<time>${fdate(at)}</time>${docBtn(k, did)}</li>`).join('')}</ul>
          </section>
        </div>
      </div>
      <section class="card"><h2>${t('job.history')}</h2>
        <ol class="timeline">${o.history.slice().reverse().map(h => `<li><time>${fdate(h.at)}</time><b>${t('ev.' + h.status)}</b> <span class="muted">· ${t('by.' + h.by)}</span>${h.note ? `<div class="muted">${esc(h.note)}</div>` : ''}</li>`).join('')}</ol>
      </section>`;
  }

  function actionPanel(o, d, isC) {
    const id = { id: o.id };
    const wait = k => `<p class="wait"><span class="dot"></span>${t(k)}</p>`;
    const inv = d.invoice;
    if (isC) {
      switch (o.status) {
        case 'draft': return `<p>${t('next.c.draft')}</p><div class="btns">${btn('send', 'act.send', 'solid', id)}${btn('cancel', 'act.cancel', 'line', id)}</div>`;
        case 'sent': return `${wait('wait.freelancer')}<div class="btns">${btn('cancel', 'act.cancel', 'line', id)}</div>`;
        case 'invoiced': return `${inv.amount !== o.amount ? callout(t('warn.invMismatch', { inv: money(inv.amount), po: money(o.amount) }), 'bad') : callout(t('ok.invMatch'), 'good')}
          <div class="btns">${btn('approve', 'act.approve', 'solid', id)}${btn('returnInv', 'act.returnInv', 'line', id)}</div>`;
        case 'approved': return `<p>${t('next.c.approved', { amount: money(inv.amount) })}</p><div class="btns">${btn('pay', 'act.pay', 'solid', id)}</div>`;
        case 'paid': return o.dispute && o.dispute.open
          ? `${callout(t('warn.dispute', { received: money(o.dispute.received), net: money(d.payment.net), note: esc(o.dispute.note) }), 'bad')}<div class="btns">${btn('resolve', 'act.resolve', 'solid', id)}</div>`
          : `${callout(t('ok.certIssued', { no: d.certificate.no }), 'good')}${wait('wait.receipt')}`;
        case 'completed': return callout(t('done'), 'good');
        default: return `<p class="muted">${t('st.' + o.status)}</p>`;
      }
    }
    switch (o.status) {
      case 'sent': return `<p>${t('next.f.sent')}</p><div class="btns">${btn('invoice', 'act.acceptInvoice', 'solid', id)}${btn('rejectPO', 'act.reject', 'line', id)}</div>`;
      case 'invoiced': return wait('wait.approval');
      case 'approved': return wait('wait.payment');
      case 'paid': return o.dispute && o.dispute.open
        ? `${callout(t('dispute.sent', { received: money(o.dispute.received) }), 'warn')}<div class="btns">${btn('receipt', 'act.receiptAnyway', 'line', id)}</div>`
        : `${callout(t('ok.certReceived', { no: d.certificate.no }), 'good')}<p>${t('next.f.paid')}</p><div class="btns">${btn('receipt', 'act.receipt', 'solid', id)}${btn('dispute', 'act.dispute', 'line', id)}</div>`;
      case 'completed': return callout(t('done'), 'good');
      default: return `<p class="muted">${t('st.' + o.status)}</p>`;
    }
  }

  // ---------- payments & WHT (1.2) ----------
  function cPayments() {
    const c = curC();
    const toPay = companyOrders().filter(o => o.status === 'approved');
    const pays = S.state.payments.filter(p => p.companyId === c.id).sort((a, b) => b.paidAt.localeCompare(a.paidAt));
    const months = [...new Set([U.monthKey(U.today()), ...pays.map(p => U.monthKey(p.paidAt))])].sort().reverse();
    if (!months.includes(ui.month)) ui.month = months[1] && !S.filing(c.id, months[1]) ? months[1] : months[0];
    const m = ui.month;
    const mp = pays.filter(p => U.monthKey(p.paidAt) === m && p.wht > 0);
    const due = S.filingDue(m), filed = S.filing(c.id, m);
    const payRows = pays.map(p => {
      const o = S.order(p.orderId), cert = S.certOf(p.orderId);
      return { cells: [fdate(p.paidAt), `<a href="#/c/jobs/${o.id}" class="mono">${o.no}</a>`, nm(S.freelancer(p.freelancerId)), money(p.gross), pct(p.rate), money(p.wht), money(p.net), cert ? docBtn('cert', cert.id, cert.no) : `<span class="chip bad">${t('missing')}</span>`] };
    });
    const pndRows = mp.map((p, i) => {
      const f = S.freelancer(p.freelancerId), o = S.order(p.orderId);
      return { cells: [i + 1, `<span class="mono">${esc(T.formatTaxId(f.taxId))}</span>`, nm(f), fdate(p.paidAt), T.INCOME_TYPES[o.type].section, pct(p.rate), money(p.gross), money(p.wht)] };
    });
    return `${pageHead(t('nav.payments'), t('c.pay.sub'))}
      <section class="card"><h2>${t('pay.awaiting')}</h2>
        ${table([{ label: t('col.no') }, { label: t('col.job') }, { label: t('col.freelancer') }, { label: t('col.amount'), cls: 'r' }, { label: t('wht'), cls: 'r' }, { label: '', cls: 'r' }],
          toPay.map(o => { const inv = S.currentInvoice(o.id), w = T.calcWHT(inv.amount, o.type); return { cells: [`<span class="mono">${o.no}</span>`, esc(o.title), nm(S.freelancer(o.freelancerId)), money(inv.amount), money(w.wht), btn('pay', 'act.pay', 'solid', { id: o.id })] }; }),
          t('pay.none'))}
      </section>
      <section class="card"><h2>${t('pnd3.title')}</h2>
        <div class="toolbar">
          <label class="fsel"><span>${t('month')}</span><select data-ui="month">${months.map(x => `<option value="${x}" ${x === m ? 'selected' : ''}>${fmonth(x)}</option>`).join('')}</select></label>
          <div class="grow"></div>
          ${mp.length ? btn('csv', 'pnd3.csv', 'line', { month: m }) : ''}
          ${mp.length ? (filed ? btn('unfile', 'pnd3.unfile', 'line', { month: m }) : btn('file', 'pnd3.markFiled', 'solid', { month: m })) : ''}
        </div>
        ${mp.length ? callout(filed ? t('pnd3.filed', { at: fdate(filed.filedAt) }) : t('pnd3.due', { paper: fdate(due.paper), online: fdate(due.online) }), filed ? 'good' : (U.today() > due.online ? 'bad' : 'warn')) : ''}
        ${table([{ label: '#' }, { label: t('col.taxId') }, { label: t('col.freelancer') }, { label: t('col.paidAt') }, { label: t('col.section') }, { label: t('col.rate'), cls: 'r' }, { label: t('col.gross'), cls: 'r' }, { label: t('wht'), cls: 'r' }], pndRows, t('pnd3.none'))}
        ${mp.length ? `<div class="totals"><span>${t('total')}</span><b>${money(U.sum(mp, p => p.gross))}</b><b>${money(U.sum(mp, p => p.wht))}</b></div>` : ''}
      </section>
      <section class="card"><h2>${t('pay.history')}</h2>
        ${table([{ label: t('col.paidAt') }, { label: t('col.no') }, { label: t('col.freelancer') }, { label: t('col.gross'), cls: 'r' }, { label: t('col.rate'), cls: 'r' }, { label: t('wht'), cls: 'r' }, { label: t('col.net'), cls: 'r' }, { label: t('doc.cert') }], payRows)}
      </section>`;
  }

  // ---------- documents (1.4 / 2.3) ----------
  function docTable(list, side) {
    const party = side === 'c' ? d => nm(S.freelancer(d.freelancerId)) : d => nm(S.company(d.companyId));
    return table([{ label: t('col.docType') }, { label: t('col.no') }, { label: t('col.date') }, { label: side === 'c' ? t('col.freelancer') : t('col.company') }, { label: t('col.job') }, { label: t('col.amount'), cls: 'r' }, { label: '', cls: 'r' }],
      list.map(d => ({ cells: [`<span class="dk dk-${d.kind}">${t('doc.' + d.kind)}</span>${d.void ? ` <span class="chip muted">${t('void')}</span>` : ''}`, `<span class="mono">${d.no}</span>`, fdate(d.date), party(d), esc(d.title || ''), money(d.amount) + (d.kind === 'cert' ? `<small class="muted block">${t('wht')} ${money(d.wht)}</small>` : ''), docBtn(d.kind, d.id)] })),
      t('docs.none'));
  }
  function filterDocs(list, side, kinds) {
    const q = ui.q.trim().toLowerCase();
    return list.filter(d => kinds.includes(d.kind) && yearOf(d.date) === +ui.year
      && (!ui.party || (side === 'c' ? d.freelancerId : d.companyId) === ui.party)
      && (!q || [d.no, d.title, nm(S.freelancer(d.freelancerId)), nm(S.company(d.companyId))].join(' ').toLowerCase().includes(q)));
  }
  const docYears = list => [...new Set([thisYear(), ...list.map(d => yearOf(d.date))])].sort().reverse();
  const searchBox = () => `<label class="search"><span class="sr">${t('search')}</span><input type="search" data-ui="q" value="${esc(ui.q)}" placeholder="${t('docs.searchPh')}"></label>`;

  function cDocuments() {
    const c = curC(), all = S.docsList({ companyId: c.id });
    const groups = { all: ['po', 'inv', 'cert', 'rc'], issued: ['po', 'cert'], received: ['inv', 'rc'] };
    const shown = filterDocs(all, 'c', groups[ui.docTab] || groups.all);
    const issues = S.companyIssues(c.id).filter(i => ['no_receipt', 'no_cert', 'kyc_missing'].includes(i.kind));
    return `${pageHead(t('nav.documents'), t('c.docs.sub'))}
      ${issues.length ? callout(`<b>${t('docs.missing', { n: issues.length })}</b><ul>${issues.map(i => `<li>${issueText(i)}</li>`).join('')}</ul>`, 'warn') : ''}
      ${tabs('docTab', [['all', t('all')], ['issued', t('docs.issued')], ['received', t('docs.inbox'), all.filter(d => ['inv', 'rc'].includes(d.kind) && yearOf(d.date) === +ui.year).length]], ui.docTab)}
      <div class="toolbar">${searchBox()}
        <label class="fsel"><span>${t('col.freelancer')}</span><select data-ui="party"><option value="">${t('all')}</option>${S.membersOf(c.id).map(f => `<option value="${f.id}" ${ui.party === f.id ? 'selected' : ''}>${nm(f)}</option>`).join('')}</select></label>
        ${yearSelect(docYears(all), ui.year)}</div>
      ${docTable(shown, 'c')}`;
  }

  // ---------- checks (1.5) ----------
  function cChecks() {
    const c = curC();
    const issues = S.companyIssues(c.id);
    const y = +ui.year;
    const pays = S.state.payments.filter(p => p.companyId === c.id && yearOf(p.paidAt) === y);
    const orders = pays.map(p => S.order(p.orderId));
    const invs = orders.map(o => S.currentInvoice(o.id)).filter(Boolean);
    const certs = orders.map(o => S.certOf(o.id)).filter(Boolean);
    const rcs = orders.map(o => S.receiptOf(o.id)).filter(Boolean);
    const recon = [
      [t('rec.poVsInv'), U.sum(orders, o => o.amount), U.sum(invs, i => i.amount)],
      [t('rec.invVsPaid'), U.sum(invs, i => i.amount), U.sum(pays, p => p.gross)],
      [t('rec.whtVsCert'), U.sum(pays, p => p.wht), U.sum(certs, x => x.wht)],
      [t('rec.paidVsRc'), U.sum(pays, p => p.gross), U.sum(rcs, r => r.gross)]
    ];
    const years = [...new Set([thisYear(), ...S.state.payments.filter(p => p.companyId === c.id).map(p => yearOf(p.paidAt))])].sort().reverse();
    return `${pageHead(t('nav.checks'), t('c.checks.sub'))}
      <div class="toolbar">${yearSelect(years, y)}</div>
      <section class="card"><h2>${t('rec.title')}</h2>
        ${table([{ label: t('rec.check') }, { label: 'A', cls: 'r' }, { label: 'B', cls: 'r' }, { label: '', cls: 'r' }],
          recon.map(([l, a, b]) => ({ cells: [l, money(a), money(b), a === b ? `<span class="chip good">✓ ${t('rec.match')}</span>` : `<span class="chip bad">${t('rec.diff')} ${money(Math.abs(a - b))}</span>`] })))}
        <p class="muted small">${t('rec.note', { n: pays.length })}</p>
      </section>
      <section class="card"><h2>${t('checks.list')} <span class="count">${issues.length}</span></h2>
        ${issues.length ? `<ul class="issues big">${issues.map(i => `<li class="sev-${i.severity}"><div><span class="sev">${t('sev.' + i.severity)}</span>${issueText(i)}</div><div class="btns">${issueActions(i)}</div></li>`).join('')}</ul>` : `<div class="empty ok">${t('checks.clean')}</div>`}
      </section>`;
  }
  function issueActions(i) {
    const a = [];
    if (i.orderId) a.push(btn('go', 'openJob', 'line', { href: `#/c/jobs/${i.orderId}` }));
    if (i.kind === 'dispute') a.push(btn('resolve', 'act.resolve', 'solid', { id: i.orderId }));
    if (i.kind === 'filing_due') a.push(btn('go', 'pnd3.open', 'line', { href: '#/c/payments', month: i.data.month }), btn('file', 'pnd3.markFiled', 'solid', { month: i.data.month }));
    if (i.kind === 'bad_taxid') a.push(btn('editTaxId', 'fix', 'solid', { id: i.freelancerId }));
    if (i.kind === 'kyc_missing') a.push(btn('go', 'open', 'line', { href: `#/c/freelancers/${i.freelancerId}` }));
    if (i.kind === 'no_receipt') a.push(btn('remind', 'remind', 'line', { id: i.orderId }));
    return a.join('');
  }

  // =====================================================================
  // FREELANCER SIDE
  // =====================================================================
  const myOrders = () => S.state.orders.filter(o => o.freelancerId === curF().id && o.status !== 'draft');
  function incomeRecords(year) {
    const f = curF();
    const plat = S.state.payments.filter(p => p.freelancerId === f.id && yearOf(p.paidAt) === year).map(p => {
      const o = S.order(p.orderId);
      return { src: 'platform', client: nm(S.company(p.companyId)), clientId: p.companyId, type: o.type, gross: p.gross, wht: p.wht, net: p.net, date: p.paidAt, hasCert: !!S.certOf(o.id), orderId: o.id };
    });
    const ext = S.state.externalIncome.filter(x => x.freelancerId === f.id && x.received && yearOf(x.date) === year).map(x => ({ src: 'external', client: x.client, clientId: 'ext:' + x.client, type: x.type, gross: x.gross, wht: x.wht, net: x.gross - x.wht, date: x.date, hasCert: x.hasCert || x.wht === 0, extId: x.id }));
    return [...plat, ...ext];
  }

  function fDashboard() {
    const f = curF(), orders = myOrders(), recs = incomeRecords(thisYear());
    const receivable = orders.filter(o => ['invoiced', 'approved'].includes(o.status));
    const newPOs = orders.filter(o => o.status === 'sent');
    const al = S.alerts();
    const clients = S.clientsOf(f.id);
    return `${pageHead(t('f.dash.title', { name: nm(f) }), t('f.dash.sub'))}
      <div class="kpis">
        ${kpi(t('kpi.incomeYTD'), money0(U.sum(recs, r => r.gross)), t('kpi.incomeYTDSub'))}
        ${kpi(t('kpi.whtYTD'), money0(U.sum(recs, r => r.wht)), t('kpi.whtYTDSub'))}
        ${kpi(t('kpi.receivable'), money0(U.sum(receivable, o => S.currentInvoice(o.id)?.amount)), t('kpi.receivableSub', { n: receivable.length }))}
        ${kpi(t('kpi.newPO'), newPOs.length, '', newPOs.length ? 'warn' : '')}
      </div>
      <div class="cols">
        <section class="card"><h2>${t('todo')}</h2>
          ${al.length ? `<ul class="queue">${al.map(a => `<li><div>${alertText(a)}</div>${a.kind === 'po_waiting' ? btn('invoice', 'act.acceptInvoice', 'solid', { id: a.orderId }) : a.kind === 'receipt_todo' ? btn('receipt', 'act.receipt', 'solid', { id: a.orderId }) : btn('go', 'open', 'line', { href: alertHref(a) })}</li>`).join('')}</ul>` : `<div class="empty ok">${t('todo.none')}</div>`}
        </section>
        <section class="card"><h2>${t('f.clients')}</h2>
          <ul class="clients">${clients.map(c => { const co = orders.filter(o => o.companyId === c.id); return `<li><b>${nm(c)}</b><small>${t('f.clientsLine', { n: co.length, total: money0(U.sum(recs.filter(r => r.clientId === c.id), r => r.gross)) })}</small></li>`; }).join('')}</ul>
          <p class="muted small">${t('f.network')}</p>
        </section>
      </div>`;
  }

  function fJobs(id) {
    if (id) return jobDetail(id, 'f');
    const orders = myOrders();
    const statuses = ['sent', 'invoiced', 'approved', 'paid', 'completed'];
    const shown = ui.fjobs === 'all' ? orders : orders.filter(o => o.status === ui.fjobs);
    return `${pageHead(t('nav.fjobs'), t('f.jobs.sub'))}
      ${tabs('fjobs', [['all', t('all'), orders.length], ...statuses.map(s => [s, t('st.' + s), orders.filter(o => o.status === s).length])], ui.fjobs)}
      ${ordersTable(shown, 'f')}`;
  }

  function fIncome() {
    const f = curF(), y = +ui.year, recs = incomeRecords(y);
    const group = (key, label) => {
      const g = {};
      recs.forEach(r => { const k = r[key]; g[k] = g[k] || { label: label(r), gross: 0, wht: 0, n: 0 }; g[k].gross += r.gross; g[k].wht += r.wht; g[k].n++; });
      return Object.values(g).sort((a, b) => b.gross - a.gross);
    };
    const byClient = group('clientId', r => r.client + (r.src === 'external' ? ` <span class="chip muted">${t('ext.tag')}</span>` : ''));
    const byType = group('type', r => typeName(r.type));
    const unpaid = myOrders().filter(o => ['invoiced', 'approved'].includes(o.status));
    const ext = S.state.externalIncome.filter(x => x.freelancerId === f.id && yearOf(x.date) === y);
    const years = [...new Set([thisYear(), ...S.state.payments.filter(p => p.freelancerId === f.id).map(p => yearOf(p.paidAt))])].sort().reverse();
    const sumCols = [{ label: '' }, { label: t('col.count'), cls: 'r' }, { label: t('col.gross'), cls: 'r' }, { label: t('wht'), cls: 'r' }, { label: t('col.net'), cls: 'r' }];
    const sumRows = g => g.map(x => ({ cells: [x.label, x.n, money(x.gross), money(x.wht), money(x.gross - x.wht)] }));
    return `${pageHead(t('nav.income'), t('f.inc.sub'), btn('addExt', 'ext.add', 'solid'))}
      <div class="toolbar">${yearSelect(years, y)}</div>
      <div class="kpis">${kpi(t('col.gross'), money0(U.sum(recs, r => r.gross)))}${kpi(t('kpi.whtYTD'), money0(U.sum(recs, r => r.wht)), t('f.inc.whtSub'))}${kpi(t('col.net'), money0(U.sum(recs, r => r.net)))}${kpi(t('kpi.receivable'), money0(U.sum(unpaid, o => S.currentInvoice(o.id)?.amount)))}</div>
      <div class="cols">
        <section class="card"><h2>${t('inc.byClient')}</h2>${table(sumCols, sumRows(byClient))}</section>
        <section class="card"><h2>${t('inc.byType')}</h2>${table(sumCols, sumRows(byType))}</section>
      </div>
      <section class="card"><h2>${t('inc.unpaid')}</h2>${table([{ label: t('col.no') }, { label: t('col.job') }, { label: t('col.company') }, { label: t('col.status') }, { label: t('col.due') }, { label: t('col.amount'), cls: 'r' }],
        unpaid.map(o => { const inv = S.currentInvoice(o.id); return { attrs: rowLink(`#/f/jobs/${o.id}`), cells: [`<span class="mono">${inv.no}</span>`, esc(o.title), nm(S.company(o.companyId)), chip(o.status), fdate(inv.dueDate), money(inv.amount)] }; }), t('inc.unpaidNone'))}</section>
      <section class="card"><h2>${t('ext.title')}</h2><p class="muted small">${t('ext.sub')}</p>
        ${table([{ label: t('col.date') }, { label: t('ext.client') }, { label: t('col.type') }, { label: t('col.gross'), cls: 'r' }, { label: t('wht'), cls: 'r' }, { label: t('doc.cert') }, { label: '', cls: 'r' }],
          ext.map(x => ({ cells: [fdate(x.date), esc(x.client), typeName(x.type), money(x.gross), money(x.wht), x.wht > 0 ? (x.hasCert ? `<span class="chip good">✓ ${t('kyc.received')}</span>` : `<span class="chip bad">${t('missing')}</span> ${btn('extCert', 'ext.gotCert', 'line', { id: x.id })}`) : `<span class="muted">–</span>`, btn('delExt', 'delete', 'line', { id: x.id })] })), t('ext.none'))}
      </section>`;
  }

  function fDocuments() {
    const f = curF(), all = S.docsList({ freelancerId: f.id });
    const y = +ui.year;
    const missing = S.state.externalIncome.filter(x => x.freelancerId === f.id && x.wht > 0 && !x.hasCert);
    const certs = all.filter(d => d.kind === 'cert' && yearOf(d.date) === y);
    let body;
    if (ui.fdocTab === 'exp') {
      const ex = S.state.expenses.filter(e => e.freelancerId === f.id && yearOf(e.date) === y).sort((a, b) => b.date.localeCompare(a.date));
      body = `<div class="toolbar"><div class="grow"></div>${btn('addExp', 'exp.add', 'solid')}</div>
        ${table([{ label: t('col.date') }, { label: t('exp.desc') }, { label: t('exp.cat') }, { label: t('col.amount'), cls: 'r' }, { label: t('exp.file') }, { label: '', cls: 'r' }],
          ex.map(e => ({ cells: [fdate(e.date), esc(e.desc), t('cat.' + e.category), money(e.amount), e.image ? docBtn('exp', e.id) : '<span class="muted">–</span>', btn('delExp', 'delete', 'line', { id: e.id })] })), t('exp.none'))}
        <div class="totals"><span>${t('total')}</span><b>${money(U.sum(ex, e => e.amount))}</b></div>`;
    } else {
      body = `${docTable(filterDocs(all, 'f', [ui.fdocTab]), 'f')}`;
    }
    return `${pageHead(t('nav.fdocuments'), t('f.docs.sub'))}
      ${missing.length ? callout(`<b>${t('f.docs.missing')}</b><ul>${missing.map(x => `<li>${t('al.ext_no_cert', { client: esc(x.client) })} · ${money(x.wht)}</li>`).join('')}</ul>`, 'warn') : ''}
      <div class="kpis">${kpi(t('f.docs.certCount', { y: lang() === 'th' ? y + 543 : y }), certs.length)}${kpi(t('f.docs.certWht'), money0(U.sum(certs, d => d.wht)))}</div>
      ${tabs('fdocTab', [['cert', t('doc.cert')], ['inv', t('doc.inv')], ['rc', t('doc.rc')], ['po', t('doc.po')], ['exp', t('doc.exp')]], ui.fdocTab)}
      ${ui.fdocTab !== 'exp' ? `<div class="toolbar">${searchBox()}
        <label class="fsel"><span>${t('col.company')}</span><select data-ui="party"><option value="">${t('all')}</option>${S.clientsOf(f.id).map(c => `<option value="${c.id}" ${ui.party === c.id ? 'selected' : ''}>${nm(c)}</option>`).join('')}</select></label>
        ${yearSelect(docYears(all), y)}</div>` : `<div class="toolbar">${yearSelect(docYears(all), y)}</div>`}
      ${body}`;
  }

  function fTax() {
    const f = curF(), y = +ui.year, recs = incomeRecords(y);
    const est = T.estimateAnnualTax({ incomes: recs, otherAllowances: ui.other });
    const exp = U.sum(S.state.expenses.filter(e => e.freelancerId === f.id && yearOf(e.date) === y), e => e.amount);
    const years = [...new Set([thisYear(), ...S.state.payments.filter(p => p.freelancerId === f.id).map(p => yearOf(p.paidAt))])].sort().reverse();
    const refund = est.balance < 0;
    return `${pageHead(t('nav.tax'), t('f.tax.sub'))}
      <div class="toolbar">${yearSelect(years, y)}
        <label class="fsel"><span>${t('tax.other')}</span><input type="number" min="0" step="1000" data-ui="other" value="${ui.other}"></label></div>
      <div class="kpis">
        ${kpi(t('tax.tax'), money0(est.tax))}
        ${kpi(t('tax.whtCredit'), money0(est.whtPaid))}
        ${kpi(refund ? t('tax.refund') : t('tax.payable'), money0(Math.abs(est.balance)), '', refund ? 'good' : est.balance > 0 ? 'warn' : '')}
      </div>
      <section class="card"><h2>${t('tax.calc')}</h2>
        ${table([{ label: t('col.type') }, { label: t('col.gross'), cls: 'r' }, { label: t('tax.deductRate'), cls: 'r' }, { label: t('tax.deduct'), cls: 'r' }],
          est.rows.map(r => ({ cells: [typeName(r.type), money(r.gross), pct(r.rate) + (r.capped ? ` <small class="muted">(${t('tax.capped')})</small>` : ''), money(r.deduction)] })), t('tax.noIncome'))}
        <table class="sum">
          <tr><th>${t('tax.gross')}</th><td>${money(est.gross)}</td></tr>
          <tr><th>${t('tax.lessExp')}</th><td>− ${money(est.expenseDeduction)}</td></tr>
          <tr><th>${t('tax.lessAllow')}</th><td>− ${money(est.allowances)}</td></tr>
          <tr class="total"><th>${t('tax.net')}</th><td>${money(est.netIncome)}</td></tr>
          <tr><th>${t('tax.tax')}</th><td>${money(est.tax)}</td></tr>
          <tr><th>${t('tax.whtCredit')}</th><td>− ${money(est.whtPaid)}</td></tr>
          <tr class="total"><th>${refund ? t('tax.refund') : t('tax.payable')}</th><td>${money(Math.abs(est.balance))}</td></tr>
        </table>
      </section>
      <div class="cols">
        <section class="card"><h2>${t('tax.law')}</h2>
          <ul class="law">
            <li><b>40(2)</b> ${t('law.402')}</li><li><b>40(6)</b> ${t('law.406')}</li><li><b>40(8)</b> ${t('law.408')}</li><li><b>50 ทวิ</b> ${t('law.50')}</li>
          </ul></section>
        <section class="card"><h2>${t('tax.expTitle')}</h2><p>${t('tax.expBody', { amt: money(exp) })}</p>${btn('go', 'tax.expOpen', 'line', { href: '#/f/documents', tab: 'exp' })}</section>
      </div>
      ${callout(t('disclaimer'), 'info')}`;
  }

  function fHistory() {
    const f = curF(), orders = myOrders();
    const tick = (on, label) => `<span class="chip ${on ? 'good' : 'muted'}">${on ? '✓' : '○'} ${label}</span>`;
    return `${pageHead(t('nav.history'), t('f.hist.sub'))}
      ${S.clientsOf(f.id).map(c => {
        const co = orders.filter(o => o.companyId === c.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return `<section class="card"><h2>${nm(c)} <small class="muted mono">${esc(T.formatTaxId(c.taxId))}</small></h2>
          ${table([{ label: t('col.no') }, { label: t('col.job') }, { label: t('col.amount'), cls: 'r' }, { label: t('col.status') }, { label: t('col.docs') }],
            co.map(o => { const d = S.docsOf(o.id); return { attrs: rowLink(`#/f/jobs/${o.id}`), cells: [`<span class="mono">${o.no}</span>`, esc(o.title), money(o.amount), chip(o.status), [tick(true, t('doc.po')), tick(!!d.invoice, t('doc.inv')), tick(!!d.certificate, t('doc.cert')), tick(!!d.receipt, t('doc.rc'))].join(' ')] }; }), t('jobs.empty'))}
        </section>`;
      }).join('')}`;
  }

  function notFound() { return `<div class="empty">${t('notFound')} <a class="link" href="#/${cur.side}/dashboard">${t('nav.dashboard')}</a></div>`; }

  const VIEWS = {
    c: { dashboard: cDashboard, freelancers: cFreelancers, jobs: cJobs, payments: cPayments, documents: cDocuments, checks: cChecks },
    f: { dashboard: fDashboard, jobs: fJobs, income: fIncome, documents: fDocuments, tax: fTax, history: fHistory }
  };
  const NAV = {
    c: [['dashboard', 'nav.dashboard', ''], ['freelancers', 'nav.freelancers', '1.1'], ['jobs', 'nav.jobs', '1.3'], ['payments', 'nav.payments', '1.2'], ['documents', 'nav.documents', '1.4'], ['checks', 'nav.checks', '1.5']],
    f: [['dashboard', 'nav.dashboard', ''], ['jobs', 'nav.fjobs', '2.2'], ['income', 'nav.income', '2.1'], ['documents', 'nav.fdocuments', '2.3'], ['tax', 'nav.tax', ''], ['history', 'nav.history', '2.4']]
  };

  // =====================================================================
  // MODALS (forms)
  // =====================================================================
  let modalSubmit = null;
  function modal(title, body, { submit, wide, onOpen } = {}) {
    $('#modalTitle').innerHTML = title;
    $('#modalBody').innerHTML = `<form id="mform" novalidate>${body}<p class="err" role="alert"></p></form>`;
    $('#modal').classList.toggle('wide', !!wide);
    $('#modal').hidden = false;
    document.body.classList.add('modal-open');
    modalSubmit = submit;
    const form = $('#mform');
    if (onOpen) onOpen(form);
    const first = form.querySelector('input:not([type=hidden]),select,textarea');
    if (first) first.focus();
  }
  function closeModal() { $('#modal').hidden = true; document.body.classList.remove('modal-open'); modalSubmit = null; }
  const field = (label, input, hint = '') => `<label class="field"><span>${label}</span>${input}${hint ? `<small>${hint}</small>` : ''}</label>`;
  const formErr = (form, msg) => { form.querySelector('.err').textContent = msg; return false; };
  const footer = (...b) => `<div class="mfoot">${b.join('')}<button type="button" class="btn line" data-act="close">${t('cancel')}</button></div>`;
  const submitBtn = (key, value = '', cls = 'solid') => `<button type="submit" class="btn ${cls}" value="${value}">${t(key)}</button>`;

  function whtPreview(gross, type) {
    const w = T.calcWHT(num(gross), type);
    return `<div class="preview"><span>${t('wht')} ${pct(w.rate)}${w.gross > 0 && w.gross < T.WHT_MIN_PAYMENT ? ` (${t('wht.under1000')})` : ''}</span><b>${money(w.wht)}</b><span>${t('net.est')}</span><b>${money(w.net)}</b></div>`;
  }

  function poModal(fid) {
    const c = curC(), members = S.membersOf(c.id);
    const f0 = S.freelancer(fid) || members[0];
    modal(t('po.new'), `
      <div class="grid2">
        ${field(t('col.freelancer'), `<select name="freelancerId" required>${members.map(f => `<option value="${f.id}" ${f === f0 ? 'selected' : ''}>${nm(f)}</option>`).join('')}</select>`)}
        ${field(t('col.type'), `<select name="type">${typeOptions(f0 ? f0.defaultType : '40-2')}</select>`)}
      </div>
      ${field(t('po.title'), `<input name="title" required maxlength="120" placeholder="${t('po.titlePh')}">`)}
      ${field(t('po.scope'), `<textarea name="scope" rows="3" placeholder="${t('po.scopePh')}"></textarea>`)}
      <div class="grid3">
        ${field(t('po.amount'), `<input name="amount" type="number" min="1" step="0.01" required inputmode="decimal">`)}
        ${field(t('po.start'), `<input name="startDate" type="date" value="${U.today()}" required>`)}
        ${field(t('po.due'), `<input name="dueDate" type="date" value="${U.addDays(U.today(), 14)}" required>`)}
      </div>
      ${field(t('po.terms'), `<select name="terms">${[7, 15, 30, 45].map(n => `<option value="${n}" ${n === 30 ? 'selected' : ''}>${t('po.termsVal', { n })}</option>`).join('')}</select>`)}
      <div id="pv">${whtPreview(0, f0 ? f0.defaultType : '40-2')}</div>
      <p class="muted small">${t('po.note')}</p>
      ${footer(submitBtn('po.saveSend', 'send'), submitBtn('po.saveDraft', 'draft', 'line'))}`, {
      wide: true,
      onOpen(form) {
        const upd = () => { $('#pv').innerHTML = whtPreview(form.amount.value, form.type.value); };
        form.addEventListener('input', upd);
        form.freelancerId.addEventListener('change', () => { form.type.value = S.freelancer(form.freelancerId.value).defaultType; upd(); });
      },
      submit(form, fd, submitter) {
        if (!members.length) return formErr(form, t('err.noMembers'));
        if (!fd.get('title').trim()) return formErr(form, t('err.title'));
        if (num(fd.get('amount')) <= 0) return formErr(form, t('err.amount'));
        if (fd.get('dueDate') < fd.get('startDate')) return formErr(form, t('err.dates'));
        const o = S.createOrder({ companyId: c.id, freelancerId: fd.get('freelancerId'), title: fd.get('title').trim(), scope: fd.get('scope').trim(), amount: num(fd.get('amount')), type: fd.get('type'), startDate: fd.get('startDate'), dueDate: fd.get('dueDate'), terms: fd.get('terms') }, { send: submitter && submitter.value === 'send' });
        toast(t(o.status === 'sent' ? 'toast.poSent' : 'toast.poDraft', { no: o.no }));
        go(`#/c/jobs/${o.id}`);
      }
    });
  }

  function inviteModal() {
    const c = curC();
    modal(t('fl.invite'), `
      <p class="muted small">${t('fl.inviteSub')}</p>
      <div class="grid2">${field(t('f.nameTh'), '<input name="name" required>')}${field(t('f.nameEn'), '<input name="nameEn">')}</div>
      <div class="grid2">${field(t('col.taxId'), '<input name="taxId" required inputmode="numeric" maxlength="17" placeholder="1-2345-67890-12-3">', t('taxId.hint'))}${field(t('col.type'), `<select name="defaultType">${typeOptions('40-2')}</select>`)}</div>
      <div class="grid2">${field(t('f.email'), '<input name="email" type="email">')}${field(t('f.phone'), '<input name="phone" type="tel">')}</div>
      ${field(t('f.address'), '<textarea name="address" rows="2"></textarea>')}
      ${footer(submitBtn('fl.sendInvite'))}`, {
      wide: true,
      submit(form, fd) {
        if (!fd.get('name').trim()) return formErr(form, t('err.name'));
        if (!T.validTaxId(fd.get('taxId'))) return formErr(form, t('taxId.invalidLong'));
        const r = S.inviteFreelancer(c.id, { name: fd.get('name').trim(), nameEn: fd.get('nameEn').trim(), taxId: fd.get('taxId'), email: fd.get('email'), phone: fd.get('phone'), address: fd.get('address'), defaultType: fd.get('defaultType'), role: { th: '', en: '' } });
        toast(t(r.existed ? 'toast.linked' : 'toast.invited', { name: nm(r.freelancer) }));
        go(`#/c/freelancers/${r.freelancer.id}`);
      }
    });
  }

  function editTaxIdModal(id) {
    const f = S.freelancer(id);
    modal(t('fix') + ' — ' + nm(f), `${field(t('col.taxId'), `<input name="taxId" required inputmode="numeric" value="${esc(f.taxId)}">`, t('taxId.hint'))}${footer(submitBtn('save'))}`, {
      submit(form, fd) {
        if (!T.validTaxId(fd.get('taxId'))) return formErr(form, t('taxId.invalidLong'));
        S.updateFreelancer(id, { taxId: fd.get('taxId').replace(/\D/g, '') });
        toast(t('toast.saved')); route();
      }
    });
  }

  function payModal(id) {
    const o = S.order(id), inv = S.currentInvoice(id), f = S.freelancer(o.freelancerId);
    modal(t('pay.title', { no: o.no }), `
      <p><b>${esc(o.title)}</b><br><span class="muted">${nm(f)} · ${t('doc.inv')} ${inv.no} · ${money(inv.amount)}</span></p>
      ${inv.amount !== o.amount ? callout(t('warn.invMismatch', { inv: money(inv.amount), po: money(o.amount) }), 'warn') : ''}
      <div class="grid2">
        ${field(t('pay.gross'), `<input name="gross" type="number" min="1" step="0.01" value="${inv.amount}" required>`, t('pay.grossHint'))}
        ${field(t('col.paidAt'), `<input name="paidAt" type="date" value="${U.today()}" max="${U.today()}" required>`)}
      </div>
      <div class="grid2">
        ${field(t('pay.method'), `<select name="method"><option value="transfer">${t('pay.transfer')}</option><option value="cheque">${t('pay.cheque')}</option><option value="cash">${t('pay.cash')}</option></select>`)}
        ${field(t('pay.ref'), '<input name="ref" placeholder="TRF…">')}
      </div>
      <div id="pv">${whtPreview(inv.amount, o.type)}</div>
      ${callout(t('pay.certNote'), 'info')}
      ${footer(submitBtn('pay.confirm'))}`, {
      wide: true,
      onOpen(form) { form.addEventListener('input', () => { $('#pv').innerHTML = whtPreview(form.gross.value, o.type); }); },
      submit(form, fd) {
        const gross = num(fd.get('gross'));
        if (gross <= 0) return formErr(form, t('err.amount'));
        const paidAt = new Date(fd.get('paidAt') + 'T' + new Date().toTimeString().slice(0, 8)).toISOString();
        const r = S.recordPayment(id, { gross, paidAt, method: fd.get('method'), ref: fd.get('ref') });
        toast(t('toast.paid', { no: r.certificate.no }));
        route();
        openDoc('cert', r.certificate.id);
      }
    });
  }

  function invoiceModal(id) {
    const o = S.order(id), c = S.company(o.companyId);
    modal(t('inv.title', { no: o.no }), `
      <p><b>${esc(o.title)}</b><br><span class="muted">${nm(c)} · ${t('doc.po')} ${o.no} · ${money(o.amount)}</span></p>
      <div class="grid2">
        ${field(t('inv.amount'), `<input name="amount" type="number" min="1" step="0.01" value="${o.amount}" required>`)}
        ${field(t('col.due'), `<input name="dueDate" type="date" value="${U.addDays(U.today(), o.terms)}" required>`)}
      </div>
      <div id="mm"></div>
      ${field(t('inv.note'), '<input name="note" maxlength="140">')}
      <div id="pv">${whtPreview(o.amount, o.type)}</div>
      <p class="muted small">${t('inv.whtNote')}</p>
      ${footer(submitBtn('inv.submit'))}`, {
      wide: true,
      onOpen(form) {
        form.addEventListener('input', () => {
          const a = num(form.amount.value);
          $('#pv').innerHTML = whtPreview(a, o.type);
          $('#mm').innerHTML = a !== o.amount ? callout(t('warn.invMismatchF', { po: money(o.amount) }), 'warn') : '';
        });
      },
      submit(form, fd) {
        if (num(fd.get('amount')) <= 0) return formErr(form, t('err.amount'));
        const inv = S.submitInvoice(id, { amount: num(fd.get('amount')), dueDate: fd.get('dueDate'), note: fd.get('note') });
        toast(t('toast.invoiced', { no: inv.no }));
        go(`#/f/jobs/${id}`);
      }
    });
  }

  function receiptModal(id) {
    const o = S.order(id), p = S.paymentOf(id), cert = S.certOf(id);
    const anyway = o.dispute && o.dispute.open;
    modal(t('rc.title', { no: o.no }), `
      <table class="sum">
        <tr><th>${t('col.gross')}</th><td>${money(p.gross)}</td></tr>
        <tr><th>${t('wht')} ${pct(p.rate)} <small>(${t('doc.cert')} ${cert ? cert.no : '–'})</small></th><td>− ${money(p.wht)}</td></tr>
        <tr class="total"><th>${t('net.paid')}</th><td>${money(p.net)}</td></tr>
      </table>
      ${anyway ? '' : `<fieldset class="radios"><legend>${t('rc.q')}</legend>
        <label><input type="radio" name="ok" value="yes" checked> ${t('rc.yes', { net: money(p.net) })}</label>
        <label><input type="radio" name="ok" value="no"> ${t('rc.no')}</label></fieldset>
      <div id="dz" hidden>${field(t('rc.received'), `<input name="received" type="number" step="0.01" value="${p.net}">`)}${field(t('rc.note'), '<input name="note" maxlength="140">')}</div>`}
      ${footer(submitBtn('rc.submit'))}`, {
      onOpen(form) { form.addEventListener('change', () => { const dz = $('#dz'); if (dz) dz.hidden = form.ok.value !== 'no'; }); },
      submit(form, fd) {
        if (!anyway && fd.get('ok') === 'no') {
          S.disputePayment(id, { received: num(fd.get('received')), note: fd.get('note') });
          toast(t('toast.disputed')); route(); closeModal(); return;
        }
        const rc = S.issueReceipt(id);
        toast(t('toast.receipt', { no: rc.no }));
        route(); openDoc('rc', rc.id);
      }
    });
  }

  function noteModal(title, label, onOk, required = false) {
    modal(title, `${field(label, '<textarea name="note" rows="3"></textarea>')}${footer(submitBtn('confirm'))}`, {
      submit(form, fd) { if (required && !fd.get('note').trim()) return formErr(form, t('err.reason')); onOk(fd.get('note').trim()); }
    });
  }

  function extModal() {
    const f = curF();
    modal(t('ext.add'), `
      ${field(t('ext.client'), '<input name="client" required>')}
      <div class="grid2">${field(t('col.type'), `<select name="type">${typeOptions(f.defaultType)}</select>`)}${field(t('col.date'), `<input name="date" type="date" value="${U.today()}" required>`)}</div>
      <div class="grid2">${field(t('col.gross'), '<input name="gross" type="number" min="0" step="0.01" required>')}${field(t('wht'), '<input name="wht" type="number" min="0" step="0.01">', t('ext.whtHint'))}</div>
      <label class="check"><input type="checkbox" name="hasCert"> ${t('ext.hasCert')}</label>
      ${footer(submitBtn('save'))}`, {
      wide: true,
      onOpen(form) {
        const auto = () => { if (!form.wht.dataset.touched) form.wht.value = T.calcWHT(num(form.gross.value), form.type.value).wht || ''; };
        form.gross.addEventListener('input', auto); form.type.addEventListener('change', auto);
        form.wht.addEventListener('input', () => { form.wht.dataset.touched = '1'; });
      },
      submit(form, fd) {
        if (!fd.get('client').trim()) return formErr(form, t('err.client'));
        if (num(fd.get('gross')) <= 0) return formErr(form, t('err.amount'));
        S.addExternalIncome({ freelancerId: f.id, client: fd.get('client').trim(), type: fd.get('type'), gross: num(fd.get('gross')), wht: num(fd.get('wht')), date: fd.get('date'), received: true, hasCert: !!fd.get('hasCert') });
        toast(t('toast.saved')); closeModal(); route();
      }
    });
  }

  function expModal() {
    const f = curF();
    modal(t('exp.add'), `
      ${field(t('exp.desc'), '<input name="desc" required>')}
      <div class="grid3">${field(t('col.date'), `<input name="date" type="date" value="${U.today()}" required>`)}${field(t('exp.cat'), `<select name="category">${['equipment', 'software', 'travel', 'office', 'other'].map(k => `<option value="${k}">${t('cat.' + k)}</option>`).join('')}</select>`)}${field(t('col.amount'), '<input name="amount" type="number" min="0" step="0.01" required>')}</div>
      ${field(t('exp.file'), '<input name="file" type="file" accept="image/*">', t('exp.fileHint'))}
      ${footer(submitBtn('save'))}`, {
      wide: true,
      async submit(form, fd) {
        if (!fd.get('desc').trim()) return formErr(form, t('err.desc'));
        if (num(fd.get('amount')) <= 0) return formErr(form, t('err.amount'));
        const file = fd.get('file');
        let image = null;
        if (file && file.size) {
          if (file.size > 1024 * 1024) return formErr(form, t('err.file'));
          image = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
        }
        S.addExpense({ freelancerId: f.id, desc: fd.get('desc').trim(), date: fd.get('date'), category: fd.get('category'), amount: num(fd.get('amount')), image });
        toast(t('toast.saved')); closeModal(); route();
      }
    });
  }

  // ---------- document viewer ----------
  function openDoc(kind, id) {
    $('#docPapers').innerHTML = D.render(kind, id);
    $('#docView').hidden = false;
    document.body.classList.add('doc-open');
    closeModal();
    $('#docView').scrollTop = 0;
    $('#docView .docbar button').focus();
  }
  function closeDoc() { $('#docView').hidden = true; document.body.classList.remove('doc-open'); }

  function csv(month) {
    const c = curC();
    const pays = S.state.payments.filter(p => p.companyId === c.id && U.monthKey(p.paidAt) === month && p.wht > 0);
    const rows = [['ลำดับ', 'เลขประจำตัวผู้เสียภาษี', 'ชื่อผู้มีเงินได้', 'ที่อยู่', 'วันที่จ่าย', 'ประเภทเงินได้', 'อัตราภาษี (%)', 'จำนวนเงินที่จ่าย', 'ภาษีที่หักและนำส่ง']];
    pays.forEach((p, i) => { const f = S.freelancer(p.freelancerId), o = S.order(p.orderId); rows.push([i + 1, f.taxId, f.name, f.address, p.paidAt.slice(0, 10), T.INCOME_TYPES[o.type].section, p.rate * 100, p.gross.toFixed(2), p.wht.toFixed(2)]); });
    const text = '﻿' + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = `PND3-${c.taxId}-${month}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // =====================================================================
  // ACTIONS (event delegation on [data-act])
  // =====================================================================
  const guard = fn => (...args) => { try { return fn(...args); } catch (e) { console.error(e); toast(e.message, true); } };
  const ACTIONS = {
    go: d => { if (d.tab) ui.fdocTab = d.tab; if (d.month) ui.month = d.month; go(d.href); },
    ui: d => { ui[d.key] = d.val; route(); },
    role: d => go(`#/${d.role === 'company' ? 'c' : 'f'}/dashboard`),
    reset: () => { if (confirm(t('reset.confirm'))) { S.reset(); Object.assign(ui, { q: '', party: '', month: '' }); toast(t('toast.reset')); go(`#/${cur.side}/dashboard`, true); } },
    bell: () => { const p = $('#bellPanel'); p.hidden = !p.hidden; $('#bellBtn').setAttribute('aria-expanded', String(!p.hidden)); },
    close: closeModal, closeDoc, print: () => window.print(),
    doc: d => openDoc(d.kind, d.id),
    newPO: d => poModal(d.fid),
    invite: inviteModal,
    editTaxId: d => editTaxIdModal(d.id),
    kyc: d => { const f = S.freelancer(d.id); S.updateFreelancer(d.id, { kyc: { ...f.kyc, [d.doc]: true } }); toast(t('toast.kyc', { name: nm(f) })); route(); },
    send: d => { const o = S.sendOrder(d.id); toast(t('toast.poSent', { no: o.no })); route(); },
    cancel: d => { if (confirm(t('confirm.cancel'))) { S.cancelOrder(d.id); route(); } },
    approve: d => { const o = S.order(d.id), inv = S.currentInvoice(d.id); if (inv.amount !== o.amount && !confirm(t('confirm.approveMismatch'))) return; S.approveInvoice(d.id); toast(t('toast.approved')); route(); },
    returnInv: d => noteModal(t('act.returnInv'), t('reason'), note => { S.rejectInvoice(d.id, note); toast(t('toast.returned')); closeModal(); route(); }, true),
    pay: d => payModal(d.id),
    resolve: d => { S.resolveDispute(d.id); toast(t('toast.resolved')); route(); },
    remind: d => toast(t('toast.reminded', { name: nm(S.freelancer(S.order(d.id).freelancerId)) })),
    file: d => { S.markFiled(curC().id, d.month); toast(t('toast.filed')); route(); },
    unfile: d => { S.unmarkFiled(curC().id, d.month); route(); },
    csv: d => csv(d.month),
    invoice: d => invoiceModal(d.id),
    rejectPO: d => noteModal(t('act.reject'), t('reason'), note => { S.rejectOrder(d.id, note); toast(t('toast.rejected')); closeModal(); route(); }),
    receipt: d => receiptModal(d.id),
    dispute: d => receiptModal(d.id),
    addExt: extModal,
    extCert: d => { S.updateExternalIncome(d.id, { hasCert: true }); route(); },
    delExt: d => { if (confirm(t('confirm.delete'))) { S.removeExternalIncome(d.id); route(); } },
    addExp: expModal,
    delExp: d => { if (confirm(t('confirm.delete'))) { S.removeExpense(d.id); route(); } }
  };

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el) {
      if (!e.target.closest('.bell')) $('#bellPanel').hidden = true;
      if (e.target.id === 'modal') closeModal();
      return;
    }
    const fn = ACTIONS[el.dataset.act];
    if (fn) { e.preventDefault(); guard(fn)({ ...el.dataset }, el); }
  });
  document.addEventListener('submit', async e => {
    if (e.target.id !== 'mform' || !modalSubmit) return;
    e.preventDefault();
    const form = e.target;
    form.querySelector('.err').textContent = '';
    try {
      const r = await modalSubmit(form, new FormData(form), e.submitter);
      if (r !== false && !$('#modal').hidden && $('#mform') === form) closeModal();
    } catch (err) { console.error(err); formErr(form, err.message); }
  });
  // Filters: selects re-render on change; search re-renders on input and keeps focus.
  document.addEventListener('change', e => {
    const k = e.target.dataset && e.target.dataset.ui;
    if (!k || k === 'q') return;
    ui[k] = e.target.type === 'number' ? num(e.target.value) : e.target.value;
    route();
  });
  document.addEventListener('input', e => {
    if (!(e.target.dataset && e.target.dataset.ui === 'q')) return;
    ui.q = e.target.value;
    const pos = e.target.selectionStart;
    route();
    const el = $('[data-ui="q"]'); if (el) { el.focus(); el.setSelectionRange(pos, pos); }
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!$('#docView').hidden) closeDoc(); else if (!$('#modal').hidden) closeModal(); else $('#bellPanel').hidden = true;
  });
  $('#persona').addEventListener('change', e => {
    S.setSession(cur.side === 'c' ? { companyId: e.target.value } : { freelancerId: e.target.value });
    Object.assign(ui, { party: '', q: '' });
    go(`#/${cur.side}/dashboard`, true);
  });

  // =====================================================================
  // ROUTER + CHROME
  // =====================================================================
  function go(href, force) {
    closeModal();
    if (location.hash === href) { if (force !== false) route(); } else location.hash = href;
  }
  function renderChrome() {
    const isC = cur.side === 'c';
    $$('[data-act="role"]').forEach(b => { const on = (b.dataset.role === 'company') === isC; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    const list = isC ? S.state.companies : S.state.freelancers;
    const sel = isC ? S.session.companyId : S.session.freelancerId;
    $('#persona').innerHTML = list.map(x => `<option value="${x.id}" ${x.id === sel ? 'selected' : ''}>${nm(x)}</option>`).join('');
    const al = S.alerts();
    $('#bellBtn .badge').textContent = al.length || '';
    $('#bellBtn .badge').hidden = !al.length;
    $('#bellPanel').innerHTML = `<h3>${t('alerts')}</h3>${al.length ? `<ul>${al.map(a => `<li><a href="${alertHref(a)}" data-act="go" data-href="${alertHref(a)}">${alertText(a)}</a></li>`).join('')}</ul>` : `<p class="muted">${t('alerts.none')}</p>`}`;
    const counts = isC
      ? { jobs: companyOrders().filter(o => ['invoiced'].includes(o.status)).length, payments: companyOrders().filter(o => o.status === 'approved').length, checks: S.companyIssues(curC().id).filter(i => i.severity === 'high').length }
      : { jobs: myOrders().filter(o => o.status === 'sent' || (o.status === 'paid' && !(o.dispute && o.dispute.open))).length, documents: S.state.externalIncome.filter(x => x.freelancerId === curF().id && x.wht > 0 && !x.hasCert).length };
    $('#side').innerHTML = `<div class="side-role">${t(isC ? 'role.company' : 'role.freelancer')}</div>` + NAV[cur.side].map(([p, k, req]) =>
      `<a href="#/${cur.side}/${p}" class="${cur.page === p ? 'on' : ''}" ${cur.page === p ? 'aria-current="page"' : ''}><span>${t(k)}</span>${counts[p] ? `<em>${counts[p]}</em>` : ''}${req ? `<small>${req}</small>` : ''}</a>`).join('');
    document.title = `${t('nav.' + (cur.side === 'f' && ['jobs', 'documents'].includes(cur.page) ? 'f' + cur.page : cur.page))} · JangChad`;
  }
  let lastPage = '';
  function route() {
    let h = location.hash.replace(/^#\/?/, '');
    if (!/^[cf](\/|$)/.test(h)) { h = (S.session.role === 'freelancer' ? 'f' : 'c') + '/dashboard'; history.replaceState(null, '', '#/' + h); }
    const [side, page = 'dashboard', id] = h.split('/');
    const role = side === 'f' ? 'freelancer' : 'company';
    if (S.session.role !== role) S.setSession({ role });
    if (lastPage && !lastPage.startsWith(side + '/')) { ui.party = ''; ui.q = ''; }
    cur = { side, page: VIEWS[side][page] ? page : 'dashboard', id };
    renderChrome();
    $('#view').innerHTML = VIEWS[side][cur.page](id);
    const key = `${side}/${cur.page}/${id || ''}`;
    if (key !== lastPage) { window.scrollTo(0, 0); lastPage = key; }
  }

  addEventListener('hashchange', route);
  addEventListener('langchange', () => { route(); if (!$('#docView').hidden) { /* documents are Thai-only */ } });
  S.load();
  route();
})();
