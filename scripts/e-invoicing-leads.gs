/**
 * Finasheet — UAE e-invoicing readiness-check lead endpoint (Google Apps Script web app).
 *
 * What it does
 *   1. Accepts the POST from /e-invoicing-uae (JSON sent as text/plain).
 *   2. Validates required fields and drops honeypot spam.
 *   3. Appends the lead, with UTM / gclid attribution, to the "Leads" sheet.
 *   4. Emails the sales inbox (Shraddha) so she can call the prospect.
 *   5. Returns {ok:true, lead_id} so the page only fires `lead_form_success` for accepted leads.
 *
 * Setup (about 3 minutes)
 *   - Open the "Finasheet – E-invoicing leads" sheet > Extensions > Apps Script. Replace the code with this file. Save.
 *   - Optional: Project Settings > Script properties > SALES_EMAILS = comma-separated recipients
 *     (e.g. Shraddha's email). Without it, lead emails go to the Google account that deploys the script.
 *   - Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
 *   - Copy the /exec URL into data-endpoint on <form id="ei-form"> in _pages/e-invoicing-uae.html, rebuild, publish.
 *   - Each time you change this code: Deploy > Manage deployments > Edit > New version (the URL stays the same).
 *
 * Privacy: no credentials live in the website. The sheet is private to your Google account.
 */

// The Google Sheet that stores leads ("Finasheet – E-invoicing leads").
const SHEET_ID = '1LqlgNesyxd2w8PLLBAgJrWQdv1Uq7bQUbyxwA-oNQCU';

const HEADERS = [
  'lead_id', 'received_at', 'status', 'lead_type', 'full_name', 'company', 'phone', 'email',
  'current_software', 'monthly_volume', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content',
  'utm_term', 'gclid', 'gbraid', 'wbraid', 'landing_page', 'referrer', 'page_url', 'submitted_at',
];

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // Honeypot: bots fill hidden fields. Pretend success, store nothing.
    if (data.website) return json_({ ok: true, lead_id: 'ignored' });

    const clean = {};
    HEADERS.forEach((h) => { clean[h] = sanitise_(data[h]); });

    const errors = [];
    if (clean.full_name.length < 2) errors.push('full_name');
    if (clean.company.length < 2) errors.push('company');
    if (!/^\+971\d{8,9}$/.test(clean.phone)) errors.push('phone');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean.email)) errors.push('email');
    if (errors.length) return json_({ ok: false, error: 'invalid:' + errors.join(',') });

    const allowedTypes = ['readiness_check', 'annual_plan', 'monthly_plan', 'erp_integration', 'demo'];
    if (allowedTypes.indexOf(clean.lead_type) === -1) clean.lead_type = 'readiness_check';

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    let leadId;
    try {
      const sheet = sheet_();
      leadId = 'EI-' + Utilities.formatDate(new Date(), 'Asia/Dubai', 'yyMMdd') + '-' + Utilities.getUuid().slice(0, 6).toUpperCase();
      clean.lead_id = leadId;
      clean.received_at = Utilities.formatDate(new Date(), 'Asia/Dubai', 'yyyy-MM-dd HH:mm:ss');
      clean.status = 'New';
      sheet.appendRow(HEADERS.map((h) => clean[h]));
    } finally {
      lock.releaseLock();
    }

    notify_(clean);
    return json_({ ok: true, lead_id: leadId });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'server' });
  }
}

/** Health check: open the /exec URL in a browser to confirm the deployment is live. */
function doGet() {
  return json_({ ok: true, service: 'finasheet-e-invoicing-leads' });
}

function sheet_() {
  const props = PropertiesService.getScriptProperties();
  const name = props.getProperty('SHEET_NAME') || 'Leads';
  const ss = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
}

function notify_(lead) {
  // Recipients: Script property SALES_EMAILS (comma-separated), otherwise the account that deployed the script.
  const to = (PropertiesService.getScriptProperties().getProperty('SALES_EMAILS') || Session.getEffectiveUser().getEmail() || '').trim();
  if (!to) return;
  const labels = {
    readiness_check: 'Readiness check', annual_plan: 'Readiness check (annual plan)',
    monthly_plan: 'Monthly billing enquiry', erp_integration: 'ERP integration quote', demo: 'Product demo',
  };
  const subject = `New e-invoicing lead: ${lead.company} (${labels[lead.lead_type]})`;
  const waNumber = lead.phone.replace('+', '');
  const lines = [
    `Lead ID: ${lead.lead_id}`,
    `Type: ${labels[lead.lead_type]}`,
    `Name: ${lead.full_name}`,
    `Company: ${lead.company}`,
    `Phone: ${lead.phone}  (WhatsApp: https://wa.me/${waNumber})`,
    `Email: ${lead.email}`,
    `Current software: ${lead.current_software || '—'}`,
    `B2B invoices / month: ${lead.monthly_volume || '—'}`,
    '',
    `Source: ${lead.utm_source || '—'} / ${lead.utm_medium || '—'} / ${lead.utm_campaign || '—'}`,
    `Keyword: ${lead.utm_term || '—'}   gclid: ${lead.gclid ? 'yes' : 'no'}`,
    `Landing page: ${lead.landing_page || lead.page_url}`,
    `Received: ${lead.received_at} (Dubai time)`,
  ];
  MailApp.sendEmail({ to, subject, body: lines.join('\n'), replyTo: lead.email, name: 'Finasheet website' });
}

function sanitise_(v) {
  let s = (v === undefined || v === null) ? '' : String(v);
  s = s.replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, 500);
  // Stop spreadsheet formula injection.
  if (/^[=+\-@]/.test(s) && !/^\+971\d+$/.test(s)) s = "'" + s;
  return s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
