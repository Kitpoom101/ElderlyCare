/* Printable document renderers. Documents are always in Thai (they are legal/tax
 * documents) with English sub-titles. Each returns an HTML string of one or more .paper sheets. */
(function () {
  'use strict';
  const T = JC.tax, S = JC.store;

  const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const thDate = d => { const x = new Date(d); return `${x.getDate()} ${TH_MONTHS[x.getMonth()]} ${x.getFullYear() + 543}`; };
  const m2 = n => (+n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const box = on => `<span class="cb">${on ? '☑' : '☐'}</span>`;
  const typeLabel = k => T.INCOME_TYPES[k] ? `${T.INCOME_TYPES[k].section} ${T.INCOME_TYPES[k].label.th}` : k;
  const pct = r => (r * 100).toLocaleString('th-TH', { maximumFractionDigits: 2 }) + '%';

  function party(p, roleTh) {
    return `<div class="pt">
      <small>${roleTh}</small>
      <b>${esc(p.name)}</b>
      <span>${esc(p.address || '')}</span>
      <span>เลขประจำตัวผู้เสียภาษีอากร <span class="mono">${esc(T.formatTaxId(p.taxId))}</span>${p.branch ? ' · ' + esc(p.branch) : ''}</span>
    </div>`;
  }
  function head(titleTh, titleEn, no, date, extra = '') {
    return `<div class="dh">
      <div><h1>${titleTh}</h1><div class="sub">${titleEn}</div></div>
      <dl><dt>เลขที่ / No.</dt><dd class="mono">${esc(no)}</dd><dt>วันที่ / Date</dt><dd>${thDate(date)}</dd>${extra}</dl>
    </div>`;
  }
  function sign(left, right) {
    return `<div class="signs">
      <div><div class="line"></div>${left}</div>
      <div><div class="line"></div>${right}</div>
    </div>`;
  }

  // ---------- ใบสั่งจ้าง / Purchase order (issued by company) ----------
  function po(o) {
    const c = S.company(o.companyId), f = S.freelancer(o.freelancerId);
    const w = T.calcWHT(o.amount, o.type);
    return `<article class="paper">
      ${head('ใบสั่งจ้าง', 'Purchase Order', o.no, o.sentAt || o.createdAt)}
      <div class="parties">${party(c, 'ผู้ว่าจ้าง / Client')}${party(f, 'ผู้รับจ้าง / Contractor')}</div>
      <table class="dt">
        <thead><tr><th>รายละเอียดงานและขอบเขต / Description &amp; scope</th><th class="r">จำนวนเงิน (บาท)</th></tr></thead>
        <tbody><tr><td><b>${esc(o.title)}</b>${o.scope ? `<div class="scope">${esc(o.scope)}</div>` : ''}</td><td class="r">${m2(o.amount)}</td></tr></tbody>
        <tfoot><tr><td class="r">รวมค่าจ้าง / Total</td><td class="r"><b>${m2(o.amount)}</b></td></tr>
        <tr><td colspan="2" class="words">(${T.bahttext(o.amount)})</td></tr></tfoot>
      </table>
      <table class="kv">
        <tr><th>ระยะเวลางาน</th><td>${thDate(o.startDate)} – ${thDate(o.dueDate)}</td></tr>
        <tr><th>เงื่อนไขการชำระเงิน</th><td>ชำระภายใน ${o.terms} วัน นับจากวันที่ได้รับใบแจ้งหนี้ที่ถูกต้อง</td></tr>
        <tr><th>ประเภทเงินได้</th><td>มาตรา ${typeLabel(o.type)}</td></tr>
        <tr><th>ภาษีหัก ณ ที่จ่าย (ประมาณการ)</th><td>${pct(w.rate)} = ${m2(w.wht)} บาท · ยอดรับสุทธิ ${m2(w.net)} บาท</td></tr>
      </table>
      <p class="note">ผู้รับจ้างโปรดออกใบแจ้งหนี้ให้ตรงกับใบสั่งจ้างฉบับนี้ ผู้ว่าจ้างจะออกหนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ) ให้ทันทีเมื่อชำระเงิน</p>
      ${sign('ผู้มีอำนาจลงนาม (ผู้ว่าจ้าง)', 'ผู้รับจ้าง')}
    </article>`;
  }

  // ---------- ใบแจ้งหนี้ / Invoice (issued by freelancer) ----------
  function invoice(inv) {
    const o = S.order(inv.orderId), c = S.company(inv.companyId), f = S.freelancer(inv.freelancerId);
    const w = T.calcWHT(inv.amount, o.type);
    const mismatch = inv.amount !== o.amount;
    return `<article class="paper">
      ${inv.void ? '<div class="void">ยกเลิก / VOID</div>' : ''}
      ${head('ใบแจ้งหนี้', 'Invoice', inv.no, inv.issuedAt, `<dt>อ้างอิง / Ref.</dt><dd class="mono">${esc(o.no)}</dd><dt>ครบกำหนด / Due</dt><dd>${thDate(inv.dueDate)}</dd>`)}
      <div class="parties">${party(f, 'ผู้ออกใบแจ้งหนี้ / From')}${party(c, 'ลูกค้า / Bill to')}</div>
      <table class="dt">
        <thead><tr><th>รายการ / Description</th><th class="r">จำนวนเงิน (บาท)</th></tr></thead>
        <tbody><tr><td><b>${esc(o.title)}</b><div class="scope">ตามใบสั่งจ้างเลขที่ ${esc(o.no)}${inv.note ? ' · ' + esc(inv.note) : ''}</div></td><td class="r">${m2(inv.amount)}</td></tr></tbody>
        <tfoot>
          <tr><td class="r">รวมเป็นเงิน / Total</td><td class="r"><b>${m2(inv.amount)}</b></td></tr>
          <tr><td class="r muted">หัก ภาษี ณ ที่จ่าย ${pct(w.rate)} (ผู้ว่าจ้างหัก)</td><td class="r muted">${m2(w.wht)}</td></tr>
          <tr><td class="r">ยอดชำระสุทธิ / Net payable</td><td class="r"><b>${m2(w.net)}</b></td></tr>
          <tr><td colspan="2" class="words">(${T.bahttext(inv.amount)})</td></tr>
        </tfoot>
      </table>
      ${mismatch ? `<p class="warn">⚠ ยอดในใบแจ้งหนี้ (${m2(inv.amount)}) ไม่ตรงกับใบสั่งจ้าง (${m2(o.amount)})</p>` : ''}
      <p class="note">ผู้รับจ้างไม่ได้จดทะเบียนภาษีมูลค่าเพิ่ม · Not VAT-registered</p>
      ${sign('ผู้รับจ้าง', 'ผู้รับใบแจ้งหนี้')}
    </article>`;
  }

  // ---------- ใบเสร็จรับเงิน / Receipt (issued by freelancer) ----------
  function receipt(rc) {
    const o = S.order(rc.orderId), c = S.company(rc.companyId), f = S.freelancer(rc.freelancerId);
    return `<article class="paper">
      ${head('ใบเสร็จรับเงิน', 'Receipt', rc.no, rc.issuedAt, `<dt>อ้างอิง / Ref.</dt><dd class="mono">${esc(o.no)}</dd>`)}
      <div class="parties">${party(f, 'ผู้รับเงิน / Received by')}${party(c, 'ได้รับเงินจาก / Received from')}</div>
      <table class="dt">
        <thead><tr><th>รายการ / Description</th><th class="r">จำนวนเงิน (บาท)</th></tr></thead>
        <tbody><tr><td><b>${esc(o.title)}</b><div class="scope">ตามใบสั่งจ้าง ${esc(o.no)}</div></td><td class="r">${m2(rc.gross)}</td></tr></tbody>
        <tfoot>
          <tr><td class="r">ค่าจ้างก่อนหักภาษี / Gross</td><td class="r">${m2(rc.gross)}</td></tr>
          <tr><td class="r">ภาษีหัก ณ ที่จ่าย (หนังสือรับรองเลขที่ ${esc(rc.certificateNo || '-')})</td><td class="r">${m2(rc.wht)}</td></tr>
          <tr><td class="r">รับเงินสุทธิ / Net received</td><td class="r"><b>${m2(rc.net)}</b></td></tr>
          <tr><td colspan="2" class="words">(${T.bahttext(rc.gross)})</td></tr>
        </tfoot>
      </table>
      ${sign('ผู้รับเงิน', 'ผู้จ่ายเงิน')}
    </article>`;
  }

  // ---------- หนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ) — two identical copies ----------
  const ROWS = [
    'เงินเดือน ค่าจ้าง เบี้ยเลี้ยง โบนัส ฯลฯ ตามมาตรา 40 (1)',
    'ค่าธรรมเนียม ค่านายหน้า ฯลฯ ตามมาตรา 40 (2)',
    'ค่าแห่งลิขสิทธิ์ ฯลฯ ตามมาตรา 40 (3)',
    'ดอกเบี้ย เงินปันผล ฯลฯ ตามมาตรา 40 (4)',
    'การจ่ายเงินได้ที่ต้องหักภาษี ณ ที่จ่าย ตามคำสั่งกรมสรรพากรที่ออกตามมาตรา 3 เตรส เช่น ค่าจ้างทำของ ค่าโฆษณา ค่าขนส่ง ค่าบริการ ค่าวิชาชีพอิสระ ฯลฯ',
    'อื่น ๆ (ระบุ)'
  ];
  const FORMS = ['ภ.ง.ด.1ก', 'ภ.ง.ด.1ก พิเศษ', 'ภ.ง.ด.2', 'ภ.ง.ด.3', 'ภ.ง.ด.2ก', 'ภ.ง.ด.3ก', 'ภ.ง.ด.53'];

  function certSheet(cert, copy) {
    const c = S.company(cert.companyId), f = S.freelancer(cert.freelancerId);
    const def = T.INCOME_TYPES[cert.type];
    const rowIdx = def.form50Row;
    const copyText = copy === 1
      ? 'ฉบับที่ 1 (สำหรับผู้ถูกหักภาษี ณ ที่จ่าย ใช้แนบพร้อมกับแบบแสดงรายการภาษี)'
      : 'ฉบับที่ 2 (สำหรับผู้ถูกหักภาษี ณ ที่จ่าย เก็บไว้เป็นหลักฐาน)';
    const rows = ROWS.map((label, i) => {
      const on = i + 1 === rowIdx;
      const spec = on && rowIdx === 5 ? `<div class="spec">(ระบุ) ${esc(def.label.th)} — มาตรา ${def.section} อัตรา ${pct(cert.rate)}</div>` : '';
      return `<tr><td>${i + 1}. ${label}${spec}</td>
        <td class="c">${on ? thDate(cert.issuedAt) : ''}</td>
        <td class="r">${on ? m2(cert.gross) : ''}</td>
        <td class="r">${on ? m2(cert.wht) : ''}</td></tr>`;
    }).join('');
    return `<article class="paper cert">
      <div class="copy">${copyText}</div>
      <div class="ch">
        <div><h1>หนังสือรับรองการหักภาษี ณ ที่จ่าย</h1><div class="sub">ตามมาตรา 50 ทวิ แห่งประมวลรัษฎากร · Withholding Tax Certificate</div></div>
        <dl><dt>เล่มที่</dt><dd>${cert.book}</dd><dt>เลขที่</dt><dd class="mono">${String(cert.seq).padStart(4, '0')}</dd></dl>
      </div>
      <div class="cparty"><b>ผู้มีหน้าที่หักภาษี ณ ที่จ่าย :</b>
        <div class="grid2"><span>ชื่อ <u>${esc(c.name)}</u></span><span>เลขประจำตัวผู้เสียภาษีอากร <u class="mono">${esc(T.formatTaxId(c.taxId))}</u></span></div>
        <div>ที่อยู่ <u>${esc(c.address)}</u></div></div>
      <div class="cparty"><b>ผู้ถูกหักภาษี ณ ที่จ่าย :</b>
        <div class="grid2"><span>ชื่อ <u>${esc(f.name)}</u></span><span>เลขประจำตัวผู้เสียภาษีอากร <u class="mono">${esc(T.formatTaxId(f.taxId))}</u></span></div>
        <div>ที่อยู่ <u>${esc(f.address)}</u></div></div>
      <div class="forms">ลำดับที่ <u>${cert.seq}</u> ในแบบ ${FORMS.map(x => `${box(x === cert.form)} ${x}`).join('&nbsp;&nbsp; ')}</div>
      <table class="dt ct">
        <thead><tr><th>ประเภทเงินได้พึงประเมินที่จ่าย</th><th class="c">วัน เดือน หรือปีภาษี ที่จ่าย</th><th class="r">จำนวนเงินที่จ่าย</th><th class="r">ภาษีที่หัก และนำส่งไว้</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr><td colspan="2" class="r"><b>รวมเงินที่จ่ายและภาษีที่หักนำส่ง</b></td><td class="r"><b>${m2(cert.gross)}</b></td><td class="r"><b>${m2(cert.wht)}</b></td></tr>
          <tr><td colspan="4"><b>รวมเงินภาษีที่หักนำส่ง (ตัวอักษร)</b> <span class="words">${T.bahttext(cert.wht)}</span></td></tr>
        </tfoot>
      </table>
      <div class="forms">ผู้จ่ายเงิน ${box(true)} (1) หัก ณ ที่จ่าย &nbsp; ${box(false)} (2) ออกให้ตลอดไป &nbsp; ${box(false)} (3) ออกให้ครั้งเดียว &nbsp; ${box(false)} (4) อื่น ๆ</div>
      <div class="cfoot">
        <p class="warn-sm"><b>คำเตือน</b> ผู้มีหน้าที่ออกหนังสือรับรองการหักภาษี ณ ที่จ่าย ฝ่าฝืนไม่ปฏิบัติตามมาตรา 50 ทวิ แห่งประมวลรัษฎากร ต้องรับโทษทางอาญาตามมาตรา 35 แห่งประมวลรัษฎากร</p>
        <div class="certsign">ขอรับรองว่าข้อความและตัวเลขดังกล่าวข้างต้นถูกต้องตรงกับความจริงทุกประการ
          <div class="line"></div>ลงชื่อ ผู้จ่ายเงิน<br>${thDate(cert.issuedAt)}<br><small>(วัน เดือน ปี ที่ออกหนังสือรับรองฯ)</small>
        </div>
      </div>
      <p class="demo-note">เอกสารตัวอย่างจากระบบสาธิต · Demo document</p>
    </article>`;
  }
  const certificate = cert => certSheet(cert, 1) + certSheet(cert, 2);

  // ---------- ใบเสร็จค่าใช้จ่าย (freelancer's own expense record) ----------
  function expense(e) {
    return `<article class="paper">
      ${head('บันทึกค่าใช้จ่าย', 'Expense record', e.id.slice(-6).toUpperCase(), e.date)}
      <table class="kv"><tr><th>รายการ</th><td>${esc(e.desc)}</td></tr><tr><th>หมวด</th><td>${esc(e.category)}</td></tr><tr><th>จำนวนเงิน</th><td>${m2(e.amount)} บาท</td></tr></table>
      ${e.image ? `<img class="exp-img" src="${e.image}" alt="">` : '<p class="note">ไม่มีไฟล์แนบ</p>'}
    </article>`;
  }

  function render(kind, id) {
    switch (kind) {
      case 'po': return po(S.order(id));
      case 'inv': return invoice(S.byId('invoices', id));
      case 'rc': return receipt(S.byId('receipts', id));
      case 'cert': return certificate(S.byId('certificates', id));
      case 'exp': return expense(S.byId('expenses', id));
    }
    return '';
  }

  JC.docs = { render, thDate, esc };
})();
