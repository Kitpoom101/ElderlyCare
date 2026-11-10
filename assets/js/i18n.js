/* TH/EN language support.
 * - Landing page: elements with class "th" / "en" are shown/hidden via the html.lang-th / html.lang-en class.
 * - App: JC.i18n.t(key, vars) looks up the dictionary below.
 * Load in <head> so the language class is set before first paint. */
(function () {
  'use strict';
  const KEY = 'jc.lang';
  let lang = 'th';
  try { lang = localStorage.getItem(KEY) === 'en' ? 'en' : 'th'; } catch (e) { /* storage blocked */ }

  // key: [Thai, English]
  const DICT = {
    // chrome
    'role.company': ['ผู้ว่าจ้าง (บริษัท)', 'Company'],
    'role.freelancer': ['ฟรีแลนซ์', 'Freelancer'],
    'persona.as': ['ใช้งานในนาม', 'Signed in as'],
    'reset': ['รีเซ็ตข้อมูลสาธิต', 'Reset demo'],
    'reset.confirm': ['ล้างข้อมูลทั้งหมดและกลับไปใช้ข้อมูลตัวอย่าง?', 'Clear everything and restore the demo data?'],
    'alerts': ['การแจ้งเตือน', 'Alerts'],
    'alerts.none': ['ไม่มีรายการที่ต้องดำเนินการ', 'Nothing needs your attention'],
    'demoBanner': ['ระบบสาธิต — ข้อมูลเก็บในเบราว์เซอร์ของคุณเท่านั้น', 'Demo — data is stored only in your browser'],
    'print': ['พิมพ์ / บันทึก PDF', 'Print / Save PDF'],
    'closeDoc': ['ปิด', 'Close'],
    // nav
    'nav.dashboard': ['ภาพรวม', 'Overview'],
    'nav.freelancers': ['ฐานข้อมูลผู้รับจ้าง', 'Freelancers'],
    'nav.jobs': ['งานจ้าง & ใบสั่งจ้าง', 'Jobs & POs'],
    'nav.payments': ['จ่ายเงิน & ภาษีหัก ณ ที่จ่าย', 'Payments & WHT'],
    'nav.documents': ['คลังเอกสาร', 'Documents'],
    'nav.checks': ['ตรวจสอบความถูกต้อง', 'Checks'],
    'nav.fjobs': ['งานของฉัน', 'My jobs'],
    'nav.income': ['รายได้', 'Income'],
    'nav.fdocuments': ['เอกสารของฉัน', 'My documents'],
    'nav.tax': ['ประมาณการภาษี', 'Tax estimate'],
    'nav.history': ['ประวัติการรับงาน', 'Job history'],
    // generic
    'all': ['ทั้งหมด', 'All'], 'view': ['ดู', 'View'], 'open': ['เปิด', 'Open'], 'openJob': ['เปิดงาน', 'Open job'],
    'save': ['บันทึก', 'Save'], 'cancel': ['ยกเลิก', 'Cancel'], 'confirm': ['ยืนยัน', 'Confirm'], 'delete': ['ลบ', 'Delete'],
    'fix': ['แก้ไข', 'Fix'], 'remind': ['ส่งแจ้งเตือน', 'Send reminder'], 'seeAll': ['ดูทั้งหมด →', 'See all →'],
    'empty': ['ไม่มีข้อมูล', 'Nothing here yet'], 'missing': ['ยังไม่มี', 'Missing'], 'void': ['ยกเลิกแล้ว', 'Void'],
    'mismatch': ['ยอดไม่ตรง', 'Mismatch'], 'total': ['รวม', 'Total'], 'recent': ['ความเคลื่อนไหวล่าสุด', 'Recent activity'],
    'month': ['เดือน', 'Month'], 'taxYear': ['ปีภาษี', 'Tax year'], 'search': ['ค้นหา', 'Search'], 'reason': ['เหตุผล', 'Reason'],
    'notFound': ['ไม่พบหน้านี้ หรือคุณไม่มีสิทธิ์เข้าถึง', 'Page not found, or you do not have access.'],
    'wht': ['ภาษีหัก ณ ที่จ่าย', 'WHT'],
    'wht.under1000': ['ต่ำกว่า 1,000 บาท ไม่ต้องหัก', 'under ฿1,000 — not withheld'],
    'net.est': ['ยอดรับสุทธิ (ประมาณการ)', 'Net payable (est.)'],
    'net.paid': ['ยอดโอนสุทธิ', 'Net paid'],
    'done': ['✓ งานนี้เอกสารครบถ้วนแล้ว', '✓ All documents complete for this job'],
    'disclaimer': ['ระบบสาธิต: อัตราภาษีและการคำนวณเป็นแบบย่อ เพื่อประกอบการนำเสนอเท่านั้น ไม่ใช่คำแนะนำทางภาษีหรือกฎหมาย โปรดตรวจสอบกับกรมสรรพากรหรือผู้เชี่ยวชาญ', 'Demo only: tax rates and calculations are simplified for presentation and are not tax or legal advice. Verify with the Revenue Department or a professional.'],
    // statuses
    'st.draft': ['ร่าง', 'Draft'], 'st.sent': ['รอผู้รับจ้างยืนยัน', 'Awaiting freelancer'], 'st.invoiced': ['รออนุมัติใบแจ้งหนี้', 'Awaiting approval'],
    'st.approved': ['รอชำระเงิน', 'Awaiting payment'], 'st.paid': ['ชำระแล้ว · รอใบเสร็จ', 'Paid · awaiting receipt'], 'st.completed': ['เสร็จสมบูรณ์', 'Completed'],
    'st.rejected': ['ผู้รับจ้างปฏิเสธ', 'Rejected'], 'st.cancelled': ['ยกเลิก', 'Cancelled'], 'st.disputed': ['แจ้งยอดไม่ตรง', 'Disputed'],
    // history events
    'ev.draft': ['สร้างใบสั่งจ้าง (ร่าง)', 'PO drafted'], 'ev.sent': ['ส่งใบสั่งจ้างให้ผู้รับจ้าง', 'PO sent to freelancer'],
    'ev.invoiced': ['ผู้รับจ้างยืนยันและออกใบแจ้งหนี้', 'Freelancer confirmed and invoiced'], 'ev.approved': ['อนุมัติใบแจ้งหนี้', 'Invoice approved'],
    'ev.paid': ['ชำระเงิน หักภาษี และออกหนังสือรับรอง 50 ทวิ', 'Paid, tax withheld, 50 ทวิ issued'], 'ev.completed': ['ผู้รับจ้างยืนยันยอดและออกใบเสร็จรับเงิน', 'Freelancer confirmed and issued receipt'],
    'ev.rejected': ['ผู้รับจ้างปฏิเสธงาน', 'Freelancer declined the job'], 'ev.cancelled': ['ยกเลิกงาน', 'Job cancelled'],
    'ev.invoice_returned': ['ตีกลับใบแจ้งหนี้ให้แก้ไข', 'Invoice returned for correction'], 'ev.disputed': ['ผู้รับจ้างแจ้งยอดเงินไม่ตรง', 'Freelancer reported an amount mismatch'],
    'ev.dispute_resolved': ['แก้ไขยอดที่โต้แย้งแล้ว', 'Dispute resolved'],
    'by.company': ['ผู้ว่าจ้าง', 'company'], 'by.freelancer': ['ผู้รับจ้าง', 'freelancer'],
    // documents
    'doc.po': ['ใบสั่งจ้าง', 'Purchase order'], 'doc.inv': ['ใบแจ้งหนี้', 'Invoice'], 'doc.cert': ['50 ทวิ', '50 ทวิ (WHT cert.)'],
    'doc.rc': ['ใบเสร็จรับเงิน', 'Receipt'], 'doc.exp': ['ใบเสร็จค่าใช้จ่าย', 'Expense receipts'],
    // steps
    'step.po': ['ใบสั่งจ้าง', 'Purchase order'], 'step.inv': ['ใบแจ้งหนี้', 'Invoice'], 'step.approved': ['อนุมัติ', 'Approved'],
    'step.paid': ['จ่าย + 50 ทวิ', 'Paid + 50 ทวิ'], 'step.rc': ['ใบเสร็จ', 'Receipt'],
    // columns
    'col.name': ['ชื่อ', 'Name'], 'col.taxId': ['เลขประจำตัวผู้เสียภาษี', 'Tax ID'], 'col.type': ['ประเภทเงินได้', 'Income type'],
    'col.jobs': ['งาน', 'Jobs'], 'col.paidYTD': ['จ่ายแล้วปีนี้', 'Paid this year'], 'col.docs': ['เอกสาร', 'Documents'],
    'col.no': ['เลขที่', 'No.'], 'col.job': ['งาน', 'Job'], 'col.freelancer': ['ผู้รับจ้าง', 'Freelancer'], 'col.company': ['ผู้ว่าจ้าง', 'Client'],
    'col.amount': ['จำนวนเงิน', 'Amount'], 'col.status': ['สถานะ', 'Status'], 'col.updated': ['อัปเดต', 'Updated'],
    'col.paidAt': ['วันที่จ่าย', 'Paid on'], 'col.section': ['มาตรา', 'Section'], 'col.rate': ['อัตรา', 'Rate'],
    'col.gross': ['ยอดก่อนหักภาษี', 'Gross'], 'col.net': ['สุทธิ', 'Net'], 'col.docType': ['ประเภทเอกสาร', 'Type'],
    'col.date': ['วันที่', 'Date'], 'col.count': ['รายการ', 'Items'], 'col.due': ['ครบกำหนด', 'Due'],
    // KPIs
    'kpi.active': ['งานที่กำลังดำเนินการ', 'Active jobs'], 'kpi.activeSub': ['ส่งแล้ว ยังไม่ปิดงาน', 'Sent, not yet closed'],
    'kpi.toApprove': ['ใบแจ้งหนี้รออนุมัติ', 'Invoices to approve'], 'kpi.toPay': ['รอชำระเงิน', 'Awaiting payment'],
    'kpi.whtMonth': ['ภาษีหัก ณ ที่จ่าย เดือนนี้', 'WHT this month'], 'kpi.whtMonthSub': ['ยื่น ภ.ง.ด.3 ออนไลน์ภายใน {due}', 'File PND3 online by {due}'],
    'kpi.paidYTD': ['จ่ายฟรีแลนซ์ปีนี้', 'Paid to freelancers YTD'], 'kpi.issues': ['รายการที่ต้องตรวจ', 'Issues to check'],
    'kpi.incomeYTD': ['รายได้ปีนี้', 'Income this year'], 'kpi.incomeYTDSub': ['ก่อนหักภาษี รวมงานนอกระบบ', 'Gross, incl. off-platform'],
    'kpi.whtYTD': ['ภาษีถูกหักไว้แล้ว', 'Tax withheld'], 'kpi.whtYTDSub': ['เครดิตได้ตอนยื่น ภ.ง.ด.90', 'Creditable on your annual return'],
    'kpi.receivable': ['รอรับเงิน', 'Receivable'], 'kpi.receivableSub': ['{n} ใบแจ้งหนี้', '{n} invoices'], 'kpi.newPO': ['ใบสั่งจ้างใหม่', 'New POs'],
    // company dashboard
    'c.dash.title': ['สวัสดี {name}', 'Hello, {name}'], 'c.dash.sub': ['สรุปงานจ้าง การจ่ายเงิน และภาษีของคุณ', 'Your hiring, payments and tax at a glance'],
    'c.dash.queue': ['รอคุณดำเนินการ', 'Waiting on you'], 'c.dash.queueEmpty': ['ไม่มีงานค้าง 🎉', 'All caught up 🎉'],
    'c.dash.issues': ['ต้องตรวจสอบ', 'Needs checking'], 'checks.clean': ['✓ ไม่พบปัญหา เอกสารและยอดเงินตรงกันทั้งหมด', '✓ No issues — documents and amounts all match'],
    // freelancers (1.1)
    'c.fl.sub': ['ข้อมูลผู้รับจ้าง เลขประจำตัวผู้เสียภาษี ประวัติการจ้าง และสถานะเอกสาร', 'Freelancer records, tax IDs, hiring history and document status'],
    'fl.invite': ['+ เชิญฟรีแลนซ์', '+ Invite freelancer'], 'fl.sendInvite': ['ส่งคำเชิญ', 'Send invite'],
    'fl.inviteSub': ['ถ้าฟรีแลนซ์ใช้ระบบอยู่แล้ว (เลขผู้เสียภาษีเดียวกัน) ระบบจะเชื่อมบัญชีให้แทนการสร้างใหม่', 'If the freelancer already uses the platform (same tax ID), we connect the existing account instead of creating a new one.'],
    'fl.profile': ['ข้อมูลผู้รับจ้าง', 'Profile'], 'fl.kyc': ['เอกสารประกอบ', 'Supporting documents'], 'fl.history': ['ประวัติการจ้าง', 'Hiring history'],
    'kyc.idCard': ['สำเนาบัตรประชาชน', 'ID card copy'], 'kyc.bankBook': ['สำเนาสมุดบัญชี', 'Bank book copy'],
    'kyc.received': ['ได้รับแล้ว', 'Received'], 'kyc.request': ['ขอเอกสาร (สาธิต: ทำเครื่องหมายว่าได้รับ)', 'Request (demo: mark received)'],
    'taxId.invalid': ['เลขไม่ถูกต้อง', 'Invalid'], 'taxId.invalidLong': ['เลขประจำตัวผู้เสียภาษีไม่ถูกต้อง (ต้องมี 13 หลักและผ่านการตรวจหลักสุดท้าย)', 'Invalid tax ID (must be 13 digits with a valid check digit)'],
    'taxId.hint': ['13 หลัก ระบบตรวจหลักสุดท้ายให้อัตโนมัติ', '13 digits — the check digit is validated'],
    'f.nameTh': ['ชื่อ-นามสกุล (ตามบัตร)', 'Full name (as on ID)'], 'f.nameEn': ['ชื่อภาษาอังกฤษ', 'Name in English'],
    'f.email': ['อีเมล', 'Email'], 'f.phone': ['โทรศัพท์', 'Phone'], 'f.address': ['ที่อยู่', 'Address'],
    // jobs (1.3)
    'c.jobs.sub': ['ออกใบสั่งจ้าง ติดตามสถานะ และตรวจใบแจ้งหนี้ให้ตรงกับใบสั่งจ้าง', 'Issue POs, track status, and match invoices against them'],
    'jobs.empty': ['ยังไม่มีงานในสถานะนี้', 'No jobs here yet'],
    'job.details': ['รายละเอียดงาน', 'Job details'], 'job.next': ['ขั้นตอนถัดไป', 'Next step'], 'job.docs': ['เอกสารของงานนี้', 'Documents for this job'], 'job.history': ['ประวัติ', 'History'],
    'po.new': ['+ สร้างใบสั่งจ้าง', '+ New purchase order'], 'po.title': ['ชื่องาน', 'Job title'], 'po.titlePh': ['เช่น ออกแบบโลโก้แบรนด์ใหม่', 'e.g. New brand logo'],
    'po.scope': ['ขอบเขตงาน', 'Scope of work'], 'po.scopePh': ['รายละเอียด จำนวนชิ้นงาน จำนวนครั้งที่แก้ไขได้', 'Deliverables, number of revisions…'],
    'po.amount': ['ค่าจ้าง (บาท)', 'Fee (THB)'], 'po.start': ['เริ่มงาน', 'Start'], 'po.due': ['ส่งงาน', 'Deadline'], 'po.period': ['ระยะเวลางาน', 'Period'],
    'po.terms': ['เงื่อนไขชำระเงิน', 'Payment terms'], 'po.termsVal': ['ภายใน {n} วันหลังได้รับใบแจ้งหนี้', 'Within {n} days of invoice'],
    'po.note': ['อัตราภาษีหัก ณ ที่จ่ายคำนวณจากประเภทเงินได้ตามมาตรา 40 ที่เลือก', 'The withholding rate comes from the Section 40 income type you choose.'],
    'po.saveSend': ['บันทึกและส่งให้ผู้รับจ้าง', 'Save & send'], 'po.saveDraft': ['บันทึกร่าง', 'Save draft'],
    'act.send': ['ส่งใบสั่งจ้าง', 'Send PO'], 'act.cancel': ['ยกเลิกงาน', 'Cancel job'], 'act.review': ['ตรวจ & อนุมัติ', 'Review'],
    'act.approve': ['อนุมัติใบแจ้งหนี้', 'Approve invoice'], 'act.returnInv': ['ตีกลับใบแจ้งหนี้', 'Return invoice'], 'act.pay': ['บันทึกการจ่ายเงิน', 'Record payment'],
    'act.resolve': ['แก้ไขแล้ว', 'Mark resolved'], 'act.acceptInvoice': ['ยืนยันงาน & ออกใบแจ้งหนี้', 'Accept & invoice'], 'act.reject': ['ปฏิเสธงาน', 'Decline'],
    'act.receipt': ['ยืนยันยอด & ออกใบเสร็จ', 'Confirm & issue receipt'], 'act.receiptAnyway': ['ยืนยันว่าได้รับครบแล้ว & ออกใบเสร็จ', 'Amount sorted — issue receipt'], 'act.dispute': ['แจ้งยอดไม่ตรง', 'Report mismatch'],
    'next.c.draft': ['ใบสั่งจ้างยังเป็นร่าง ตรวจรายละเอียดแล้วส่งให้ผู้รับจ้างยืนยัน', 'This PO is a draft. Review it, then send it to the freelancer.'],
    'next.c.approved': ['อนุมัติแล้ว ชำระเงิน {amount} (ระบบหักภาษีและออก 50 ทวิ ให้อัตโนมัติ)', 'Approved — pay {amount}. Tax is withheld and the 50 ทวิ issued automatically.'],
    'next.f.sent': ['ตรวจขอบเขตงานและค่าจ้าง ถ้าตกลง ออกใบแจ้งหนี้ได้ทันที (ยอดต้องตรงกับใบสั่งจ้าง)', 'Check the scope and fee. If you agree, issue the invoice — it should match the PO.'],
    'next.f.paid': ['ตรวจยอดที่ได้รับ แล้วออกใบเสร็จรับเงินให้ผู้ว่าจ้าง', 'Check the amount you received, then issue a receipt.'],
    'wait.freelancer': ['รอผู้รับจ้างยืนยันและออกใบแจ้งหนี้', 'Waiting for the freelancer to confirm and invoice'],
    'wait.receipt': ['รอผู้รับจ้างยืนยันยอดและออกใบเสร็จรับเงิน', 'Waiting for the freelancer’s receipt'],
    'wait.approval': ['ส่งใบแจ้งหนี้แล้ว รอผู้ว่าจ้างอนุมัติ', 'Invoice sent — waiting for approval'],
    'wait.payment': ['ใบแจ้งหนี้อนุมัติแล้ว รอผู้ว่าจ้างชำระเงิน', 'Invoice approved — waiting for payment'],
    'warn.invMismatch': ['⚠ ใบแจ้งหนี้ {inv} ไม่ตรงกับใบสั่งจ้าง {po}', '⚠ Invoice {inv} does not match the PO {po}'],
    'warn.invMismatchF': ['ยอดไม่ตรงกับใบสั่งจ้าง ({po}) ผู้ว่าจ้างจะเห็นคำเตือนนี้ตอนอนุมัติ', 'This differs from the PO ({po}); the client will see a warning when approving.'],
    'ok.invMatch': ['✓ ยอดใบแจ้งหนี้ตรงกับใบสั่งจ้าง', '✓ Invoice matches the PO'],
    'ok.certIssued': ['✓ ออกหนังสือรับรอง 50 ทวิ เลขที่ {no} แล้ว', '✓ 50 ทวิ {no} issued'],
    'ok.certReceived': ['✓ ได้รับหนังสือรับรอง 50 ทวิ เลขที่ {no} แล้ว', '✓ You received 50 ทวิ {no}'],
    'warn.dispute': ['ผู้รับจ้างแจ้งว่าได้รับ {received} แต่ระบบบันทึกยอดโอนสุทธิ {net} — “{note}”', 'Freelancer reports receiving {received}, but the recorded net is {net} — “{note}”'],
    'dispute.sent': ['แจ้งยอดไม่ตรง ({received}) ไปยังผู้ว่าจ้างแล้ว รอการตรวจสอบ', 'You reported receiving {received}; waiting for the client to check'],
    'confirm.cancel': ['ยกเลิกงานนี้?', 'Cancel this job?'], 'confirm.delete': ['ลบรายการนี้?', 'Delete this item?'],
    'confirm.approveMismatch': ['ยอดใบแจ้งหนี้ไม่ตรงกับใบสั่งจ้าง ต้องการอนุมัติต่อหรือไม่?', 'The invoice does not match the PO. Approve anyway?'],
    // payments (1.2)
    'c.pay.sub': ['บันทึกการจ่าย คำนวณภาษีหัก ณ ที่จ่าย และเตรียมยื่น ภ.ง.ด.3', 'Record payments, compute withholding, prepare the PND3 filing'],
    'pay.awaiting': ['รอชำระเงิน', 'Awaiting payment'], 'pay.none': ['ไม่มีรายการรอชำระ', 'Nothing awaiting payment'], 'pay.history': ['ประวัติการจ่ายเงิน', 'Payment history'],
    'pay.title': ['บันทึกการจ่ายเงิน — {no}', 'Record payment — {no}'], 'pay.gross': ['ยอดค่าจ้างก่อนหักภาษี', 'Gross amount'],
    'pay.grossHint': ['ค่าเริ่มต้นตามใบแจ้งหนี้', 'Defaults to the invoice amount'], 'pay.method': ['วิธีชำระ', 'Method'], 'pay.ref': ['เลขอ้างอิง', 'Reference'],
    'pay.transfer': ['โอนเงิน', 'Bank transfer'], 'pay.cheque': ['เช็ค', 'Cheque'], 'pay.cash': ['เงินสด', 'Cash'],
    'pay.certNote': ['ตามมาตรา 50 ทวิ ระบบจะออกหนังสือรับรองการหักภาษี ณ ที่จ่าย 2 ฉบับ ส่งให้ผู้รับจ้างทันทีเมื่อบันทึกการจ่าย', 'Under Section 50 bis, the withholding certificate (2 copies) is issued and sent to the freelancer the moment you record the payment.'],
    'pay.confirm': ['ยืนยันการจ่าย & ออก 50 ทวิ', 'Confirm payment & issue 50 ทวิ'],
    'pnd3.title': ['สรุปนำส่งภาษี ภ.ง.ด.3', 'PND3 withholding summary'], 'pnd3.csv': ['ส่งออก CSV', 'Export CSV'],
    'pnd3.markFiled': ['ทำเครื่องหมายว่ายื่นแล้ว', 'Mark as filed'], 'pnd3.unfile': ['ยกเลิกเครื่องหมาย', 'Unmark'], 'pnd3.open': ['ดูสรุป', 'Open summary'],
    'pnd3.due': ['ยื่นแบบและนำส่งภาษีภายใน {paper} (ยื่นทางอินเทอร์เน็ตภายใน {online})', 'File and remit by {paper} (online by {online})'],
    'pnd3.filed': ['✓ ยื่นแล้วเมื่อ {at}', '✓ Filed on {at}'], 'pnd3.none': ['ไม่มีรายการที่หักภาษีในเดือนนี้', 'No withholding this month'],
    // documents (1.4)
    'c.docs.sub': ['ใบสั่งจ้าง 50 ทวิ ใบแจ้งหนี้ และใบเสร็จทั้งหมด ค้นหาตามผู้รับจ้างและปีภาษี', 'All POs, 50 ทวิ, invoices and receipts — search by freelancer and tax year'],
    'docs.issued': ['ที่เราออก', 'Issued by us'], 'docs.inbox': ['กล่องรับเอกสาร', 'Inbox'],
    'docs.searchPh': ['เลขที่เอกสาร ชื่องาน หรือชื่อ', 'Doc no., job or name'], 'docs.none': ['ไม่พบเอกสาร', 'No documents found'],
    'docs.missing': ['เอกสารยังไม่ครบ {n} รายการ', '{n} documents outstanding'],
    // checks (1.5)
    'c.checks.sub': ['เปรียบเทียบยอดจ่ายกับยอดภาษี และตรวจหาเอกสารที่ขาดหรือข้อมูลไม่ตรงกัน', 'Compare payments with tax, and find missing documents or mismatched data'],
    'rec.title': ['กระทบยอดทั้งปี', 'Year reconciliation'], 'rec.check': ['รายการตรวจ', 'Check'],
    'rec.poVsInv': ['ใบสั่งจ้าง (A) เทียบ ใบแจ้งหนี้ (B)', 'POs (A) vs invoices (B)'], 'rec.invVsPaid': ['ใบแจ้งหนี้ (A) เทียบ ยอดจ่าย (B)', 'Invoices (A) vs payments (B)'],
    'rec.whtVsCert': ['ภาษีที่หัก (A) เทียบ ยอดใน 50 ทวิ (B)', 'WHT withheld (A) vs 50 ทวิ total (B)'], 'rec.paidVsRc': ['ยอดจ่าย (A) เทียบ ใบเสร็จที่ได้รับ (B)', 'Payments (A) vs receipts received (B)'],
    'rec.match': ['ตรงกัน', 'Match'], 'rec.diff': ['ต่าง', 'Off by'], 'rec.note': ['คำนวณจากการจ่ายเงิน {n} รายการในปีภาษีที่เลือก', 'Based on {n} payments in the selected tax year'],
    'checks.list': ['รายการที่ต้องตรวจสอบ', 'Issues'], 'sev.high': ['สำคัญ', 'High'], 'sev.med': ['ควรตรวจ', 'Medium'], 'sev.low': ['แจ้งเพื่อทราบ', 'Low'],
    'iss.inv_mismatch': ['{no}: ใบแจ้งหนี้ {inv} ไม่ตรงกับใบสั่งจ้าง {po}', '{no}: invoice {inv} ≠ PO {po}'],
    'iss.pay_mismatch': ['{no}: ยอดจ่าย {paid} ไม่ตรงกับใบแจ้งหนี้ {inv}', '{no}: paid {paid} ≠ invoice {inv}'],
    'iss.wht_mismatch': ['{no}: ภาษีที่หัก {actual} ไม่ตรงกับที่ควรหัก {expected}', '{no}: WHT {actual} ≠ expected {expected}'],
    'iss.no_cert': ['{no}: จ่ายเงินแล้วแต่ยังไม่มี 50 ทวิ', '{no}: paid but no 50 ทวิ issued'],
    'iss.no_receipt': ['{no}: จ่ายมาแล้ว {days} วัน ยังไม่ได้รับใบเสร็จจาก {name}', '{no}: paid {days} days ago, no receipt yet from {name}'],
    'iss.dispute': ['{no}: {name} แจ้งว่าได้รับ {received} (ควรได้ {expected})', '{no}: {name} reports receiving {received} (expected {expected})'],
    'iss.bad_taxid': ['{name}: เลขประจำตัวผู้เสียภาษีไม่ถูกต้อง — 50 ทวิ จะใช้ไม่ได้', '{name}: invalid tax ID — 50 ทวิ would be wrong'],
    'iss.kyc_missing': ['{name}: ยังไม่ได้รับ {docs}', '{name}: missing {docs}'],
    'iss.filing_due': ['ภ.ง.ด.3 เดือน{month} ยังไม่ได้ทำเครื่องหมายว่ายื่นแล้ว (กำหนด {due})', 'PND3 for {month} not marked as filed (due {due})'],
    // alerts
    'al.approve_todo': ['{no} {name} ส่งใบแจ้งหนี้มา — รออนุมัติ', '{no}: invoice from {name} to approve'],
    'al.pay_todo': ['{no} อนุมัติแล้ว — รอชำระเงินให้ {name}', '{no}: approved — pay {name}'],
    'al.po_waiting': ['{company} ส่งใบสั่งจ้าง “{title}” มา — รอยืนยัน', '{company} sent you a PO: “{title}”'],
    'al.receipt_todo': ['{company} ชำระ {no} แล้ว — ออกใบเสร็จรับเงิน', '{company} paid {no} — issue your receipt'],
    'al.dispute_open': ['{no}: รอผู้ว่าจ้างตรวจสอบยอดที่แจ้งไม่ตรง', '{no}: waiting for client to check your reported amount'],
    'al.ext_no_cert': ['ยังไม่ได้รับ 50 ทวิ จาก {client}', 'Missing 50 ทวิ from {client}'],
    // freelancer dashboard
    'f.dash.title': ['สวัสดี {name}', 'Hello, {name}'], 'f.dash.sub': ['รายได้ ภาษีที่ถูกหัก และงานที่ต้องทำ', 'Your income, withheld tax and to-dos'],
    'todo': ['สิ่งที่ต้องทำ', 'To do'], 'todo.none': ['ไม่มีงานค้าง 🎉', 'Nothing to do 🎉'],
    'f.clients': ['ผู้ว่าจ้างของฉัน', 'My clients'], 'f.clientsLine': ['{n} งาน · ได้รับปีนี้ {total}', '{n} jobs · {total} this year'],
    'f.network': ['ใช้ระบบเดียวกันกับทุกบริษัทที่จ้างคุณ — ฟรีสำหรับฟรีแลนซ์', 'One account for every company that hires you — free for freelancers'],
    'f.jobs.sub': ['ใบสั่งจ้างที่ได้รับ ออกใบแจ้งหนี้ และใบเสร็จรับเงิน', 'POs you received — invoice and issue receipts'],
    // income (2.1)
    'f.inc.sub': ['รายได้จากทุกแหล่ง แยกตามผู้ว่าจ้างและประเภทเงินได้', 'Income from every source, by client and income type'],
    'f.inc.whtSub': ['รวมจาก 50 ทวิ ทุกใบ', 'Sum of all your 50 ทวิ'],
    'inc.byClient': ['แยกตามผู้ว่าจ้าง', 'By client'], 'inc.byType': ['แยกตามประเภทเงินได้', 'By income type'],
    'inc.unpaid': ['รายได้ที่ยังไม่ได้รับชำระ', 'Unpaid invoices'], 'inc.unpaidNone': ['ไม่มีใบแจ้งหนี้ค้างชำระ', 'No unpaid invoices'],
    'ext.title': ['รายได้นอกระบบ', 'Off-platform income'], 'ext.sub': ['งานจากลูกค้าที่ยังไม่ได้ใช้ระบบ — บันทึกไว้เพื่อคำนวณภาษีให้ครบ', 'Work from clients not on the platform — record it so your tax estimate is complete'],
    'ext.add': ['+ บันทึกรายได้', '+ Add income'], 'ext.client': ['ผู้ว่าจ้าง', 'Client'], 'ext.tag': ['นอกระบบ', 'off-platform'],
    'ext.whtHint': ['คำนวณให้อัตโนมัติ แก้ได้', 'Auto-calculated, editable'], 'ext.hasCert': ['ได้รับ 50 ทวิ แล้ว', 'I have the 50 ทวิ'],
    'ext.gotCert': ['ได้รับแล้ว', 'Got it'], 'ext.none': ['ยังไม่มีรายได้นอกระบบ', 'No off-platform income'],
    // freelancer docs (2.3)
    'f.docs.sub': ['50 ทวิ ใบแจ้งหนี้ ใบเสร็จ ใบสั่งจ้าง และใบเสร็จค่าใช้จ่าย ในที่เดียว', 'Your 50 ทวิ, invoices, receipts, POs and expense receipts in one place'],
    'f.docs.missing': ['ยังไม่ได้รับ 50 ทวิ — ควรขอจากผู้ว่าจ้างก่อนยื่นภาษี', 'Missing 50 ทวิ — request them before filing'],
    'f.docs.certCount': ['50 ทวิ ปีภาษี {y}', '50 ทวิ in {y}'], 'f.docs.certWht': ['ภาษีถูกหักรวม', 'Total withheld'],
    'exp.add': ['+ เพิ่มใบเสร็จค่าใช้จ่าย', '+ Add expense'], 'exp.desc': ['รายการ', 'Description'], 'exp.cat': ['หมวด', 'Category'],
    'exp.file': ['ไฟล์', 'File'], 'exp.fileHint': ['รูปภาพไม่เกิน 1 MB (เก็บในเบราว์เซอร์)', 'Image up to 1 MB (stored in your browser)'], 'exp.none': ['ยังไม่มีค่าใช้จ่าย', 'No expenses yet'],
    'cat.equipment': ['อุปกรณ์', 'Equipment'], 'cat.software': ['ซอฟต์แวร์', 'Software'], 'cat.travel': ['เดินทาง', 'Travel'], 'cat.office': ['สำนักงาน', 'Office'], 'cat.other': ['อื่น ๆ', 'Other'],
    // tax estimate
    'f.tax.sub': ['ประมาณการภาษีเงินได้บุคคลธรรมดาทั้งปี จากรายได้ที่บันทึกไว้', 'Estimate your annual personal income tax from recorded income'],
    'tax.other': ['ค่าลดหย่อนอื่น ๆ (บาท)', 'Other allowances (THB)'], 'tax.tax': ['ภาษีที่ต้องเสียทั้งปี', 'Annual tax'],
    'tax.whtCredit': ['หักภาษีที่ถูกหักไว้แล้ว', 'Less tax already withheld'], 'tax.refund': ['ประมาณการขอคืนภาษี', 'Estimated refund'], 'tax.payable': ['ประมาณการภาษีที่ต้องชำระเพิ่ม', 'Estimated tax to pay'],
    'tax.calc': ['วิธีคำนวณ', 'How it’s calculated'], 'tax.deductRate': ['หักค่าใช้จ่ายแบบเหมา', 'Flat deduction'], 'tax.deduct': ['ค่าใช้จ่ายที่หักได้', 'Deduction'],
    'tax.capped': ['ไม่เกิน 100,000', 'capped at 100,000'], 'tax.noIncome': ['ยังไม่มีรายได้ในปีนี้', 'No income this year'],
    'tax.gross': ['เงินได้พึงประเมินรวม', 'Total assessable income'], 'tax.lessExp': ['หักค่าใช้จ่าย', 'Less expense deduction'],
    'tax.lessAllow': ['หักค่าลดหย่อน (ส่วนตัว 60,000 + อื่น ๆ)', 'Less allowances (personal 60,000 + other)'], 'tax.net': ['เงินได้สุทธิ', 'Net taxable income'],
    'tax.law': ['หลักเกณฑ์ที่ใช้', 'Rules used'],
    'law.402': ['ฟรีแลนซ์ทั่วไป รับงานครั้งคราว — หักค่าใช้จ่ายเหมา 50% ไม่เกิน 100,000 บาท', 'General freelance work — 50% flat deduction, max ฿100,000'],
    'law.406': ['วิชาชีพอิสระที่มีใบอนุญาต — หักเหมา 60% (การประกอบโรคศิลปะ) หรือ 30%', 'Licensed professions — 60% (medical) or 30% flat deduction'],
    'law.408': ['ธุรกิจ การค้า บริการอื่น ๆ — หักเหมา 60% (หลายประเภท) หรือตามจริง', 'Business and other services — 60% flat (many types) or actual'],
    'law.50': ['ผู้ว่าจ้างที่เป็นนิติบุคคลต้องออกหนังสือรับรองให้ทันทีทุกครั้งที่จ่ายเงินและหักภาษี (2 ฉบับข้อความตรงกัน)', 'Corporate payers must issue the certificate (2 identical copies) every time they pay and withhold'],
    'tax.expTitle': ['ค่าใช้จ่ายที่บันทึกไว้', 'Recorded expenses'],
    'tax.expBody': ['คุณบันทึกค่าใช้จ่ายไว้ {amt} ในปีนี้ — ถ้าเลือกหักตามจริง (40(6)/40(8)) ต้องมีหลักฐาน ซึ่งเก็บไว้ในคลังเอกสารได้', 'You recorded {amt} of expenses this year. Claiming actual expenses (40(6)/40(8)) needs evidence — keep it in your documents.'],
    'tax.expOpen': ['ไปที่ใบเสร็จค่าใช้จ่าย', 'Open expense receipts'],
    // history (2.4)
    'f.hist.sub': ['งานที่รับจากแต่ละบริษัท และสถานะเอกสารของทุกงาน', 'Jobs per company and the document status of each'],
    // modals
    'inv.title': ['ออกใบแจ้งหนี้ — {no}', 'Issue invoice — {no}'], 'inv.amount': ['ยอดใบแจ้งหนี้ (บาท)', 'Invoice amount (THB)'],
    'inv.note': ['หมายเหตุ', 'Note'], 'inv.submit': ['ยืนยันงานและส่งใบแจ้งหนี้', 'Confirm & send invoice'],
    'inv.whtNote': ['ผู้ว่าจ้างจะหักภาษี ณ ที่จ่าย และส่ง 50 ทวิ ให้คุณในระบบเมื่อชำระเงิน', 'Your client withholds tax and sends you the 50 ทวิ here when they pay.'],
    'rc.title': ['ยืนยันยอดและออกใบเสร็จ — {no}', 'Confirm amount & issue receipt — {no}'],
    'rc.q': ['ได้รับเงินถูกต้องหรือไม่?', 'Did you receive the right amount?'], 'rc.yes': ['ได้รับครบ {net}', 'Yes, I received {net}'], 'rc.no': ['ยอดไม่ตรง', 'No, the amount is different'],
    'rc.received': ['ยอดที่ได้รับจริง', 'Amount actually received'], 'rc.note': ['รายละเอียด', 'Details'], 'rc.submit': ['ยืนยัน', 'Confirm'],
    // errors / toasts
    'err.title': ['กรุณาใส่ชื่องาน', 'Please enter a job title'], 'err.amount': ['กรุณาใส่จำนวนเงินที่มากกว่า 0', 'Please enter an amount above 0'],
    'err.dates': ['วันส่งงานต้องไม่ก่อนวันเริ่มงาน', 'The deadline can’t be before the start date'], 'err.name': ['กรุณาใส่ชื่อ', 'Please enter a name'],
    'err.noMembers': ['ยังไม่มีฟรีแลนซ์ในระบบ เชิญฟรีแลนซ์ก่อน', 'Invite a freelancer first'], 'err.reason': ['กรุณาระบุเหตุผล', 'Please give a reason'],
    'err.client': ['กรุณาใส่ชื่อผู้ว่าจ้าง', 'Please enter the client'], 'err.desc': ['กรุณาใส่รายการ', 'Please enter a description'],
    'err.file': ['ไฟล์ใหญ่เกิน 1 MB', 'File is larger than 1 MB'],
    'toast.poSent': ['ส่งใบสั่งจ้าง {no} แล้ว', 'PO {no} sent'], 'toast.poDraft': ['บันทึกร่าง {no} แล้ว', 'Draft {no} saved'],
    'toast.invited': ['เชิญ {name} แล้ว', 'Invited {name}'], 'toast.linked': ['{name} ใช้ระบบอยู่แล้ว — เชื่อมบัญชีให้แล้ว', '{name} already uses the platform — connected'],
    'toast.saved': ['บันทึกแล้ว', 'Saved'], 'toast.kyc': ['บันทึกเอกสารของ {name} แล้ว', 'Document recorded for {name}'],
    'toast.approved': ['อนุมัติใบแจ้งหนี้แล้ว', 'Invoice approved'], 'toast.returned': ['ตีกลับใบแจ้งหนี้แล้ว', 'Invoice returned'],
    'toast.paid': ['บันทึกการจ่ายแล้ว · ออก 50 ทวิ {no}', 'Payment recorded · 50 ทวิ {no} issued'], 'toast.resolved': ['ปิดเรื่องแล้ว', 'Marked resolved'],
    'toast.reminded': ['ส่งแจ้งเตือนถึง {name} แล้ว (สาธิต)', 'Reminder sent to {name} (demo)'], 'toast.filed': ['บันทึกว่ายื่น ภ.ง.ด.3 แล้ว', 'PND3 marked as filed'],
    'toast.invoiced': ['ส่งใบแจ้งหนี้ {no} แล้ว', 'Invoice {no} sent'], 'toast.rejected': ['ปฏิเสธงานแล้ว', 'Job declined'],
    'toast.disputed': ['แจ้งยอดไม่ตรงไปยังผู้ว่าจ้างแล้ว', 'Mismatch reported to the client'], 'toast.receipt': ['ออกใบเสร็จ {no} แล้ว', 'Receipt {no} issued'],
    'toast.reset': ['รีเซ็ตข้อมูลสาธิตแล้ว', 'Demo data reset']
  };

  function t(key, vars) {
    const e = DICT[key];
    let s = e ? e[lang === 'en' ? 1 : 0] : key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
    return s;
  }
  function applyClass() {
    const el = document.documentElement;
    el.lang = lang;
    el.classList.toggle('lang-en', lang === 'en');
    el.classList.toggle('lang-th', lang !== 'en');
  }
  /** Fill static [data-i18n] / [data-i18n-title] elements. */
  function apply(root) {
    (root || document).querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    (root || document).querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); el.setAttribute('aria-label', el.title); });
    document.querySelectorAll('[data-lang-toggle]').forEach(b => {
      b.textContent = lang === 'en' ? 'ไทย' : 'EN';
      b.setAttribute('aria-label', lang === 'en' ? 'เปลี่ยนเป็นภาษาไทย' : 'Switch to English');
    });
  }
  function setLang(l) {
    lang = l === 'en' ? 'en' : 'th';
    try { localStorage.setItem(KEY, lang); } catch (e) { /* ignore */ }
    applyClass(); apply();
    dispatchEvent(new Event('langchange'));
  }

  applyClass();
  document.addEventListener('DOMContentLoaded', () => apply());
  document.addEventListener('click', e => {
    if (e.target.closest('[data-lang-toggle]')) setLang(lang === 'en' ? 'th' : 'en');
  });

  window.JC = window.JC || {};
  window.JC.i18n = { t, setLang, apply, get lang() { return lang; }, DICT };
})();
