# JangChad (จ้างชัด)

Business-to-freelancer transaction management, built as a hackathon prototype. Companies issue purchase orders and pay freelancers; the app works out withholding tax and issues the **50 ทวิ** certificate. Freelancers invoice, issue receipts, collect their certificates and estimate their annual tax. Both sides work from the same documents.

There is no build step and no backend. Data lives in your browser (`localStorage`).

| File | What it is |
|------|------------|
| `index.html` | Landing page (TH/EN) |
| `app.html` | The two-sided demo: Company side `#/c/…` and Freelancer side `#/f/…` |
| `assets/js/tax.js` | Tax rules: income types and WHT rates, tax-ID checksum, `bahttext`, annual tax estimate |
| `assets/js/store.js` | Data model, job lifecycle, seed data, reconciliation checks and alerts |
| `assets/js/docs.js` | Printable PO, invoice, receipt and 50 ทวิ (2 copies) |
| `assets/js/app.js` | Router and all views |
| `assets/js/i18n.js` | Thai/English dictionary and language toggle |

## Run

Open `index.html` or `app.html` in a browser. Both work straight from `file://`. If you want a server:

```bash
python -m http.server 8000     # then open http://localhost:8000
npm test                        # node --test: tax rules
```

## Job lifecycle

`draft → sent → invoiced → approved → paid → completed`

1. **Company:** issues a PO (scope, fee, dates, terms, Section 40 income type).
2. **Freelancer:** accepts it and issues an invoice prefilled from the PO. If the amount differs from the PO, the invoice is flagged.
3. **Company:** approves the invoice and records the payment. WHT and net are calculated, and **the 50 ทวิ is issued immediately**, as Section 50 bis requires.
4. **Freelancer:** confirms the amount received and issues a receipt, or reports a mismatch.

## Demo script

1. Company → **Jobs → + New PO**, then **Save & send**.
2. Switch to **Freelancer** in the top bar (persona: Mintra) → **Accept & invoice**.
3. Switch back to **Company** → open the job → **Approve** → **Record payment**. The 50 ทวิ opens, ready to print.
4. **Freelancer** → **Confirm & issue receipt**.
5. **Checks** reconciles the year. The seed data includes deliberate problems so this page has something to show: an invoice mismatch, a disputed transfer, an invalid tax ID, a missing receipt, and an unfiled PND3.

Use **Reset demo** to restore the seed data.

## Simplifications

- **Rates.** WHT rates and flat deductions are simplified and live in one table in `tax.js`:
  - WHT: 40(2) 3%, 40(6) 3%, 40(8) 3% / advertising 2% / transport 1%; nothing withheld under ฿1,000.
  - Flat deductions: 40(2) 50% up to ฿100k; 40(6) 60% or 30%; 40(8) 60%.

  None of this is tax or legal advice.
- **VAT.** VAT-registered freelancers are not handled yet.
- **Simulated actions.** Notifications, invites and document requests are simulated.
