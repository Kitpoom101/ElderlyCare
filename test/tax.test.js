// Run with: node --test test/
const test = require('node:test');
const assert = require('node:assert/strict');
const tax = require('../assets/js/tax.js');

test('calcWHT: 3% on a 10,000 freelance fee', () => {
  assert.deepEqual(tax.calcWHT(10000, '40-2'), { gross: 10000, rate: 0.03, wht: 300, net: 9700 });
});

test('calcWHT: under 1,000 baht is not withheld', () => {
  assert.deepEqual(tax.calcWHT(800, '40-8-svc'), { gross: 800, rate: 0, wht: 0, net: 800 });
  assert.equal(tax.calcWHT(1000, '40-8-svc').wht, 30);
});

test('calcWHT: advertising 2%, transport 1%, rounding to satang', () => {
  assert.equal(tax.calcWHT(12345.67, '40-8-ad').wht, 246.91);
  assert.equal(tax.calcWHT(5000, '40-8-trans').wht, 50);
  assert.throws(() => tax.calcWHT(100, 'nope'));
});

test('validTaxId: checksum', () => {
  const id = tax.withCheckDigit('110170020711');
  assert.equal(id.length, 13);
  assert.ok(tax.validTaxId(id));
  assert.ok(tax.validTaxId(tax.formatTaxId(id)), 'accepts dashes');
  const wrong = id.slice(0, 12) + ((+id[12] + 1) % 10);
  assert.ok(!tax.validTaxId(wrong));
  assert.ok(!tax.validTaxId('123'));
  assert.ok(!tax.validTaxId(''));
});

test('formatTaxId', () => {
  assert.equal(tax.formatTaxId('1234567890123'), '1-2345-67890-12-3');
});

test('bahttext', () => {
  assert.equal(tax.bahttext(10000), 'หนึ่งหมื่นบาทถ้วน');
  assert.equal(tax.bahttext(9700), 'เก้าพันเจ็ดร้อยบาทถ้วน');
  assert.equal(tax.bahttext(21), 'ยี่สิบเอ็ดบาทถ้วน');
  assert.equal(tax.bahttext(11), 'สิบเอ็ดบาทถ้วน');
  assert.equal(tax.bahttext(1), 'หนึ่งบาทถ้วน');
  assert.equal(tax.bahttext(0), 'ศูนย์บาทถ้วน');
  assert.equal(tax.bahttext(0.5), 'ห้าสิบสตางค์');
  assert.equal(tax.bahttext(1250000.5), 'หนึ่งล้านสองแสนห้าหมื่นบาทห้าสิบสตางค์');
  assert.equal(tax.bahttext(300), 'สามร้อยบาทถ้วน');
});

test('progressiveTax brackets', () => {
  assert.equal(tax.progressiveTax(150000), 0);
  assert.equal(tax.progressiveTax(300000), 7500);
  assert.equal(tax.progressiveTax(500000), 27500);
});

test('estimateAnnualTax: 40(2) income with the 100k deduction cap', () => {
  const r = tax.estimateAnnualTax({ incomes: [{ type: '40-2', gross: 400000, wht: 12000 }] });
  assert.equal(r.expenseDeduction, 100000); // 50% would be 200k, capped
  assert.equal(r.allowances, 60000);
  assert.equal(r.netIncome, 240000);
  assert.equal(r.tax, 4500); // (240k-150k)*5%
  assert.equal(r.whtPaid, 12000);
  assert.equal(r.balance, -7500); // refund
});

test('estimateAnnualTax: mixed types, cap only hits 40(2)', () => {
  const r = tax.estimateAnnualTax({
    incomes: [{ type: '40-2', gross: 100000, wht: 3000 }, { type: '40-8-ad', gross: 200000, wht: 4000 }],
    otherAllowances: 10000
  });
  assert.equal(r.expenseDeduction, 50000 + 120000);
  assert.equal(r.netIncome, 300000 - 170000 - 70000);
  assert.equal(r.tax, 0);
  assert.equal(r.balance, -7000);
});
