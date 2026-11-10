/* Demo data store — everything lives in localStorage, no backend.
 * Exposes JC.store: state access, the job-lifecycle actions, derived checks and alerts. */
(function () {
  'use strict';
  const T = JC.tax;
  const KEY = 'jc.state.v1', SKEY = 'jc.session.v1';
  const DAY = 864e5;

  const iso = d => new Date(d).toISOString().slice(0, 10);
  const today = () => iso(Date.now());
  const daysAgo = n => iso(Date.now() - n * DAY);
  const addDays = (d, n) => iso(new Date(d).getTime() + n * DAY);
  const monthKey = d => String(d).slice(0, 7);
  const uid = p => p + '_' + Math.random().toString(36).slice(2, 9);
  const sum = (arr, f) => T.round2(arr.reduce((a, x) => a + (+f(x) || 0), 0));

  let state, session;

  // ---------- persistence ----------
  function blank() {
    return {
      version: 1, companies: [], freelancers: [], memberships: [], orders: [], invoices: [],
      payments: [], certificates: [], receipts: [], expenses: [], externalIncome: [], filings: {}, counters: {}
    };
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('save failed', e); }
  }
  function saveSession() {
    try { localStorage.setItem(SKEY, JSON.stringify(session)); } catch (e) { /* ignore */ }
  }
  function load() {
    try { state = JSON.parse(localStorage.getItem(KEY)); } catch (e) { state = null; }
    if (!state || state.version !== 1) { state = seed(); save(); }
    try { session = JSON.parse(localStorage.getItem(SKEY)); } catch (e) { session = null; }
    if (!session || !byId('companies', session.companyId) || !byId('freelancers', session.freelancerId)) {
      session = { role: 'company', companyId: state.companies[0].id, freelancerId: state.freelancers[0].id };
      saveSession();
    }
  }
  function reset() {
    state = seed(); save();
    session = { role: session ? session.role : 'company', companyId: state.companies[0].id, freelancerId: state.freelancers[0].id };
    saveSession();
  }

  // ---------- lookups ----------
  function byId(col, id) { return (state[col] || []).find(x => x.id === id); }
  const company = id => byId('companies', id);
  const freelancer = id => byId('freelancers', id);
  const order = id => byId('orders', id);

  /** Document number, sequential per issuer per year: PO-2026-0001 */
  function nextNo(prefix, ownerId, date) {
    const y = new Date(date).getFullYear();
    const k = `${prefix}:${ownerId}:${y}`;
    const n = (state.counters[k] || 0) + 1;
    state.counters[k] = n;
    return { year: y, seq: n, no: `${prefix}-${y}-${String(n).padStart(4, '0')}` };
  }

  function log(o, status, by, at, note) {
    o.history.push({ at: at || new Date().toISOString(), status, by, note: note || '' });
    o.updatedAt = at || new Date().toISOString();
  }
  function assertStatus(o, ...allowed) {
    if (!o) throw new Error('Job not found');
    if (!allowed.includes(o.status)) throw new Error(`Action not allowed while job is "${o.status}"`);
  }

  // ---------- master data ----------
  function addCompany(data) {
    const c = { id: uid('c'), branch: 'สำนักงานใหญ่', ...data };
    state.companies.push(c); return c;
  }
  function addFreelancer(data, companyId, at) {
    const f = { id: uid('f'), kyc: { idCard: false, bankBook: false }, ...data };
    state.freelancers.push(f);
    if (companyId) link(companyId, f.id, at);
    return f;
  }
  function link(companyId, freelancerId, at) {
    if (!state.memberships.some(m => m.companyId === companyId && m.freelancerId === freelancerId))
      state.memberships.push({ companyId, freelancerId, since: at || today() });
  }
  function inviteFreelancer(companyId, data) {
    // If the freelancer already uses the platform (same tax ID), connect instead of duplicating.
    const taxId = String(data.taxId || '').replace(/\D/g, '');
    const existing = taxId && state.freelancers.find(f => f.taxId === taxId);
    if (existing) { link(companyId, existing.id); save(); return { freelancer: existing, existed: true }; }
    const f = addFreelancer({ ...data, taxId }, companyId);
    save(); return { freelancer: f, existed: false };
  }
  function updateFreelancer(id, patch) { Object.assign(freelancer(id), patch); save(); }
  const membersOf = companyId => state.memberships.filter(m => m.companyId === companyId).map(m => freelancer(m.freelancerId)).filter(Boolean);
  const clientsOf = freelancerId => state.memberships.filter(m => m.freelancerId === freelancerId).map(m => company(m.companyId)).filter(Boolean);

  // ---------- job lifecycle ----------
  // draft → sent → invoiced → approved → paid (50 ทวิ issued) → completed (receipt issued)
  function createOrder(data, { send = false, at } = {}) {
    at = at || new Date().toISOString();
    const n = nextNo('PO', data.companyId, at);
    const o = {
      id: uid('o'), no: n.no, status: 'draft', createdAt: at, updatedAt: at, history: [],
      companyId: data.companyId, freelancerId: data.freelancerId, title: data.title, scope: data.scope || '',
      amount: T.round2(data.amount), type: data.type, startDate: data.startDate || iso(at), dueDate: data.dueDate || addDays(at, 14),
      terms: +data.terms || 30, dispute: null
    };
    state.orders.push(o);
    link(o.companyId, o.freelancerId, iso(at));
    log(o, 'draft', 'company', at);
    if (send) sendOrder(o.id, at);
    save(); return o;
  }
  function sendOrder(id, at) {
    const o = order(id); assertStatus(o, 'draft');
    o.status = 'sent'; o.sentAt = at || new Date().toISOString(); log(o, 'sent', 'company', at); save(); return o;
  }
  function cancelOrder(id, at) {
    const o = order(id); assertStatus(o, 'draft', 'sent');
    o.status = 'cancelled'; log(o, 'cancelled', 'company', at); save(); return o;
  }
  function rejectOrder(id, note, at) {
    const o = order(id); assertStatus(o, 'sent');
    o.status = 'rejected'; log(o, 'rejected', 'freelancer', at, note); save(); return o;
  }
  function currentInvoice(orderId) {
    return state.invoices.filter(i => i.orderId === orderId && !i.void).slice(-1)[0];
  }
  function submitInvoice(orderId, { amount, dueDate, note } = {}, at) {
    const o = order(orderId); assertStatus(o, 'sent');
    at = at || new Date().toISOString();
    const n = nextNo('INV', o.freelancerId, at);
    const inv = {
      id: uid('inv'), no: n.no, orderId, companyId: o.companyId, freelancerId: o.freelancerId,
      amount: T.round2(amount ?? o.amount), issuedAt: at, dueDate: dueDate || addDays(at, o.terms), note: note || '', void: false
    };
    state.invoices.push(inv);
    o.status = 'invoiced'; log(o, 'invoiced', 'freelancer', at, inv.no);
    save(); return inv;
  }
  function approveInvoice(orderId, at) {
    const o = order(orderId); assertStatus(o, 'invoiced');
    o.status = 'approved'; log(o, 'approved', 'company', at, currentInvoice(orderId)?.no); save(); return o;
  }
  function rejectInvoice(orderId, note, at) {
    const o = order(orderId); assertStatus(o, 'invoiced');
    const inv = currentInvoice(orderId); if (inv) inv.void = true;
    o.status = 'sent'; log(o, 'invoice_returned', 'company', at, note); save(); return o;
  }
  /** Company pays: WHT is computed from the job's income type and the 50 ทวิ is issued immediately (มาตรา 50 ทวิ). */
  function recordPayment(orderId, { gross, paidAt, method = 'transfer', ref = '' } = {}) {
    const o = order(orderId); assertStatus(o, 'approved');
    const inv = currentInvoice(orderId);
    paidAt = paidAt || new Date().toISOString();
    const calc = T.calcWHT(gross ?? inv?.amount ?? o.amount, o.type);
    const p = { id: uid('pay'), orderId, companyId: o.companyId, freelancerId: o.freelancerId, invoiceId: inv?.id, paidAt, method, ref, ...calc };
    state.payments.push(p);
    const n = nextNo('WHT', o.companyId, paidAt);
    const cert = {
      id: uid('cert'), no: n.no, book: 1, seq: n.seq, year: n.year, orderId, paymentId: p.id,
      companyId: o.companyId, freelancerId: o.freelancerId, type: o.type, issuedAt: paidAt,
      gross: p.gross, rate: p.rate, wht: p.wht, form: 'ภ.ง.ด.3'
    };
    state.certificates.push(cert);
    o.status = 'paid'; log(o, 'paid', 'company', paidAt, cert.no);
    save(); return { payment: p, certificate: cert };
  }
  function issueReceipt(orderId, at) {
    const o = order(orderId); assertStatus(o, 'paid');
    const p = paymentOf(orderId);
    at = at || new Date().toISOString();
    const n = nextNo('RC', o.freelancerId, at);
    const rc = {
      id: uid('rc'), no: n.no, orderId, companyId: o.companyId, freelancerId: o.freelancerId,
      gross: p.gross, wht: p.wht, net: p.net, issuedAt: at, certificateNo: certOf(orderId)?.no
    };
    state.receipts.push(rc);
    o.dispute = null;
    o.status = 'completed'; log(o, 'completed', 'freelancer', at, rc.no);
    save(); return rc;
  }
  function disputePayment(orderId, { received, note } = {}, at) {
    const o = order(orderId); assertStatus(o, 'paid');
    o.dispute = { received: T.round2(received), note: note || '', at: at || new Date().toISOString(), open: true };
    log(o, 'disputed', 'freelancer', at, note); save(); return o;
  }
  function resolveDispute(orderId, at) {
    const o = order(orderId);
    if (o.dispute) o.dispute.open = false;
    log(o, 'dispute_resolved', 'company', at); save(); return o;
  }

  const paymentOf = orderId => state.payments.find(p => p.orderId === orderId);
  const certOf = orderId => state.certificates.find(c => c.orderId === orderId);
  const receiptOf = orderId => state.receipts.find(r => r.orderId === orderId);
  function docsOf(orderId) {
    return {
      invoice: currentInvoice(orderId),
      invoices: state.invoices.filter(i => i.orderId === orderId),
      payment: paymentOf(orderId), certificate: certOf(orderId), receipt: receiptOf(orderId)
    };
  }

  // ---------- freelancer-side records ----------
  function addExpense(data) { const e = { id: uid('exp'), ...data, amount: T.round2(data.amount) }; state.expenses.push(e); save(); return e; }
  function removeExpense(id) { state.expenses = state.expenses.filter(e => e.id !== id); save(); }
  function addExternalIncome(data) {
    const x = { id: uid('ext'), ...data, gross: T.round2(data.gross), wht: T.round2(data.wht || 0) };
    state.externalIncome.push(x); save(); return x;
  }
  function updateExternalIncome(id, patch) { Object.assign(byId('externalIncome', id), patch); save(); }
  function removeExternalIncome(id) { state.externalIncome = state.externalIncome.filter(e => e.id !== id); save(); }

  // ---------- ภ.ง.ด.3 filing ----------
  function markFiled(companyId, month) { state.filings[`${companyId}:${month}`] = { filedAt: new Date().toISOString() }; save(); }
  function unmarkFiled(companyId, month) { delete state.filings[`${companyId}:${month}`]; save(); }
  const filing = (companyId, month) => state.filings[`${companyId}:${month}`];
  /** Paper filing is due the 7th of the following month; e-filing the 15th. */
  function filingDue(month) {
    const [y, m] = month.split('-').map(Number);
    const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1;
    const mm = String(nm).padStart(2, '0');
    return { paper: `${ny}-${mm}-07`, online: `${ny}-${mm}-15` };
  }

  // ---------- derived: list of documents ----------
  function docsList({ companyId, freelancerId }) {
    const match = x => (companyId ? x.companyId === companyId : true) && (freelancerId ? x.freelancerId === freelancerId : true);
    const out = [];
    state.orders.filter(match).forEach(o => {
      if (o.status === 'draft' && freelancerId) return; // freelancers never see drafts
      out.push({ kind: 'po', id: o.id, no: o.no, date: o.sentAt || o.createdAt, orderId: o.id, companyId: o.companyId, freelancerId: o.freelancerId, amount: o.amount, title: o.title });
    });
    state.invoices.filter(match).forEach(i => out.push({ kind: 'inv', id: i.id, no: i.no, date: i.issuedAt, orderId: i.orderId, companyId: i.companyId, freelancerId: i.freelancerId, amount: i.amount, void: i.void, title: order(i.orderId)?.title }));
    state.certificates.filter(match).forEach(c => out.push({ kind: 'cert', id: c.id, no: c.no, date: c.issuedAt, orderId: c.orderId, companyId: c.companyId, freelancerId: c.freelancerId, amount: c.gross, wht: c.wht, title: order(c.orderId)?.title }));
    state.receipts.filter(match).forEach(r => out.push({ kind: 'rc', id: r.id, no: r.no, date: r.issuedAt, orderId: r.orderId, companyId: r.companyId, freelancerId: r.freelancerId, amount: r.gross, title: order(r.orderId)?.title }));
    return out.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  // ---------- derived: reconciliation / checks (company side, 1.5) ----------
  const RECEIPT_GRACE_DAYS = 7;
  function companyIssues(companyId) {
    const issues = [];
    const now = Date.now();
    state.orders.filter(o => o.companyId === companyId).forEach(o => {
      const d = docsOf(o.id);
      if (d.invoice && ['invoiced', 'approved', 'paid', 'completed'].includes(o.status) && d.invoice.amount !== o.amount)
        issues.push({ kind: 'inv_mismatch', severity: 'high', orderId: o.id, data: { po: o.amount, inv: d.invoice.amount } });
      if (d.payment) {
        if (d.invoice && d.payment.gross !== d.invoice.amount)
          issues.push({ kind: 'pay_mismatch', severity: 'high', orderId: o.id, data: { inv: d.invoice.amount, paid: d.payment.gross } });
        const expected = T.calcWHT(d.payment.gross, o.type).wht;
        if (d.payment.wht !== expected || (d.certificate && d.certificate.wht !== d.payment.wht))
          issues.push({ kind: 'wht_mismatch', severity: 'high', orderId: o.id, data: { expected, actual: d.payment.wht } });
        if (!d.certificate) issues.push({ kind: 'no_cert', severity: 'high', orderId: o.id, data: {} });
        const days = Math.floor((now - new Date(d.payment.paidAt).getTime()) / DAY);
        if (!d.receipt && days > RECEIPT_GRACE_DAYS)
          issues.push({ kind: 'no_receipt', severity: 'med', orderId: o.id, data: { days } });
      }
      if (o.dispute && o.dispute.open)
        issues.push({ kind: 'dispute', severity: 'high', orderId: o.id, data: { received: o.dispute.received, expected: d.payment?.net, note: o.dispute.note } });
    });
    membersOf(companyId).forEach(f => {
      if (!T.validTaxId(f.taxId)) issues.push({ kind: 'bad_taxid', severity: 'high', freelancerId: f.id, data: { taxId: f.taxId } });
      const missing = Object.keys(f.kyc || {}).filter(k => !f.kyc[k]);
      if (missing.length) issues.push({ kind: 'kyc_missing', severity: 'low', freelancerId: f.id, data: { docs: missing } });
    });
    const curMonth = monthKey(today());
    const months = [...new Set(state.payments.filter(p => p.companyId === companyId && p.wht > 0).map(p => monthKey(p.paidAt)))];
    months.filter(m => m < curMonth && !filing(companyId, m)).forEach(m =>
      issues.push({ kind: 'filing_due', severity: today() > filingDue(m).online ? 'high' : 'med', data: { month: m, due: filingDue(m) } }));
    const rank = { high: 0, med: 1, low: 2 };
    return issues.sort((a, b) => rank[a.severity] - rank[b.severity]);
  }

  // ---------- derived: alerts for the bell ----------
  function alerts(s) {
    s = s || session;
    const out = [];
    if (s.role === 'company') {
      state.orders.filter(o => o.companyId === s.companyId).forEach(o => {
        if (o.status === 'invoiced') out.push({ kind: 'approve_todo', orderId: o.id });
        if (o.status === 'approved') out.push({ kind: 'pay_todo', orderId: o.id });
      });
      companyIssues(s.companyId).filter(i => i.severity === 'high').forEach(i => out.push({ kind: 'issue', issue: i, orderId: i.orderId }));
    } else {
      state.orders.filter(o => o.freelancerId === s.freelancerId).forEach(o => {
        if (o.status === 'sent') out.push({ kind: 'po_waiting', orderId: o.id });
        if (o.status === 'paid' && !(o.dispute && o.dispute.open)) out.push({ kind: 'receipt_todo', orderId: o.id });
        if (o.status === 'paid' && o.dispute && o.dispute.open) out.push({ kind: 'dispute_open', orderId: o.id });
      });
      state.externalIncome.filter(x => x.freelancerId === s.freelancerId && x.wht > 0 && !x.hasCert)
        .forEach(x => out.push({ kind: 'ext_no_cert', extId: x.id, data: { client: x.client } }));
    }
    return out;
  }

  // ---------- seed ----------
  function seed() {
    state = blank();
    const id = base => T.withCheckDigit(base);
    const c1 = addCompany({ name: 'บริษัท ครีเอทีฟ ฮับ จำกัด', nameEn: 'Creative Hub Co., Ltd.', taxId: id('010555012345'), address: '99/9 ถนนสุขุมวิท แขวงคลองเตยเหนือ เขตวัฒนา กรุงเทพฯ 10110', plan: 'Agency' });
    const c2 = addCompany({ name: 'บริษัท สตาร์ทอัพ เนสท์ จำกัด', nameEn: 'Startup Nest Co., Ltd.', taxId: id('010556078901'), address: '1 อาคารเนสท์ ถนนพระราม 4 แขวงสีลม เขตบางรัก กรุงเทพฯ 10500', plan: 'Startup' });

    const at = n => new Date(Date.now() - n * DAY).toISOString();
    const f1 = addFreelancer({ name: 'นางสาวมินตรา ใจดี', nameEn: 'Mintra Jaidee', taxId: id('110170020711'), email: 'mintra@example.com', phone: '081-000-1111', defaultType: '40-2', role: { th: 'กราฟิกดีไซเนอร์', en: 'Graphic designer' }, address: '12 ซอยอารีย์ 4 แขวงสามเสนใน เขตพญาไท กรุงเทพฯ 10400', kyc: { idCard: true, bankBook: true } }, c1.id, daysAgo(200));
    const f2 = addFreelancer({ name: 'นายภาคิน ศรีสุข', nameEn: 'Pakin Srisuk', taxId: id('350990011223'), email: 'pakin@example.com', phone: '082-000-2222', defaultType: '40-8-svc', role: { th: 'นักพัฒนาเว็บ', en: 'Web developer' }, address: '45 ถนนนิมมานเหมินท์ ตำบลสุเทพ อำเภอเมือง เชียงใหม่ 50200', kyc: { idCard: true, bankBook: true } }, c1.id, daysAgo(180));
    const f3 = addFreelancer({ name: 'นางสาวพิมพ์ชนก แสงทอง', nameEn: 'Pimchanok Saengthong', taxId: id('110370055667'), email: 'pim@example.com', phone: '083-000-3333', defaultType: '40-8-ad', role: { th: 'อินฟลูเอนเซอร์', en: 'Influencer' }, address: '88 ถนนรัชดาภิเษก แขวงดินแดง เขตดินแดง กรุงเทพฯ 10400', kyc: { idCard: true, bankBook: true } }, c1.id, daysAgo(120));
    const f4 = addFreelancer({ name: 'นายธนวัฒน์ วงศ์ไทย', nameEn: 'Thanawat Wongthai', taxId: id('310060088990'), email: 'thanawat@example.com', phone: '084-000-4444', defaultType: '40-6', role: { th: 'สถาปนิก (ใบอนุญาต ส.12345)', en: 'Architect (licensed)' }, address: '7 ถนนมิตรภาพ ตำบลในเมือง อำเภอเมือง ขอนแก่น 40000', kyc: { idCard: true, bankBook: false } }, c1.id, daysAgo(60));
    const f5 = addFreelancer({ name: 'นายกิตติ มั่นคง', nameEn: 'Kitti Mankong', taxId: '1100800123450', email: 'kitti@example.com', phone: '085-000-5555', defaultType: '40-2', role: { th: 'ช่างภาพ', en: 'Photographer' }, address: '3 ถนนพหลโยธิน แขวงจตุจักร เขตจตุจักร กรุงเทพฯ 10900', kyc: { idCard: false, bankBook: true } }, c1.id, daysAgo(40));
    // Make sure f5's tax ID is deliberately wrong (a typo) so the checks page has something to show.
    if (T.validTaxId(f5.taxId)) f5.taxId = f5.taxId.slice(0, 12) + ((+f5.taxId[12] + 1) % 10);

    // Run a job through the real lifecycle so every seeded document is consistent.
    function job(c, f, title, amount, type, steps, opts = {}) {
      const [created, sent, invoiced, approved, paid, receipt] = steps;
      const o = createOrder({ companyId: c.id, freelancerId: f.id, title, scope: opts.scope || '', amount, type, startDate: daysAgo(created), dueDate: daysAgo(created - 21), terms: opts.terms || 30 }, { at: at(created) });
      if (sent == null) return o;
      sendOrder(o.id, at(sent));
      if (invoiced == null) return o;
      submitInvoice(o.id, { amount: opts.invAmount ?? amount }, at(invoiced));
      if (approved == null) return o;
      approveInvoice(o.id, at(approved));
      if (paid == null) return o;
      recordPayment(o.id, { gross: opts.paidAmount, paidAt: at(paid), ref: 'TRF' + Math.floor(1e6 + Math.random() * 9e6) });
      if (opts.dispute) { disputePayment(o.id, opts.dispute, at(paid - 1)); return o; }
      if (receipt == null) return o;
      issueReceipt(o.id, at(receipt));
      return o;
    }

    job(c1, f1, 'ออกแบบโลโก้และอัตลักษณ์แบรนด์ใหม่', 25000, '40-2', [75, 74, 66, 64, 60, 59], { scope: 'โลโก้ 3 แบบ ปรับแก้ 2 รอบ พร้อมคู่มือการใช้งานแบรนด์ (Brand guideline)' });
    job(c1, f2, 'พัฒนาเว็บไซต์ Landing page แคมเปญ', 48000, '40-8-svc', [70, 69, 50, 48, 45, 44], { scope: 'Landing page 1 หน้า responsive เชื่อมต่อฟอร์มลงทะเบียน' });
    job(c1, f3, 'TikTok รีวิวสินค้า 1 คลิป', 800, '40-8-ad', [35, 35, 30, 29, 28, 27], { scope: 'คลิปรีวิวสั้น 30 วินาที' });
    job(c1, f1, 'ออกแบบโปสเตอร์งานอีเวนต์', 15000, '40-2', [30, 29, 26, 25, 22, 21]);
    job(c1, f5, 'ถ่ายภาพบรรยากาศงานเปิดตัว', 5000, '40-2', [25, 25, 20, 18, 12, null]);
    job(c1, f2, 'ตั้งค่าโฮสติ้งและโดเมน', 6000, '40-8-svc', [12, 12, 9, 8, 6, null], { dispute: { received: 5700, note: 'ยอดที่โอนเข้าบัญชีขาดไป 120 บาท' } });
    job(c1, f3, 'แคมเปญ Instagram 3 โพสต์', 30000, '40-8-ad', [14, 13, 8, 6, 3, null], { scope: 'โพสต์ภาพ 3 โพสต์ + สตอรี่ 6 สตอรี่ ภายในเดือนนี้' });
    job(c1, f1, 'ชุดภาพโซเชียลมีเดียประจำเดือน', 12000, '40-2', [10, 10, 5, 2, null], { scope: 'ภาพโพสต์ 12 ชิ้น ขนาด 1080×1350' });
    job(c1, f2, 'แก้บั๊กแอปมือถือ (iOS/Android)', 18000, '40-8-svc', [9, 9, 2, null], { invAmount: 19500, scope: 'แก้ไขบั๊กตามรายการ 8 รายการ' });
    job(c1, f4, 'ออกแบบปรับปรุงสำนักงานชั้น 3', 80000, '40-6', [20, 19, 1, null], { scope: 'แบบสถาปัตยกรรมพร้อมแบบก่อสร้าง พื้นที่ 220 ตร.ม.' });
    job(c1, f5, 'ถ่ายภาพสินค้าคอลเลกชันใหม่', 9000, '40-2', [2, 1, null], { scope: 'ภาพสินค้า 40 ภาพ พื้นหลังขาว' });
    job(c1, f2, 'เชื่อมต่อ API ระบบชำระเงิน', 35000, '40-8-svc', [1, null], { scope: 'เชื่อมต่อ payment gateway และทดสอบ' });

    job(c2, f1, 'ออกแบบ Pitch deck ระดมทุน', 20000, '40-2', [50, 49, 40, 38, 33, 32], { scope: 'สไลด์ 20 หน้า ภาษาอังกฤษ' });
    job(c2, f1, 'ออกแบบ UI แอปพลิเคชัน', 45000, '40-2', [3, 2, null], { scope: 'UI 15 หน้าจอ พร้อม prototype ใน Figma' });
    job(c2, f4, 'ที่ปรึกษาออกแบบพื้นที่ co-working', 26000, '40-6', [40, 40, 34, 33, 30, 30]);

    // Income f1 earned outside the platform (2.1 "record income from every source").
    state.externalIncome.push(
      { id: uid('ext'), freelancerId: f1.id, client: 'ร้านกาแฟบ้านสวน', type: '40-2', gross: 8000, wht: 0, date: daysAgo(55), received: true, hasCert: false },
      { id: uid('ext'), freelancerId: f1.id, client: 'บริษัท มีเดีย พลัส จำกัด', type: '40-2', gross: 15000, wht: 450, date: daysAgo(18), received: true, hasCert: false }
    );
    state.expenses.push(
      { id: uid('exp'), freelancerId: f1.id, date: daysAgo(40), desc: 'Adobe Creative Cloud (รายปี)', category: 'software', amount: 9600 },
      { id: uid('exp'), freelancerId: f1.id, date: daysAgo(20), desc: 'แท็บเล็ตวาดภาพ', category: 'equipment', amount: 12900 }
    );

    // Months before last month are already filed; last month is left open to show the reminder.
    const lastMonth = monthKey(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 15).toISOString());
    state.payments.forEach(p => { const m = monthKey(p.paidAt); if (m < lastMonth) state.filings[`${p.companyId}:${m}`] = { filedAt: p.paidAt }; });
    return state;
  }

  // ---------- public API ----------
  JC.store = {
    load, save, reset,
    get state() { return state; },
    get session() { return session; },
    setSession(patch) { Object.assign(session, patch); saveSession(); },
    byId, company, freelancer, order, membersOf, clientsOf,
    inviteFreelancer, updateFreelancer,
    createOrder, sendOrder, cancelOrder, rejectOrder, submitInvoice, approveInvoice, rejectInvoice,
    recordPayment, issueReceipt, disputePayment, resolveDispute,
    currentInvoice, paymentOf, certOf, receiptOf, docsOf, docsList,
    addExpense, removeExpense, addExternalIncome, updateExternalIncome, removeExternalIncome,
    markFiled, unmarkFiled, filing, filingDue,
    companyIssues, alerts,
    util: { iso, today, daysAgo, addDays, monthKey, sum, DAY }
  };
})();
