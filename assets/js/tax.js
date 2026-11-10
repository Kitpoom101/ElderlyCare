/* Tax rules for the prototype.
 * Rates are SIMPLIFIED for demo purposes — verify against the Revenue Department
 * (กรมสรรพากร) before relying on them. All rules live here so they're easy to change.
 * Works in the browser (window.JC.tax) and in Node (module.exports) for tests. */
(function (root) {
  'use strict';

  // Income categories a company can pay a freelancer under.
  // rate   = withholding-tax rate the payer deducts (ท.ป.4/2528, simplified)
  // deduct = flat expense deduction the freelancer may claim on their annual return
  // form50Row = which row of the 50 ทวิ form the payment goes on
  const INCOME_TYPES = {
    '40-2': {
      section: '40(2)', rate: 0.03, deduct: { rate: 0.5, cap: 100000 }, form50Row: 2,
      label: { th: 'ค่าจ้าง / ค่าบริการฟรีแลนซ์ทั่วไป', en: 'General freelance fee' },
      hint: { th: 'งานเขียน ออกแบบ รับจ้างทั่วไป ใช้ทักษะส่วนตัว', en: 'Writing, design, general one-off work' }
    },
    '40-6-med': {
      section: '40(6)', rate: 0.03, deduct: { rate: 0.6 }, form50Row: 5,
      label: { th: 'วิชาชีพอิสระ — การประกอบโรคศิลปะ', en: 'Licensed profession — medical' },
      hint: { th: 'แพทย์ ทันตแพทย์ ฯลฯ', en: 'Doctors, dentists, etc.' }
    },
    '40-6': {
      section: '40(6)', rate: 0.03, deduct: { rate: 0.3 }, form50Row: 5,
      label: { th: 'วิชาชีพอิสระ — กฎหมาย วิศวกรรม สถาปัตยกรรม บัญชี', en: 'Licensed profession — law, engineering, architecture, accounting' },
      hint: { th: 'ต้องมีใบประกอบวิชาชีพ', en: 'Requires a professional licence' }
    },
    '40-8-svc': {
      section: '40(8)', rate: 0.03, deduct: { rate: 0.6 }, form50Row: 5,
      label: { th: 'ธุรกิจ / รับเหมา / บริการอื่น ๆ', en: 'Business / contracting / other services' },
      hint: { th: 'ค่าบริการ ค่าจ้างทำของ', en: 'Service fees, contract work' }
    },
    '40-8-ad': {
      section: '40(8)', rate: 0.02, deduct: { rate: 0.6 }, form50Row: 5,
      label: { th: 'ค่าโฆษณา', en: 'Advertising' },
      hint: { th: 'อินฟลูเอนเซอร์ คอนเทนต์ครีเอเตอร์ รับโปรโมต', en: 'Influencer / creator promotion' }
    },
    '40-8-trans': {
      section: '40(8)', rate: 0.01, deduct: { rate: 0.6 }, form50Row: 5,
      label: { th: 'ค่าขนส่ง', en: 'Transport' },
      hint: { th: 'ขนส่งสินค้า (ไม่รวมขนส่งสาธารณะ)', en: 'Goods transport' }
    }
  };

  // Payments under this amount (per payment) are not subject to WHT.
  const WHT_MIN_PAYMENT = 1000;
  const PERSONAL_ALLOWANCE = 60000;
  // [upper bound of bracket, rate]
  const PIT_BRACKETS = [
    [150000, 0], [300000, 0.05], [500000, 0.10], [750000, 0.15],
    [1000000, 0.20], [2000000, 0.25], [5000000, 0.30], [Infinity, 0.35]
  ];

  const round2 = n => Math.round((+n + Number.EPSILON) * 100) / 100;

  /** Withholding tax for one payment. */
  function calcWHT(gross, typeKey) {
    gross = round2(gross);
    const type = INCOME_TYPES[typeKey];
    if (!type) throw new Error('Unknown income type: ' + typeKey);
    const rate = gross >= WHT_MIN_PAYMENT ? type.rate : 0;
    const wht = round2(gross * rate);
    return { gross, rate, wht, net: round2(gross - wht) };
  }

  /** Thai 13-digit tax ID / national ID checksum. Accepts dashes/spaces. */
  function validTaxId(id) {
    const d = String(id || '').replace(/[\s-]/g, '');
    if (!/^\d{13}$/.test(d)) return false;
    return checkDigit(d.slice(0, 12)) === +d[12];
  }
  function checkDigit(first12) {
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += +first12[i] * (13 - i);
    return (11 - (sum % 11)) % 10;
  }
  /** Complete a 12-digit base into a valid 13-digit ID (used for demo data). */
  function withCheckDigit(first12) { return first12 + checkDigit(first12); }
  function formatTaxId(id) {
    const d = String(id || '').replace(/\D/g, '');
    if (d.length !== 13) return id || '';
    return `${d[0]}-${d.slice(1, 5)}-${d.slice(5, 10)}-${d.slice(10, 12)}-${d[12]}`;
  }

  // ---- amount in Thai words (BAHTTEXT) ----
  const DIG = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const POS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];
  function readGroup(s) { // up to 6 digits
    s = s.replace(/^0+/, '');
    let out = '';
    const L = s.length;
    for (let i = 0; i < L; i++) {
      const d = +s[i], p = L - 1 - i;
      if (!d) continue;
      if (p === 1) out += d === 1 ? 'สิบ' : d === 2 ? 'ยี่สิบ' : DIG[d] + 'สิบ';
      else if (p === 0) out += d === 1 && L > 1 ? 'เอ็ด' : DIG[d];
      else out += DIG[d] + POS[p];
    }
    return out;
  }
  function readInt(s) {
    s = s.replace(/^0+/, '');
    if (!s) return '';
    if (s.length > 6) return readInt(s.slice(0, -6)) + 'ล้าน' + readGroup(s.slice(-6));
    return readGroup(s);
  }
  function bahttext(n) {
    const fixed = Math.abs(round2(n)).toFixed(2);
    const [baht, satang] = fixed.split('.');
    const b = readInt(baht), s = readGroup(satang);
    if (!b && !s) return 'ศูนย์บาทถ้วน';
    return (b ? b + 'บาท' : '') + (s ? s + 'สตางค์' : 'ถ้วน');
  }

  // ---- personal income tax estimate ----
  function progressiveTax(netIncome) {
    let tax = 0, prev = 0;
    for (const [cap, rate] of PIT_BRACKETS) {
      if (netIncome > prev) tax += (Math.min(netIncome, cap) - prev) * rate;
      prev = cap;
    }
    return round2(tax);
  }

  /**
   * Estimate a freelancer's annual personal income tax.
   * incomes: [{ type: '40-2', gross: 120000, wht: 3600 }, ...]
   * otherAllowances: extra deductions beyond the personal allowance (SSO, insurance, funds…)
   */
  function estimateAnnualTax({ incomes = [], otherAllowances = 0 } = {}) {
    // Sum gross by income type
    const byType = {};
    let gross = 0, whtPaid = 0;
    for (const inc of incomes) {
      const g = +inc.gross || 0;
      byType[inc.type] = (byType[inc.type] || 0) + g;
      gross += g;
      whtPaid += +inc.wht || 0;
    }
    // Flat expense deductions. The 40(2) cap applies to all 40(2) income combined.
    const rows = Object.keys(byType).map(type => {
      const def = INCOME_TYPES[type];
      return { type, section: def.section, gross: round2(byType[type]), rate: def.deduct.rate, deduction: byType[type] * def.deduct.rate };
    });
    const r402 = rows.filter(r => r.section === '40(2)');
    const total402 = r402.reduce((a, r) => a + r.deduction, 0);
    const cap = INCOME_TYPES['40-2'].deduct.cap;
    if (total402 > cap) r402.forEach(r => { r.deduction = r.deduction * cap / total402; r.capped = true; });
    rows.forEach(r => { r.deduction = round2(r.deduction); });

    const expenseDeduction = round2(rows.reduce((a, r) => a + r.deduction, 0));
    const allowances = round2(PERSONAL_ALLOWANCE + Math.max(0, +otherAllowances || 0));
    const netIncome = Math.max(0, round2(gross - expenseDeduction - allowances));
    const tax = progressiveTax(netIncome);
    whtPaid = round2(whtPaid);
    return {
      rows, gross: round2(gross), expenseDeduction, allowances, netIncome, tax, whtPaid,
      balance: round2(tax - whtPaid) // > 0 → still to pay, < 0 → refund
    };
  }

  const api = {
    INCOME_TYPES, WHT_MIN_PAYMENT, PERSONAL_ALLOWANCE, PIT_BRACKETS,
    round2, calcWHT, validTaxId, withCheckDigit, formatTaxId, bahttext, progressiveTax, estimateAnnualTax
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.JC = root.JC || {}; root.JC.tax = api; }
})(typeof window !== 'undefined' ? window : globalThis);
