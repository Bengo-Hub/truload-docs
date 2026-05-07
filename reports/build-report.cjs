/**
 * TruLoad – eCitizen Production Readiness Report
 * PDF Generator  –  Masterspace Solutions branding  v3
 *
 * Fixes applied vs v2:
 *  - h3/h4 get break-after:avoid so headings never orphan without their table
 *  - Large tables (>6 rows) no longer carry pb-avoid — they flow naturally
 *  - Removed duplicate in-content logo bar from last page (Puppeteer footer covers it)
 *  - PDF top/bottom margins increased to 64px/52px to fully clear header/footer logos
 *  - Section 3.5 (vulnerability table) moved to its own .page so heading + table
 *    start together at the top of that page
 *  - Section 3 page 2 trimmed to 3.3 + 3.4 only (no heading orphan risk)
 *
 * Run:  node build-report.cjs
 */

'use strict';
const puppeteer = require('puppeteer');
const fs        = require('fs');
const path      = require('path');

const MEDIA      = path.resolve(__dirname, 'media');
const PRSC_MEDIA = path.resolve(__dirname, '../docs/media/prosecution');
const OUT   = path.resolve(__dirname, 'TruLoad-eCitizen-Production-Readiness-Report.pdf');
const HTML  = path.resolve(__dirname, 'ecitizen-production-readiness-report.html');

const MSS_URI = 'data:image/png;base64,'
  + fs.readFileSync(path.join(MEDIA, 'mss.png')).toString('base64');
const KW_URI  = 'data:image/svg+xml;base64,'
  + fs.readFileSync(path.join(MEDIA, 'kuraweigh-logo.svg')).toString('base64');

function imgURI(filename) {
  const ext  = path.extname(filename).slice(1).toLowerCase();
  const mime = (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg'
             : ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
  return `data:${mime};base64,` + fs.readFileSync(path.join(PRSC_MEDIA, filename)).toString('base64');
}

const IMG = {
  prosecutionPage:    imgURI('prosecution-page.png'),
  prosecutionInvoice: imgURI('prosecution-invoicing.png'),
  ecitizenPayment:    imgURI('prosecution-invoicing-ecitizen-payment.png'),
  settleInvoice:      imgURI('prosecution-invoicing-settle-invpoice.png'),
  ecitizenSTK:        imgURI('ecitizen-mpesa-stk-push.png'),
  stkPrompt:          imgURI('stk-push-mpesa-prompt.jpeg'),
  stkConfirm:         imgURI('stk-push-mpesa-confirm-message.jpeg'),
  paymentSuccess:     imgURI('payment-success-modal.png'),
  paymentReceipt:     imgURI('payment-receipt.png'),
  receiptsPage:       imgURI('reciepts-page.png'),
};

// ─── Puppeteer header / footer templates ─────────────────────────────────────
// Must be self-contained (data URIs only – no external refs in isolated iframe)
const HDR = `
<div style="
  box-sizing:border-box;width:100%;padding:10px 52px 8px;
  display:flex;align-items:center;justify-content:space-between;
  border-bottom:1.5px solid #dce5f5;background:#fff;
  font-family:'Segoe UI',Arial,sans-serif;font-size:10pt;
">
  <img src="${KW_URI}" style="height:30px;opacity:.88;" />
  <span style="font-size:7.5pt;color:#7a8aad;text-align:center;flex:1;padding:0 10px;">
    CONFIDENTIAL &nbsp;—&nbsp; TruLoad eCitizen Production Readiness Report &nbsp;·&nbsp; Masterspace Solutions
  </span>
  <img src="${MSS_URI}" style="height:22px;opacity:.82;" />
</div>`;

const FTR = `
<div style="
  box-sizing:border-box;width:100%;padding:8px 52px 10px;
  display:flex;align-items:center;justify-content:space-between;
  border-top:1.5px solid #dce5f5;background:#fff;
  font-family:'Segoe UI',Arial,sans-serif;font-size:10pt;
">
  <span style="font-size:7.5pt;color:#7a8aad;">Masterspace Solutions &nbsp;·&nbsp; info@masterspace.co.ke</span>
  <span style="font-size:7.5pt;color:#7a8aad;">06 May 2026</span>
  <span style="font-size:7.5pt;color:#7a8aad;">
    Page <span class="pageNumber"></span> of <span class="totalPages"></span>
  </span>
</div>`;

// ─────────────────────────────────────────────────────────────────────────────
function buildHTML() {
return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>TruLoad – eCitizen Production Readiness Report</title>
<style>
/* ── reset ──────────────────────────────────────────────── */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}

/* ── typography ─────────────────────────────────────────── */
body{
  font-family:'Segoe UI',Arial,sans-serif;
  font-size:10.5pt;color:#1a1a2e;background:#fff;line-height:1.52;
}

/* ─── heading breaks: NEVER orphan a heading without its content ─── */
h3{
  font-size:11.5pt;font-weight:700;color:#1b3a6b;
  margin:20px 0 7px;padding-left:10px;border-left:3.5px solid #1b3a6b;
  /* prevent heading sitting alone at bottom of a page */
  break-after:avoid;page-break-after:avoid;
  break-inside:avoid;page-break-inside:avoid;
}
h4{
  font-size:10pt;font-weight:700;color:#0d1b2a;margin:14px 0 5px;
  break-after:avoid;page-break-after:avoid;
}
p{margin-bottom:8px;}
ul,ol{margin:5px 0 9px 20px;}
li{margin-bottom:4px;}
code{
  background:#eef1f8;border-radius:3px;padding:1px 4px;
  font-size:8.5pt;font-family:'Courier New',monospace;color:#1a3a6b;
}

/* ── @page ──────────────────────────────────────────────── */
/* CSS @page margin applies to ALL pages including overflow/continuation pages —
   the only mechanism that prevents header overlap on mid-content page breaks. */
@page{size:A4;margin:80px 0 65px}

/* ── cover page ─────────────────────────────────────────── */
.cover{
  width:210mm;
  padding:40px 64px 50px;
  background:linear-gradient(155deg,#0d1b2a 0%,#1b3a6b 58%,#0b6e4f 100%);
  color:#fff;position:relative;overflow:hidden;
  display:flex;flex-direction:column;
  /* content area = A4(297mm) - @page margin-top(80px) - @page margin-bottom(65px) */
  min-height:calc(297mm - 80px - 65px);
  page-break-after:always;
}
.cover::before{content:'';position:absolute;top:-80px;right:-80px;
  width:420px;height:420px;border-radius:50%;background:rgba(255,255,255,.05);}
.cover::after{content:'';position:absolute;bottom:-100px;left:-60px;
  width:360px;height:360px;border-radius:50%;background:rgba(255,255,255,.03);}

.cover-logo-bar{
  display:flex;align-items:center;justify-content:space-between;
  margin-bottom:46px;
}
.cover-logo-bar img.kw-logo{height:58px;filter:brightness(0) invert(1);}
.cover-logo-bar img.mss-logo{height:40px;filter:brightness(0) invert(1) opacity(.85);}

.cover-tag{
  display:inline-block;background:rgba(255,255,255,.15);border-radius:5px;
  padding:3px 12px;font-size:8.5pt;letter-spacing:1.4px;
  text-transform:uppercase;color:#a8d8ea;margin-bottom:13px;font-weight:600;
}
.cover h1{font-size:27pt;font-weight:800;line-height:1.17;margin-bottom:16px;}
.cover-subtitle{font-size:12pt;opacity:.82;margin-bottom:36px;
  max-width:560px;line-height:1.5;}
.cover-badge-row{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:32px;}
.badge{display:inline-block;padding:4px 12px;border-radius:20px;
  font-size:8.5pt;font-weight:700;}
.badge-green {background:#14a97c;color:#fff;}
.badge-blue  {background:#1a6fc4;color:#fff;}
.badge-dark  {background:rgba(255,255,255,.18);color:#fff;}
.cover-divider{border:none;border-top:1.5px solid rgba(255,255,255,.2);margin:0 0 24px;}
.cover-meta{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:auto;}
.cm-item label{display:block;font-size:7.5pt;text-transform:uppercase;
  letter-spacing:1px;color:#a8d8ea;margin-bottom:3px;font-weight:600;}
.cm-item span{font-size:10pt;font-weight:600;}

/* ── standard page ──────────────────────────────────────── */
/* Clearance is handled by @page margins (80px top / 65px bottom) — applies to
   EVERY page including overflow continuation pages.  These paddings are visual only. */
.page{
  padding:18px 56px 16px;
  width:210mm;
  page-break-after:always;
}
.page:last-child{page-break-after:auto;}

/* ── section header bar ─────────────────────────────────── */
.sh{
  display:flex;align-items:center;gap:12px;
  margin-bottom:20px;padding-bottom:9px;border-bottom:2.5px solid #1b3a6b;
  break-after:avoid;page-break-after:avoid;
}
.sh-num{
  background:#1b3a6b;color:#fff;border-radius:7px;
  width:34px;height:34px;display:flex;align-items:center;justify-content:center;
  font-size:14pt;font-weight:800;flex-shrink:0;
}
.sh h2{font-size:15pt;font-weight:700;color:#0d1b2a;line-height:1.2;}
.sh p{font-size:8.5pt;color:#555;margin-top:2px;margin-bottom:0;}

/* ── kv grids ───────────────────────────────────────────── */
.kv2{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:14px;}
.kvc{
  background:#f5f8ff;border-radius:6px;padding:9px 13px;
  border:1px solid #dce5f5;
  break-inside:avoid;page-break-inside:avoid;
}
.kvc .kvl{font-size:7.5pt;text-transform:uppercase;color:#6b7fad;
  letter-spacing:.7px;margin-bottom:3px;font-weight:600;}
.kvc .kvv{font-size:9.5pt;font-weight:700;color:#0d1b2a;}
.kvc .kvn{font-size:8pt;color:#555;margin-top:2px;}

/* ── tables ─────────────────────────────────────────────── */
table{width:100%;border-collapse:collapse;margin-bottom:14px;font-size:9pt;}
thead th{
  background:#1b3a6b;color:#fff;padding:7px 9px;text-align:left;
  font-weight:600;font-size:8.5pt;
}
tbody tr:nth-child(even){background:#f5f8ff;}
tbody td{padding:6px 9px;border-bottom:1px solid #dce5f5;vertical-align:top;}
/* thead should repeat on new pages and not orphan */
thead{display:table-header-group;}

/* pb-avoid: ONLY for tables with ≤5 rows. Large tables must flow naturally. */
.pb-avoid{break-inside:avoid;page-break-inside:avoid;}

/* ── pills ──────────────────────────────────────────────── */
.pill{display:inline-block;padding:2px 8px;border-radius:11px;
  font-size:8pt;font-weight:700;white-space:nowrap;}
.pg{background:#d4f5e8;color:#0a6640;}
.po{background:#ffecd9;color:#8f4100;}
.pr{background:#fde8e8;color:#8b0000;}
.pb{background:#daeeff;color:#0a3a7a;}
.pq{background:#ebebeb;color:#444;}

/* ── info boxes ─────────────────────────────────────────── */
.ib{
  border-radius:7px;padding:10px 14px;margin-bottom:12px;font-size:9.5pt;
  break-inside:avoid;page-break-inside:avoid;
}
.ib strong{display:block;margin-bottom:3px;}
.ibb{background:#eef4ff;border-left:4px solid #1a6fc4;}
.ibg{background:#edfaf4;border-left:4px solid #14a97c;}
.ibo{background:#fff7f0;border-left:4px solid #e07b39;}

/* ── flow diagram ───────────────────────────────────────── */
.fbox{
  background:#f5f8ff;border:1.5px solid #dce5f5;border-radius:7px;
  padding:14px 18px;margin-bottom:12px;font-size:8.5pt;
  font-family:'Courier New',monospace;line-height:2;color:#0d1b2a;
}
.fa{color:#1a6fc4;font-weight:700;}
.fs{color:#0b6e4f;font-weight:700;}

/* ── code block ─────────────────────────────────────────── */
pre{
  background:#101926;color:#c8d8f5;border-radius:7px;
  padding:11px 15px;font-size:8.5pt;font-family:'Courier New',monospace;
  overflow:hidden;margin-bottom:12px;line-height:1.6;
  break-inside:avoid;page-break-inside:avoid;
}
pre .co{color:#7a9bbf;}
pre .kw{color:#79c0ff;}
pre .st{color:#a5d6a7;}

/* ── TOC ────────────────────────────────────────────────── */
.toc{list-style:none;margin:14px 0;}
.toc li{
  display:flex;justify-content:space-between;align-items:baseline;
  padding:5px 0;border-bottom:1px dotted #ccc;font-size:10pt;
}
.toc .tn{font-weight:700;color:#1b3a6b;margin-right:8px;min-width:26px;}
.toc .tt{flex:1;}
.toc .tp{color:#888;font-size:9.5pt;}

/* ── evidence screenshots ────────────────────────────────── */
.ev-blk{margin:8px 0 12px;break-inside:avoid;page-break-inside:avoid;}
.ev-blk img{
  width:100%;display:block;
  border:1px solid #dce5f5;border-radius:6px;
  box-shadow:0 1px 5px rgba(0,0,0,.09);
}
.ev-cap{
  font-size:7.8pt;color:#6b7fad;text-align:center;
  margin-top:5px;font-style:italic;
}
.ev-2col{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:8px 0 12px;}
.ev-2col .ev-blk{margin:0;}
.ev-mobile img{max-height:260px;width:auto;margin:0 auto;}

/* ── signatures ─────────────────────────────────────────── */
.sig-tbl{width:100%;border-collapse:collapse;margin-top:22px;}
.sig-tbl td{padding:7px 12px;vertical-align:bottom;}
.sig-line{border-top:1.5px solid #1b3a6b;margin-top:32px;margin-bottom:4px;}
.sig-lbl{font-size:8.5pt;color:#555;}
</style>
</head>
<body>

<!-- ══════════════════════════════════════════════
     COVER PAGE
══════════════════════════════════════════════════ -->
<div class="cover">
  <div class="cover-logo-bar">
    <img class="kw-logo" src="${KW_URI}" alt="KuraWeigh"/>
    <img class="mss-logo" src="${MSS_URI}" alt="Masterspace Solutions"/>
  </div>

  <span class="cover-tag">Confidential · Production Readiness</span>
  <h1>eCitizen Integration &amp;<br>Production Deployment<br>Readiness Report</h1>
  <p class="cover-subtitle">
    Prepared in response to the eCitizen / Pesaflow go-live sign-off requirements.
    Covers production environment architecture, security posture, M-PESA payment
    integration validation, and test evidence for the TruLoad axle-load enforcement
    and commercial weighing platform.
  </p>
  <div class="cover-badge-row">
    <span class="badge badge-green">Production Ready</span>
    <span class="badge badge-blue">Kubernetes · Konza Cloud</span>
    <span class="badge badge-blue">eCitizen · Pesaflow</span>
    <span class="badge badge-dark">Kenya Traffic Act Cap 403</span>
    <span class="badge badge-dark">EAC VLC Act 2016</span>
  </div>
  <hr class="cover-divider"/>
  <div class="cover-meta">
    <div class="cm-item"><label>Report Date</label><span>06 May 2026</span></div>
    <div class="cm-item"><label>Version</label><span>1.0.1 – Test Evidence &amp; Payloads Added</span></div>
    <div class="cm-item"><label>Prepared By</label><span>Masterspace Solutions</span></div>
    <div class="cm-item"><label>Submitted To</label><span>eCitizen Integration Team</span></div>
    <div class="cm-item"><label>Contact</label><span>info@masterspace.co.ke</span></div>
    <div class="cm-item"><label>Classification</label><span>Confidential</span></div>
  </div>
</div>


<!-- ══════════════════════════════════════════════
     TABLE OF CONTENTS
══════════════════════════════════════════════════ -->
<div class="page">
  <div class="sh">
    <div class="sh-num" style="background:#4a5568;font-size:17pt;">≡</div>
    <div><h2>Table of Contents</h2><p>Navigation guide for this report</p></div>
  </div>
  <ul class="toc">
    <li><span class="tn">1.</span><span class="tt">Executive Summary</span><span class="tp">3</span></li>
    <li><span class="tn">2.</span><span class="tt">Production Environment Details</span><span class="tp">4</span></li>
    <li><span class="tn">2.1</span><span class="tt">&nbsp;&nbsp;Hosting Location &amp; Service Provider</span><span class="tp">4</span></li>
    <li><span class="tn">2.2</span><span class="tt">&nbsp;&nbsp;Infrastructure Architecture</span><span class="tp">4</span></li>
    <li><span class="tn">2.3</span><span class="tt">&nbsp;&nbsp;Test vs. Production Segregation</span><span class="tp">5</span></li>
    <li><span class="tn">2.4</span><span class="tt">&nbsp;&nbsp;Production Service Endpoints</span><span class="tp">5</span></li>
    <li><span class="tn">3.</span><span class="tt">Security Assurance</span><span class="tp">6</span></li>
    <li><span class="tn">3.1</span><span class="tt">&nbsp;&nbsp;Security Assessment Overview</span><span class="tp">6</span></li>
    <li><span class="tn">3.2</span><span class="tt">&nbsp;&nbsp;Authentication &amp; Access Control</span><span class="tp">6</span></li>
    <li><span class="tn">3.3</span><span class="tt">&nbsp;&nbsp;Data Protection &amp; Encryption</span><span class="tp">7</span></li>
    <li><span class="tn">3.4</span><span class="tt">&nbsp;&nbsp;Infrastructure Security Controls</span><span class="tp">7</span></li>
    <li><span class="tn">3.5</span><span class="tt">&nbsp;&nbsp;Identified Vulnerabilities &amp; Resolution Status</span><span class="tp">8</span></li>
    <li><span class="tn">4.</span><span class="tt">M-PESA / Pesaflow Integration Validation</span><span class="tp">9</span></li>
    <li><span class="tn">4.1</span><span class="tt">&nbsp;&nbsp;Integration Architecture</span><span class="tp">9</span></li>
    <li><span class="tn">4.2</span><span class="tt">&nbsp;&nbsp;End-to-End Transaction Flow</span><span class="tp">9</span></li>
    <li><span class="tn">4.3</span><span class="tt">&nbsp;&nbsp;IPN Webhook &amp; Callback Handling</span><span class="tp">10</span></li>
    <li><span class="tn">4.4</span><span class="tt">&nbsp;&nbsp;Failure Scenarios &amp; Resilience</span><span class="tp">11</span></li>
    <li><span class="tn">4.5</span><span class="tt">&nbsp;&nbsp;Reconciliation Process</span><span class="tp">12</span></li>
    <li><span class="tn">4.6</span><span class="tt">&nbsp;&nbsp;Test Evidence Summary</span><span class="tp">12</span></li>
    <li><span class="tn">5.</span><span class="tt">Test Results &amp; Documentation</span><span class="tp">13</span></li>
    <li><span class="tn">5.1</span><span class="tt">&nbsp;&nbsp;Test Strategy</span><span class="tp">13</span></li>
    <li><span class="tn">5.2</span><span class="tt">&nbsp;&nbsp;Regulatory Compliance Test Results</span><span class="tp">13</span></li>
    <li><span class="tn">5.3</span><span class="tt">&nbsp;&nbsp;API &amp; Integration Documentation</span><span class="tp">14</span></li>
    <li><span class="tn">5.4</span><span class="tt">&nbsp;&nbsp;Production Deployment Configuration</span><span class="tp">14</span></li>
    <li><span class="tn">6.</span><span class="tt">Outstanding Items &amp; Roadmap</span><span class="tp">15</span></li>
    <li><span class="tn">7.</span><span class="tt">Declarations &amp; Sign-Off</span><span class="tp">16</span></li>
  </ul>
  <div class="ib ibb">
    <strong>Document Purpose</strong>
    This report satisfies the eCitizen Integration Team's pre-production sign-off requirements
    for TruLoad, covering all four mandatory areas: Production Environment Details, Security
    Assurance, M-PESA Integration Validation, and Test Results &amp; Documentation.
  </div>
</div>


<!-- ══════════════════════════════════════════════
     §1  EXECUTIVE SUMMARY
══════════════════════════════════════════════════ -->
<div class="page">
  <div class="sh">
    <div class="sh-num">1</div>
    <div><h2>Executive Summary</h2><p>High-level status of TruLoad's production readiness</p></div>
  </div>
  <p>
    <strong>TruLoad</strong> is a next-generation Intelligent Weighing and Enforcement Solution built
    by <strong>Masterspace Solutions</strong>. It serves two primary use cases: (i) axle-load enforcement
    for road authorities (<em>KuraWeigh</em> brand) under the Kenya Traffic Act Cap 403 and the EAC
    Vehicle Load Control Act 2016, and (ii) a multi-tenant SaaS platform for commercial weighing.
  </p>
  <p>
    The platform is deployed on <strong>Konza Technopolis Cloud</strong> within a fully managed Kubernetes
    cluster, with horizontal pod autoscaling, automated TLS, and GitOps-driven delivery via ArgoCD.
    Payment collection is routed through <strong>eCitizen / Pesaflow</strong>, enabling M-PESA, bank,
    and card channels. Following a comprehensive internal audit (January 2026), all critical regulatory
    compliance gaps were resolved and verified.
  </p>

  <h3>Overall Readiness Status</h3>
  <table class="pb-avoid">
    <thead><tr><th>Requirement Area</th><th>Status</th><th>Details</th></tr></thead>
    <tbody>
      <tr><td><strong>Production Environment</strong></td><td><span class="pill pg">Ready</span></td><td>Konza Cloud · 48 GB RAM · 512 GB NVMe · K8s HA cluster</td></tr>
      <tr><td><strong>Environment Segregation</strong></td><td><span class="pill pg">Complete</span></td><td>Separate K8s namespaces, ingress hostnames &amp; Pesaflow environments</td></tr>
      <tr><td><strong>Security Controls</strong></td><td><span class="pill pg">Implemented</span></td><td>SSO / 2FA · JWT · RBAC · TLS · HMAC · Container hardening · Trivy</td></tr>
      <tr><td><strong>M-PESA Integration</strong></td><td><span class="pill pg">Validated</span></td><td>E2E tested (sandbox) · Webhook + polling fallback · Reconciliation available</td></tr>
      <tr><td><strong>Regulatory Compliance</strong></td><td><span class="pill pg">Compliant</span></td><td>Traffic Act Cap 403 &amp; EAC VLC Act 2016 — all critical gaps resolved Jan 2026</td></tr>
      <tr><td><strong>API Documentation</strong></td><td><span class="pill pg">Available</span></td><td>OpenAPI / Swagger accessible at production API endpoint</td></tr>
      <tr><td><strong>Weight Ticket Format</strong></td><td><span class="pill pg">Complete</span></td><td>Dual-table KeNHA-format PDF (KeNHA Form WB-001) — QuestPDF template live</td></tr>
      <tr><td><strong>Demerit Points Tracking</strong></td><td><span class="pill pg">Implemented</span></td><td>Per-transaction tracking in place; lifetime history pending NTSA API credentials</td></tr>
      <tr><td><strong>NTSA / KeNHA Live Credentials</strong></td><td><span class="pill po">Pending</span></td><td>Implementation complete — awaiting live API keys from NTSA and KeNHA</td></tr>
    </tbody>
  </table>
  <div class="ib ibg">
    <strong>Overall Assessment</strong>
    TruLoad is <strong>production-ready</strong> for eCitizen go-live. All core payment, security,
    and compliance controls are fully operational. The only remaining items are NTSA and KeNHA live
    API credentials — implementation is complete and awaiting provision by those authorities.
  </div>
</div>


<!-- ══════════════════════════════════════════════
     §2  PRODUCTION ENVIRONMENT – Hosting + Architecture
══════════════════════════════════════════════════ -->
<div class="page">
  <div class="sh">
    <div class="sh-num">2</div>
    <div><h2>Production Environment Details</h2><p>Hosting, infrastructure, and environment segregation</p></div>
  </div>

  <h3>2.1 Hosting Location &amp; Service Provider</h3>
  <div class="kv2">
    <div class="kvc"><div class="kvl">Cloud / Data Centre</div><div class="kvv">Konza Technopolis Cloud</div><div class="kvn">Konza City, Machakos County, Kenya</div></div>
    <div class="kvc"><div class="kvl">Data Residency</div><div class="kvv">Republic of Kenya</div><div class="kvn">All data within Kenyan jurisdiction</div></div>
    <div class="kvc"><div class="kvl">RAM</div><div class="kvv">48 GB DDR4 ECC</div><div class="kvn">Dedicated node pool for TruLoad</div></div>
    <div class="kvc"><div class="kvl">Storage</div><div class="kvv">512 GB NVMe SSD</div><div class="kvn">High-IOPS local-path persistent volumes</div></div>
    <div class="kvc"><div class="kvl">Orchestration</div><div class="kvv">Kubernetes (K8s)</div><div class="kvn">Production HA cluster · GitOps via ArgoCD</div></div>
    <div class="kvc"><div class="kvl">Container Registry</div><div class="kvv">Docker Hub (mss/*)</div><div class="kvn">Private images · credentials in K8s Secrets</div></div>
  </div>

  <h3>2.2 Infrastructure Architecture</h3>
  <!-- 9 rows — flows naturally across pages if needed; thead repeats -->
  <table>
    <thead><tr><th>Component</th><th>Technology</th><th>Role</th><th style="width:80px">Replicas</th></tr></thead>
    <tbody>
      <tr><td><strong>API Backend</strong></td><td>ASP.NET Core 10 / .NET 10 LTS</td><td>Business logic, weight capture, payments, compliance</td><td>2 – 4 (HPA)</td></tr>
      <tr><td><strong>Web Frontend</strong></td><td>Next.js 16 / React 19 / TypeScript</td><td>Weighbridge operator UI, enforcement dashboard, PWA</td><td>2 – 4 (HPA)</td></tr>
      <tr><td><strong>Database</strong></td><td>PostgreSQL 17 + pgvector</td><td>Transactional data, vector embeddings, audit logs</td><td>Primary + replicas</td></tr>
      <tr><td><strong>Cache / Session</strong></td><td>Redis 7.x</td><td>OAuth tokens, lookup tables, embedding cache</td><td>Cluster</td></tr>
      <tr><td><strong>Message Broker</strong></td><td>RabbitMQ / NATS</td><td>Async events: payment confirmation, notifications</td><td>Cluster</td></tr>
      <tr><td><strong>Ingress / Gateway</strong></td><td>NGINX Ingress Controller</td><td>SSL termination, CORS, routing, rate limiting</td><td>2+ (HA)</td></tr>
      <tr><td><strong>TLS / Certificate</strong></td><td>cert-manager + Let's Encrypt</td><td>Auto-issue &amp; renew TLS for all domains</td><td>Cluster-wide</td></tr>
      <tr><td><strong>CI / CD</strong></td><td>GitHub Actions + ArgoCD</td><td>Build → scan → push → Helm update → GitOps deploy</td><td>Automated</td></tr>
      <tr><td><strong>Scale Middleware</strong></td><td>TruConnect (Node.js)</td><td>Weighbridge indicator interface (ZM, Cardinal, PAW, Haenni)</td><td>Per station</td></tr>
    </tbody>
  </table>
  <div class="ib ibb">
    <strong>High Availability</strong>
    Backend and frontend each maintain a minimum of 2 pods (up to 4 via HPA). Startup, readiness,
    and liveness probes on <code>/health</code> and <code>/api/health</code> ensure zero broken traffic.
    All pods run as non-root UID 1001 with enforced <code>securityContext</code>.
  </div>
</div>


<!-- ══════════════════════════════════════════════
     §2.3 + §2.4  SEGREGATION + ENDPOINTS
══════════════════════════════════════════════════ -->
<div class="page">
  <h3>2.3 Test vs. Production Environment Segregation</h3>
  <table>
    <thead><tr><th style="width:28%">Dimension</th><th>Test / Staging</th><th>Production</th></tr></thead>
    <tbody>
      <tr><td><strong>Backend API URL</strong></td><td><code>kuraweighapitest.masterspace.co.ke</code></td><td><code>axleload.kura.go.ke</code></td></tr>
      <tr><td><strong>Frontend URL</strong></td><td><code>kuraweightest.masterspace.co.ke</code></td><td><code>axleload.kura.go.ke</code></td></tr>
      <tr><td><strong>Pesaflow Base URL</strong></td><td><code>https://test.pesaflow.com</code></td><td><code>https://ecitizen.go.ke</code></td></tr>
      <tr><td><strong>Pesaflow Credentials</strong></td><td>Sandbox ApiKey / ClientId 588</td><td>Production ApiKey / production ClientId</td></tr>
      <tr><td><strong>Database</strong></td><td>Shared test PostgreSQL instance</td><td>Dedicated production PostgreSQL with SSL</td></tr>
      <tr><td><strong>TLS Certificate</strong></td><td>cert-manager letsencrypt-prod</td><td>cert-manager letsencrypt-prod (separate TLS secrets)</td></tr>
      <tr><td><strong>Webhook URL</strong></td><td>axleloadapi.kura.go.ke/…/ecitizen-pesaflow</td><td>axleload.kura.go.ke/…/ecitizen-pesaflow</td></tr>
    </tbody>
  </table>
  <div class="ib ibg">
    <strong>Confirmation</strong>
    Test and production environments use entirely separate Pesaflow credentials and base URLs.
    No production payment data is ever processed against the sandbox endpoint.
  </div>

  <h3>2.4 Production Service Endpoints</h3>
  <div class="kv2">
    <div class="kvc"><div class="kvl">Production API</div><div class="kvv" style="font-size:8.5pt">-</div></div>
    <div class="kvc"><div class="kvl">Production Frontend</div><div class="kvv" style="font-size:8.5pt">-</div></div>
    <div class="kvc"><div class="kvl">API Documentation (Swagger)</div><div class="kvv" style="font-size:8.5pt">…/swagger</div></div>
    <div class="kvc"><div class="kvl">OpenAPI JSON Spec</div><div class="kvv" style="font-size:8.5pt">…/swagger/v1/swagger.json</div></div>
    <div class="kvc"><div class="kvl">Health Check Endpoint</div><div class="kvv" style="font-size:8.5pt">…/health</div></div>
    <div class="kvc"><div class="kvl">SSO / Authentication</div><div class="kvv" style="font-size:8.5pt">-</div></div>
    <div class="kvc"><div class="kvl">Pesaflow IPN Webhook</div><div class="kvv" style="font-size:8.5pt">…/api/v1/payments/webhook/ecitizen-pesaflow</div></div>
    <div class="kvc"><div class="kvl">Payment Success Callback</div><div class="kvv" style="font-size:8.5pt">…/api/v1/payments/callback/success</div></div>
  </div>
</div>


<!-- ══════════════════════════════════════════════
     §3  SECURITY – Overview + Auth
══════════════════════════════════════════════════ -->
<div class="page">
  <div class="sh">
    <div class="sh-num">3</div>
    <div><h2>Security Assurance</h2><p>Security assessment, controls, and vulnerability resolution</p></div>
  </div>

  <h3>3.1 Security Assessment Overview</h3>
  <p>
    TruLoad underwent a comprehensive internal security assessment (January–March 2026) by the
    Masterspace Solutions security engineering team, covering the following domains:
  </p>
  <ul style="columns:2;column-gap:24px;margin-bottom:12px;">
    <li>Authentication and session management</li>
    <li>API authorisation (RBAC)</li>
    <li>Data encryption at rest and in transit</li>
    <li>Container and Kubernetes security</li>
    <li>Payment webhook integrity (HMAC)</li>
    <li>Dependency vulnerability scanning (Trivy)</li>
    <li>Secret management and rotation</li>
    <li>Input validation and injection prevention</li>
    <li>Audit logging and tamper resistance</li>
    <li>Network policies and inter-service isolation</li>
  </ul>

  <h3>3.2 Authentication &amp; Access Control</h3>
  <table>
    <thead><tr><th>Control</th><th>Implementation</th><th style="width:90px">Status</th></tr></thead>
    <tbody>
      <tr><td><strong>2FA (Two-Factor Auth)</strong></td><td>TOTP-based 2FA enforced for all operators and administrators via SSO</td><td><span class="pill pg">Enforced</span></td></tr>
      <tr><td><strong>JWT Bearer Tokens</strong></td><td>Short-lived tokens validated against JWKS; HMAC-signed with rotating secrets</td><td><span class="pill pg">Active</span></td></tr>
      <tr><td><strong>RBAC</strong></td><td>Fine-grained permissions (<code>Weighing.Create</code>, <code>Prosecution.View</code>, etc.) enforced via MediatR behaviours</td><td><span class="pill pg">Active</span></td></tr>
      <tr><td><strong>Password Hashing</strong></td><td>Argon2id (memory-hard, GPU-resistant) via Konscious.Security.Cryptography</td><td><span class="pill pg">Active</span></td></tr>
      <tr><td><strong>Session Revocation</strong></td><td>Token invalidation on logout; Redis-backed blocklist for immediate revocation</td><td><span class="pill pg">Active</span></td></tr>
      <tr><td><strong>Rate Limiting</strong></td><td>NGINX-layer rate limiting on auth and webhook endpoints</td><td><span class="pill pg">Active</span></td></tr>
    </tbody>
  </table>
</div>


<!-- ══════════════════════════════════════════════
     §3.3 + §3.4  DATA PROTECTION + INFRA SECURITY
══════════════════════════════════════════════════ -->
<div class="page">
  <h3>3.3 Data Protection &amp; Encryption</h3>
  <table>
    <thead><tr><th>Layer</th><th>Mechanism</th><th style="width:110px">Standard</th></tr></thead>
    <tbody>
      <tr><td><strong>Transport (API)</strong></td><td>TLS 1.2+ via NGINX; HSTS; HTTP → HTTPS redirect enforced</td><td>TLS 1.2 / 1.3</td></tr>
      <tr><td><strong>Transport (Database)</strong></td><td>PostgreSQL SSL required in production; certificate validation enforced</td><td>TLS 1.2+</td></tr>
      <tr><td><strong>Payment Credentials at Rest</strong></td><td>Pesaflow ApiKey, ApiSecret, ClientId encrypted in <code>integration_configs</code> table; AES-GCM key stored in K8s Secret</td><td>AES-256-GCM</td></tr>
      <tr><td><strong>K8s Secrets</strong></td><td>All sensitive env vars (DB connection strings, JWT secrets, registry credentials) in K8s Secrets — never in code or configmap</td><td>K8s Secret</td></tr>
      <tr><td><strong>Webhook Signature</strong></td><td>Pesaflow IPN: HMAC-SHA256 <code>token_hash</code> verified on every request; unsigned payloads → HTTP 400</td><td>HMAC-SHA256</td></tr>
      <tr><td><strong>Audit Log Integrity</strong></td><td>Immutable Serilog trail for prosecution, invoice, and payment events; no delete/update on audit records</td><td>Serilog / Immutable</td></tr>
      <tr><td><strong>HTTP Security Headers</strong></td><td><code>X-Content-Type-Options: nosniff</code> · <code>X-Frame-Options: DENY</code> · <code>Content-Security-Policy</code> · <code>HSTS</code></td><td>OWASP</td></tr>
    </tbody>
  </table>

  <h3>3.4 Infrastructure Security Controls</h3>
  <table>
    <thead><tr><th>Control</th><th>Implementation</th><th style="width:120px">Status</th></tr></thead>
    <tbody>
      <tr><td><strong>Non-Root Containers</strong></td><td>All containers run as UID/GID 1001; <code>runAsNonRoot: true</code> in securityContext; capabilities dropped</td><td><span class="pill pg">Enforced</span></td></tr>
      <tr><td><strong>Vulnerability Scanning</strong></td><td>Trivy filesystem + image scan on every CI/CD build; CRITICAL findings block deployment</td><td><span class="pill pg">Every Build</span></td></tr>
      <tr><td><strong>Network Policies</strong></td><td>K8s ingress rules restrict inter-namespace traffic; backend unreachable directly from internet</td><td><span class="pill pg">Active</span></td></tr>
      <tr><td><strong>CORS Policy</strong></td><td>Strict origin whitelist at both NGINX ingress and application layer</td><td><span class="pill pg">Active</span></td></tr>
      <tr><td><strong>SQL Injection Prevention</strong></td><td>EF Core parameterised queries; FluentValidation on all input models; no raw SQL concatenation</td><td><span class="pill pg">Implemented</span></td></tr>
      <tr><td><strong>GitOps Audit Trail</strong></td><td>All infrastructure changes tracked in <code>devops-k8s</code> git history; ArgoCD enforces desired state</td><td><span class="pill pg">Active</span></td></tr>
    </tbody>
  </table>
</div>


<!-- ══════════════════════════════════════════════
     §3.5  VULNERABILITIES TABLE  (own page → heading never orphaned)
══════════════════════════════════════════════════ -->
<div class="page">
  <h3>3.5 Identified Vulnerabilities &amp; Resolution Status</h3>
  <p>
    The following findings were identified during the January–March 2026 security assessment.
    All Critical and High findings have been resolved prior to this production readiness submission.
  </p>
  <!-- Large table — no pb-avoid; let rows flow naturally if needed -->
  <table>
    <thead>
      <tr>
        <th>Finding</th>
        <th style="width:70px">Severity</th>
        <th>Resolution</th>
        <th style="width:90px">Resolved</th>
        <th style="width:80px">Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Axle-group fee calculation incorrectly computed (incorrect enforcement fines)</td>
        <td><span class="pill pr">Critical</span></td>
        <td>Implemented <code>AxleGroupAggregationService</code> and per-axle-type fee schedules</td>
        <td>23 Jan 2026</td>
        <td><span class="pill pg">Resolved</span></td>
      </tr>
      <tr>
        <td>Demerit points not tracked — repeat offenders not flagged</td>
        <td><span class="pill pr">Critical</span></td>
        <td>Implemented <code>DemeritPointSchedule</code> &amp; <code>PenaltySchedule</code> models with repository layer</td>
        <td>23 Jan 2026</td>
        <td><span class="pill pg">Resolved</span></td>
      </tr>
      <tr>
        <td>Pesaflow IPN webhook accepted without signature verification</td>
        <td><span class="pill pr">Critical</span></td>
        <td>HMAC-SHA256 <code>token_hash</code> verification mandated on every IPN; unsigned payloads return HTTP 400</td>
        <td>11 Feb 2026</td>
        <td><span class="pill pg">Resolved</span></td>
      </tr>
      <tr>
        <td>Container running as root user (privilege escalation risk)</td>
        <td><span class="pill po">High</span></td>
        <td>Dockerfile updated to UID/GID 1001; <code>securityContext</code> enforced in all Helm values</td>
        <td>Jan 2026</td>
        <td><span class="pill pg">Resolved</span></td>
      </tr>
      <tr>
        <td>Pesaflow credentials stored in plain text in appsettings.json</td>
        <td><span class="pill po">High</span></td>
        <td>Credentials migrated to AES-256-GCM encrypted <code>integration_configs</code> DB column; key in K8s Secret</td>
        <td>Feb 2026</td>
        <td><span class="pill pg">Resolved</span></td>
      </tr>
      <tr>
        <td>Tolerance rules applied per-axle instead of per-group (regulatory non-compliance)</td>
        <td><span class="pill po">High</span></td>
        <td>DB-driven <code>ToleranceSettings</code> table implemented: 5% for single-axle, 0% for grouped axles</td>
        <td>26 Mar 2026</td>
        <td><span class="pill pg">Resolved</span></td>
      </tr>
      <tr>
        <td>Weight ticket PDF does not match KeNHA dual-table template (Form WB-001)</td>
        <td><span class="pill pb">Medium</span></td>
        <td>QuestPDF template updated — individual axle + group tables, Pavement Damage Factor column, KeNHA Form WB-001 legal disclaimer</td>
        <td>Q2 2026</td>
        <td><span class="pill pg">Resolved</span></td>
      </tr>
      <tr>
        <td>Cumulative demerit points not tracked across vehicle lifetime history</td>
        <td><span class="pill pb">Medium</span></td>
        <td>Per-transaction tracking in place; lifetime history pending NTSA API integration</td>
        <td>Q3 2026</td>
        <td><span class="pill po">Planned</span></td>
      </tr>
    </tbody>
  </table>
  <div class="ib ibg">
    <strong>Security Assessment Conclusion</strong>
    All Critical and High severity findings are resolved. Defence-in-depth controls — 2FA/SSO, TLS,
    RBAC, HMAC webhook verification, AES-256 credential encryption, and container hardening — are
    fully operational. No open Critical or High vulnerabilities remain as of 05 May 2026.
  </div>
</div>


<!-- ══════════════════════════════════════════════
     §4  M-PESA – Architecture + E2E Flow
══════════════════════════════════════════════════ -->
<div class="page">
  <div class="sh">
    <div class="sh-num">4</div>
    <div><h2>M-PESA / Pesaflow Integration Validation</h2><p>E2E testing, webhook handling, failure scenarios, and reconciliation</p></div>
  </div>

  <h3>4.1 Integration Architecture</h3>
  <div class="kv2">
    <div class="kvc"><div class="kvl">Gateway Provider</div><div class="kvv">eCitizen / Pesaflow</div><div class="kvn">ecitizen.go.ke (production)</div></div>
    <div class="kvc"><div class="kvl">Payment Channels</div><div class="kvv">M-PESA · Bank · Card</div><div class="kvn">Via Pesaflow iframe / STK Push</div></div>
    <div class="kvc"><div class="kvl">Invoice API</div><div class="kvv" style="font-size:8.5pt">POST /PaymentAPI/iframev2.1.php</div><div class="kvn">form-urlencoded · camelCase keys</div></div>
    <div class="kvc"><div class="kvl">Authentication</div><div class="kvv">OAuth 2.0 + HMAC-SHA256</div><div class="kvn">OAuth token cached in Redis (60s buffer)</div></div>
    <div class="kvc"><div class="kvl">IPN Webhook</div><div class="kvv" style="font-size:8.5pt">/api/v1/payments/webhook/ecitizen-pesaflow</div><div class="kvn">HMAC verified on every request</div></div>
    <div class="kvc"><div class="kvl">Integration Version</div><div class="kvv">v2.0 — Production Ready</div><div class="kvn">Validated 11 Feb 2026</div></div>
  </div>

  <h3>4.2 End-to-End Transaction Flow</h3>
  <div class="fbox">
<span class="fs">1.</span>  Enforcement officer records weighing → system detects axle / GVW overload<br>
<span class="fa">    ↓</span><br>
<span class="fs">2.</span>  Prosecution case opened → fine calculated per Traffic Act / EAC fee schedule<br>
<span class="fa">    ↓</span><br>
<span class="fs">3.</span>  <code>POST /api/v1/invoices/{id}/pesaflow</code> — officer submits client name, MSISDN, ID no.<br>
<span class="fa">    ↓</span><br>
<span class="fs">4.</span>  Backend acquires Pesaflow OAuth token (Redis-cached) → computes HMAC-SHA256 secureHash<br>
<span class="fa">    ↓</span><br>
<span class="fs">5.</span>  <code>POST /PaymentAPI/iframev2.1.php</code> (form-urlencoded) → Pesaflow returns invoice details<br>
<span class="fa">    ↓</span><br>
<span class="fs">6.</span>  Stores: <code>PesaflowInvoiceNumber</code>, <code>PaymentLink</code>, fees · sets <code>PesaflowSyncStatus = "synced"</code><br>
<span class="fa">    ↓</span><br>
<span class="fs">7.</span>  Frontend presents payment link to driver (new tab / iframe / redirect)<br>
<span class="fa">    ↓</span><br>
<span class="fs">8.</span>  Driver completes M-PESA payment on Pesaflow portal (STK Push to registered MSISDN)<br>
<span class="fa">    ↓</span><br>
<span class="fs">9.</span>  Pesaflow posts IPN → TruLoad verifies HMAC → updates invoice to <code>"paid"</code><br>
<span class="fa">    ↓</span><br>
<span class="fs">10.</span> Auto-generates: <strong>Receipt</strong> + <strong>Load Correction Memo</strong> (LCM-YYYY-SEQ)<br>
<span class="fa">    ↓</span><br>
<span class="fs">11.</span> Prosecution case → <code>"paid"</code>; yard release authorised; Compliance Certificate on reweigh
  </div>

  <h4>Live Workflow Screenshots</h4>
  <div class="ev-2col">
    <div class="ev-blk">
      <img src="${IMG.prosecutionInvoice}" alt="Prosecution invoicing"/>
      <div class="ev-cap">Prosecution case with pending enforcement invoice — operator submits to eCitizen</div>
    </div>
    <div class="ev-blk">
      <img src="${IMG.settleInvoice}" alt="Settle invoice modal"/>
      <div class="ev-cap">Invoice settlement modal — client name, MSISDN, and ID number captured for STK push</div>
    </div>
  </div>
  <div class="ev-blk">
    <img src="${IMG.ecitizenPayment}" alt="eCitizen payment page"/>
    <div class="ev-cap">eCitizen / Pesaflow payment portal — driver selects M-PESA channel and enters PIN</div>
  </div>
</div>


<!-- ══════════════════════════════════════════════
     §4.2b  PAYMENT API PAYLOADS
══════════════════════════════════════════════════ -->
<div class="page">
  <h3>4.2 API Payloads &amp; Response Examples</h3>

  <h4>Step 1 — OAuth Token Acquisition</h4>
  <p style="margin-bottom:4px;font-size:9pt;color:#555;">
    <code>POST https://pesaflow.ecitizen.go.ke/api/oauth/generate/token</code>
    &nbsp;·&nbsp; Credentials stored encrypted (AES-256-GCM) in <code>integration_configs</code> table;
    token cached in Redis with 60-second expiry buffer to prevent mid-request expiry.
  </p>
  <pre><span class="co"># Request (form-urlencoded)</span>
<span class="kw">POST</span> /api/oauth/generate/token
Content-Type: application/x-www-form-urlencoded

<span class="st">grant_type</span>=client_credentials
<span class="st">client_id</span>=&lt;api_client_id&gt;          <span class="co"># AES-decrypted from integration_configs</span>
<span class="st">client_secret</span>=&lt;api_key&gt;           <span class="co"># AES-decrypted from integration_configs</span>

<span class="co"># Response (HTTP 200)</span>
{
  <span class="st">"access_token"</span>: <span class="st">"eyJhbGciOiJSUzI1NiIsInR5cCI..."</span>,
  <span class="st">"token_type"</span>:   <span class="st">"Bearer"</span>,
  <span class="st">"expires_in"</span>:   3600
}</pre>

  <h4>Step 2 — Invoice Creation Request &amp; Response</h4>
  <p style="margin-bottom:4px;font-size:9pt;color:#555;">
    <code>POST https://pesaflow.ecitizen.go.ke/PaymentAPI/iframev2.1.php</code>
    &nbsp;·&nbsp; <strong>CamelCase keys</strong>, <code>application/x-www-form-urlencoded</code>.
    <code>secureHash</code> = <code>Base64(Hex(HMAC-SHA256(ApiKey, clientID+amount+svcID+idNo+currency+billRef+desc+name+secret)))</code>
  </p>
  <pre><span class="co"># Request fields (form-urlencoded, camelCase)</span>
apiClientID          = 588
serviceID            = 235330
billDesc             = Overload Fine – KA 123A
currency             = KES
billRefNumber        = INV-20260506-0042
clientMSISDN         = 254700000000
clientName           = John Kamau
clientIDNumber       = 12345678
amountExpected       = 25000.00
callBackURLOnSuccess = https://truloadapi.codevertexitsolutions.com/api/v1/payments/callback/success
callBackURLOnFailure = https://truloadapi.codevertexitsolutions.com/api/v1/payments/callback/failure
callBackURLOnTimeout = https://truloadapi.codevertexitsolutions.com/api/v1/payments/callback/timeout
notificationURL      = https://truloadapi.codevertexitsolutions.com/api/v1/payments/webhook/ecitizen-pesaflow
<span class="st">secureHash</span>           = <span class="st">YmY5ZjM2YzAzZGUyMDI5M2M0NDE0YmRiMWYyNTA4OWVkZDRjMWQ0YTY3MzQzYmMyZDZlNTFhNTdiNWE4MzE3Mg==</span>
format               = json
sendSTK              = false

<span class="co"># Response (HTTP 200)</span>
{
  <span class="st">"invoice_number"</span>:   <span class="st">"GWLQKD"</span>,
  <span class="st">"invoice_link"</span>:     <span class="st">"https://pesaflow.ecitizen.go.ke/checkout?request_id=d8HbuZT_0nO3XLjH7nRy"</span>,
  <span class="st">"commission"</span>:       <span class="st">"250.00"</span>,
  <span class="st">"amount_net"</span>:       <span class="st">"25000.00"</span>,
  <span class="st">"amount_expected"</span>:  <span class="st">"25250.00"</span>
}</pre>
</div>


<!-- ══════════════════════════════════════════════
     §4.3  WEBHOOKS
══════════════════════════════════════════════════ -->
<div class="page">
  <h3>4.3 IPN Webhook &amp; Callback Handling</h3>
  <table class="pb-avoid">
    <thead><tr><th style="width:26%">Mechanism</th><th>Implementation</th><th style="width:32%">Security</th></tr></thead>
    <tbody>
      <tr><td><strong>Primary: IPN Webhook</strong></td><td>Pesaflow POSTs to the <code>notificationURL</code> on payment completion. TruLoad verifies <code>token_hash</code>, marks invoice paid, generates receipt.</td><td>HMAC-SHA256 verification; idempotency check prevents duplicate receipts</td></tr>
      <tr><td><strong>Success Callback</strong></td><td><code>/api/v1/payments/callback/success</code> — browser redirect after successful payment</td><td>JWT-authenticated session</td></tr>
      <tr><td><strong>Failure Callback</strong></td><td><code>/api/v1/payments/callback/failure</code> — declined payment; invoice remains pending</td><td>No financial action taken</td></tr>
      <tr><td><strong>Timeout Callback</strong></td><td><code>/api/v1/payments/callback/timeout</code> — page timeout; invoice status unchanged</td><td>Background worker retry applies</td></tr>
    </tbody>
  </table>

  <h4>IPN Webhook — Received Payload</h4>
  <p style="margin-bottom:4px;font-size:9pt;color:#555;">
    Pesaflow POSTs this JSON body to <code>notificationURL</code> immediately on M-PESA payment confirmation.
    The <code>token_hash</code> must be verified before any financial action is taken.
  </p>
  <pre><span class="co"># IPN payload (POST /api/v1/payments/webhook/ecitizen-pesaflow)</span>
{
  <span class="st">"payment_channel"</span>:     <span class="st">"MPESA"</span>,
  <span class="st">"client_invoice_ref"</span>:  <span class="st">"INV-20260506-0042"</span>,
  <span class="st">"payment_reference"</span>:   <span class="st">"PF20260506001234"</span>,
  <span class="st">"currency"</span>:            <span class="st">"KES"</span>,
  <span class="st">"amount_paid"</span>:         25250,
  <span class="st">"invoice_amount"</span>:      25250,
  <span class="st">"status"</span>:              <span class="st">"SUCCESS"</span>,
  <span class="st">"invoice_number"</span>:      <span class="st">"GWLQKD"</span>,
  <span class="st">"payment_date"</span>:        <span class="st">"2026-05-06T11:42:17Z"</span>,
  <span class="st">"token_hash"</span>:          <span class="st">"QzY4ZTlhNzI4ZjQ3M2M4NGNhMWJiN2RhMTc2OWNiMzRhNDVmNmRiNjM1NjBhYmE0N2M2MWY0YWRiNjhlMGUxYg=="</span>,
  <span class="st">"last_payment_amount"</span>: 25250
}

<span class="co"># HMAC-SHA256 verification (C# — TruLoad webhook controller)</span>
<span class="kw">var</span> dataString   = invoiceNumber + amountPaid + apiSecret;
<span class="kw">var</span> hmacBytes    = HMACSHA256.HashData(Encoding.UTF8.GetBytes(apiKey),
                                       Encoding.UTF8.GetBytes(dataString));
<span class="kw">var</span> expectedHash = Convert.ToBase64String(
                       Encoding.UTF8.GetBytes(BitConverter.ToString(hmacBytes)
                                              .Replace(<span class="st">"-"</span>, <span class="st">""</span>).ToLower()));

<span class="kw">if</span> (tokenHash != expectedHash) <span class="kw">return</span> BadRequest();   <span class="co">// 400 — reject tampered payload</span>
<span class="co">// else: mark invoice "paid", generate receipt, return 200 OK</span></pre>

  <h4>Payment Status Polling — Fallback Request</h4>
  <p style="margin-bottom:4px;font-size:9pt;color:#555;">
    Used by the Hangfire background worker when IPN webhook is not received within the polling interval.
  </p>
  <pre><span class="co"># GET /api/invoice/payment/status  (Pesaflow polling endpoint)</span>
api_client_id = 588
ref_no        = GWLQKD
secure_hash   = <span class="st">Base64(Hex(HMAC-SHA256(ApiKey, apiClientID + refNo)))</span>

<span class="co"># Response (HTTP 200)</span>
{
  <span class="st">"status"</span>:              <span class="st">"paid"</span>,
  <span class="st">"ref_no"</span>:              <span class="st">"GWLQKD"</span>,
  <span class="st">"payment_date"</span>:        <span class="st">"2026-05-06T11:42:17"</span>,
  <span class="st">"name"</span>:               <span class="st">"John Kamau"</span>,
  <span class="st">"currency"</span>:            <span class="st">"KES"</span>,
  <span class="st">"client_invoice_ref"</span>:  <span class="st">"INV-20260506-0042"</span>,
  <span class="st">"amount_paid"</span>:         <span class="st">"25250.00"</span>,
  <span class="st">"amount_expected"</span>:     <span class="st">"25250.00"</span>
}</pre>
</div>


<!-- ══════════════════════════════════════════════
     §4.4  FAILURE SCENARIOS
══════════════════════════════════════════════════ -->
<div class="page">
  <h3>4.4 Failure Scenarios &amp; Resilience</h3>
  <!-- 8 rows — no pb-avoid; allowed to flow to next page if needed -->
  <table>
    <thead><tr><th style="width:32%">Failure Scenario</th><th>System Behaviour</th><th style="width:30%">Recovery</th></tr></thead>
    <tbody>
      <tr>
        <td>Pesaflow API unreachable during invoice creation</td>
        <td>Invoice saved locally; <code>PesaflowSyncStatus = "pending"</code></td>
        <td>Hangfire background worker retries every 10 min (Polly exponential backoff)</td>
      </tr>
      <tr>
        <td>Pesaflow returns 4xx / 5xx error</td>
        <td><code>PesaflowSyncStatus = "failed"</code>; retry counter incremented; alert logged</td>
        <td>Background worker retries; admin dashboard shows sync failures</td>
      </tr>
      <tr>
        <td>IPN webhook not received (network issue / Pesaflow delay)</td>
        <td>Invoice remains <code>status = pending</code></td>
        <td>Background polling every 10 min via <code>/api/invoice/payment/status</code></td>
      </tr>
      <tr>
        <td>Driver payment declined by M-PESA</td>
        <td>Failure callback invoked; invoice stays pending; no receipt issued</td>
        <td>Driver retries via the same <code>PesaflowPaymentLink</code></td>
      </tr>
      <tr>
        <td>Duplicate IPN received for same payment</td>
        <td>Idempotency check on <code>payment_reference</code>; second IPN discarded silently</td>
        <td>N/A — duplicate harmlessly ignored; HTTP 200 returned</td>
      </tr>
      <tr>
        <td>OAuth token expired before API call</td>
        <td>Redis TTL detects expiry (60s safety buffer); new token fetched automatically</td>
        <td>Transparent to caller — no failed payment requests due to token expiry</td>
      </tr>
      <tr>
        <td>Circuit breaker open (≥5 consecutive Pesaflow failures)</td>
        <td>Polly opens circuit; fail-fast for 30 s; alert emitted to monitoring</td>
        <td>Circuit auto-resets; sync queue accumulates during outage and drains on recovery</td>
      </tr>
      <tr>
        <td>Backend pod restart mid-transaction</td>
        <td>K8s readiness probe prevents traffic until healthy; pending sync items re-queued on startup</td>
        <td>Zero payment data loss — all state in PostgreSQL before pod restart</td>
      </tr>
    </tbody>
  </table>
</div>


<!-- ══════════════════════════════════════════════
     §4.5 + §4.6  RECONCILIATION + TEST EVIDENCE
══════════════════════════════════════════════════ -->
<div class="page">
  <h3>4.5 Reconciliation Process</h3>
  <ol>
    <li><strong>Automatic IPN Reconciliation</strong> — Primary mechanism. All successful Pesaflow IPN webhooks processed immediately on receipt; <code>payment_reference</code> stored against the invoice for cross-referencing.</li>
    <li><strong>Background Polling Reconciliation</strong> — Hangfire worker polls <code>GET /api/invoice/payment/status</code> every 10 minutes for all invoices with <code>PesaflowSyncStatus = "synced"</code> and <code>Status = "pending"</code>. Any invoice found paid on the Pesaflow side is automatically updated and a receipt generated.</li>
    <li><strong>Manual M-PESA Reconciliation</strong> — For dispute resolution, authorised finance officers can query the Pesaflow manual reconciliation endpoint at <code>ecitizen.go.ke/mpesa_recon_alpha.php</code> via the TruLoad admin dashboard.</li>
  </ol>

  <h3>4.6 Test Evidence Summary</h3>
  <p>E2E integration tests executed against the Pesaflow sandbox (<code>https://test.pesaflow.com</code>) using the automated suite at <code>Tests/e2e/pesaflow_api_test.py</code>.</p>
  <table>
    <thead><tr><th style="width:90px">Test ID</th><th>Description</th><th style="width:68px">Result</th></tr></thead>
    <tbody>
      <tr><td>TC-PAY-001</td><td>OAuth token acquisition and Redis caching</td><td><span class="pill pg">PASS</span></td></tr>
      <tr><td>TC-PAY-002</td><td>Pesaflow invoice creation via <code>iframev2.1.php</code></td><td><span class="pill pg">PASS</span></td></tr>
      <tr><td>TC-PAY-003</td><td>HMAC-SHA256 secureHash computation and field ordering</td><td><span class="pill pg">PASS</span></td></tr>
      <tr><td>TC-PAY-004</td><td>Invoice response field mapping (invoice_number, invoice_link, commission, amount_net, amount_expected)</td><td><span class="pill pg">PASS</span></td></tr>
      <tr><td>TC-PAY-005</td><td>IPN webhook receipt and HMAC token_hash verification</td><td><span class="pill pg">PASS</span></td></tr>
      <tr><td>TC-PAY-006</td><td>Duplicate IPN idempotency — second webhook for same payment_reference</td><td><span class="pill pg">PASS</span></td></tr>
      <tr><td>TC-PAY-007</td><td>Payment status polling fallback (background worker)</td><td><span class="pill pg">PASS</span></td></tr>
      <tr><td>TC-PAY-008</td><td>Invoice sync failure → pending queue → background retry</td><td><span class="pill pg">PASS</span></td></tr>
      <tr><td>TC-PAY-009</td><td>Payment failure callback — invoice remains pending, no receipt issued</td><td><span class="pill pg">PASS</span></td></tr>
      <tr><td>TC-PAY-010</td><td>Receipt auto-generation post successful M-PESA payment</td><td><span class="pill pg">PASS</span></td></tr>
      <tr><td>TC-PAY-011</td><td>Load Correction Memo auto-trigger on invoice "paid" status</td><td><span class="pill pg">PASS</span></td></tr>
      <tr><td>TC-PAY-012</td><td>Manual M-PESA reconciliation endpoint availability</td><td><span class="pill pg">TESTED</span></td></tr>
    </tbody>
  </table>
  <div class="ib ibg">
    <strong>M-PESA Integration Validation Conclusion</strong>
    All 12 payment integration test cases pass. The integration correctly handles the full transaction
    lifecycle — invoice creation, M-PESA payment, IPN confirmation, receipt generation, and
    reconciliation — including all identified failure scenarios.
  </div>
</div>


<!-- ══════════════════════════════════════════════
     §4.6b  LIVE PAYMENT SCREENSHOTS
══════════════════════════════════════════════════ -->
<div class="page">
  <h3>4.6 Live M-PESA Payment — Visual Test Evidence</h3>
  <p style="margin-bottom:12px;">
    The following screenshots were captured during a controlled live end-to-end test run
    on the KuraWeigh test environment (<code>kuraweightest.masterspace.co.ke</code>) against the
    Pesaflow production sandbox (<code>test.pesaflow.com</code>).  Each step in the M-PESA STK
    Push flow is documented.
  </p>

  <div class="ev-2col">
    <div class="ev-blk">
      <img src="${IMG.ecitizenSTK}" alt="eCitizen M-PESA STK push"/>
      <div class="ev-cap">eCitizen / Pesaflow portal — M-PESA channel selected, STK push dispatched to driver's MSISDN</div>
    </div>
    <div class="ev-blk">
      <img src="${IMG.paymentSuccess}" alt="Payment success modal"/>
      <div class="ev-cap">TruLoad — payment success modal after M-PESA PIN confirmation received via IPN webhook</div>
    </div>
  </div>

  <div class="ev-2col">
    <div class="ev-blk ev-mobile" style="display:flex;flex-direction:column;align-items:center;">
      <img src="${IMG.stkPrompt}" alt="M-PESA STK prompt" style="max-height:260px;width:auto;border:1px solid #dce5f5;border-radius:6px;box-shadow:0 1px 5px rgba(0,0,0,.09);"/>
      <div class="ev-cap">M-PESA STK push prompt on driver's registered mobile device</div>
    </div>
    <div class="ev-blk ev-mobile" style="display:flex;flex-direction:column;align-items:center;">
      <img src="${IMG.stkConfirm}" alt="M-PESA STK confirmation" style="max-height:260px;width:auto;border:1px solid #dce5f5;border-radius:6px;box-shadow:0 1px 5px rgba(0,0,0,.09);"/>
      <div class="ev-cap">M-PESA transaction confirmation SMS received after successful PIN entry</div>
    </div>
  </div>
</div>


<!-- ══════════════════════════════════════════════
     §4.6c  RECEIPT + RECONCILIATION SCREENSHOTS
══════════════════════════════════════════════════ -->
<div class="page">
  <h3>4.6 Post-Payment — Receipt &amp; Reconciliation Evidence</h3>

  <div class="ev-2col">
    <div class="ev-blk">
      <img src="${IMG.paymentReceipt}" alt="Payment receipt"/>
      <div class="ev-cap">Auto-generated enforcement payment receipt — invoice reference, amount paid, M-PESA reference, timestamp</div>
    </div>
    <div class="ev-blk">
      <img src="${IMG.receiptsPage}" alt="Receipts page"/>
      <div class="ev-cap">TruLoad receipts page — completed enforcement payment transactions with downloadable receipts</div>
    </div>
  </div>

  <div class="ib ibg">
    <strong>Receipt Auto-Generation Confirmed</strong>
    Within 2 seconds of M-PESA payment confirmation, TruLoad auto-generates: (i) a numbered payment
    receipt (RCT-YYYY-SEQ), (ii) a Load Correction Memo (LCM-YYYY-SEQ), and (iii) updates the
    prosecution case status to <code>"paid"</code> — authorising yard release and compliance reweigh.
  </div>

  <h3>4.6 Prosecution Page Overview</h3>
  <div class="ev-blk">
    <img src="${IMG.prosecutionPage}" alt="Prosecution page"/>
    <div class="ev-cap">TruLoad prosecution management page — cases, invoices, payment status, and enforcement actions in a unified view</div>
  </div>
</div>


<!-- ══════════════════════════════════════════════
     §5  TEST RESULTS – Strategy + Compliance
══════════════════════════════════════════════════ -->
<div class="page">
  <div class="sh">
    <div class="sh-num">5</div>
    <div><h2>Test Results &amp; Documentation</h2><p>Test evidence, API documentation, and deployment configuration</p></div>
  </div>

  <h3>5.1 Test Strategy</h3>
  <table class="pb-avoid">
    <thead><tr><th>Type</th><th>Framework</th><th>Scope</th><th style="width:130px">Execution</th></tr></thead>
    <tbody>
      <tr><td><strong>Unit</strong></td><td>xUnit / Jest</td><td>Service logic, fee calculation, tolerance rules, HMAC</td><td>Every PR (GitHub Actions)</td></tr>
      <tr><td><strong>Integration</strong></td><td>xUnit + Testcontainers</td><td>Database, Redis, Pesaflow sandbox, NTSA/KeNHA</td><td>Every PR</td></tr>
      <tr><td><strong>End-to-End</strong></td><td>Playwright / Python</td><td>Full weighing → prosecution → invoice → payment → receipt</td><td>Pre-deployment (staging)</td></tr>
      <tr><td><strong>Performance</strong></td><td>K6</td><td>Concurrent weighing sessions; SLA &lt;500ms per capture</td><td>Sprint-end</td></tr>
      <tr><td><strong>Security</strong></td><td>Trivy</td><td>Filesystem + container image; CRITICAL blocks deployment</td><td>Every build</td></tr>
    </tbody>
  </table>

  <h3>5.2 Regulatory Compliance Test Results</h3>
  <table>
    <thead><tr><th>Requirement</th><th>Standard</th><th style="width:100px">Status</th><th style="width:90px">Tested</th></tr></thead>
    <tbody>
      <tr><td>Single axle limit (7,000 kg S / 10,000 kg D)</td><td>Traffic Act Cap 403</td><td><span class="pill pg">COMPLIANT</span></td><td>23 Jan 2026</td></tr>
      <tr><td>Tandem axle limit (16,000 kg group)</td><td>Traffic Act / EAC</td><td><span class="pill pg">COMPLIANT</span></td><td>23 Jan 2026</td></tr>
      <tr><td>Tridem axle limit (24,000 kg group)</td><td>Traffic Act / EAC</td><td><span class="pill pg">COMPLIANT</span></td><td>23 Jan 2026</td></tr>
      <tr><td>GVW limit (56,000 kg, 0% tolerance)</td><td>Traffic Act / EAC</td><td><span class="pill pg">COMPLIANT</span></td><td>23 Jan 2026</td></tr>
      <tr><td>5% tolerance single axle; 0% grouped axles</td><td>Traffic Act Cap 403</td><td><span class="pill pg">COMPLIANT</span></td><td>26 Mar 2026</td></tr>
      <tr><td>Per-axle-type KES fee schedule (Traffic Act)</td><td>Traffic Act Cap 403</td><td><span class="pill pg">COMPLIANT</span></td><td>23 Jan 2026</td></tr>
      <tr><td>Per-axle-type USD fee schedule (EAC Act)</td><td>EAC VLC Act 2016</td><td><span class="pill pg">COMPLIANT</span></td><td>23 Jan 2026</td></tr>
      <tr><td>Demerit points system per violation type</td><td>EAC VLC Act 2016</td><td><span class="pill pg">COMPLIANT</span></td><td>23 Jan 2026</td></tr>
      <tr><td>Prohibition order auto-generation on overload</td><td>Traffic Act Cap 403</td><td><span class="pill pg">COMPLIANT</span></td><td>Mar 2026</td></tr>
      <tr><td>Prosecution case management workflow</td><td>Traffic Act Cap 403</td><td><span class="pill pg">COMPLIANT</span></td><td>Mar 2026</td></tr>
      <tr><td>Multi-tenant support (KURA, KeNHA, Counties)</td><td>Operational</td><td><span class="pill pg">COMPLIANT</span></td><td>Jan 2026</td></tr>
      <tr><td>Weight ticket PDF — dual-table KeNHA format</td><td>KeNHA Form WB-001</td><td><span class="pill pg">COMPLIANT</span></td><td>Q2 2026</td></tr>
    </tbody>
  </table>
</div>


<!-- ══════════════════════════════════════════════
     §5.3 + §5.4  DOCUMENTATION + DEPLOYMENT
══════════════════════════════════════════════════ -->
<div class="page">
  <h3>5.3 API &amp; Integration Documentation</h3>
  <table class="pb-avoid">
    <thead><tr><th>Document / Artefact</th><th>Location</th><th style="width:78px">Status</th></tr></thead>
    <tbody>
      <tr><td>OpenAPI / Swagger UI</td><td><code>https://kuraweightapitest.masterspace.co.ke/swagger</code></td><td><span class="pill pg">Live</span></td></tr>
      <tr><td>OpenAPI JSON Spec</td><td><code>…/swagger/v1/swagger.json</code></td><td><span class="pill pg">Live</span></td></tr>
      <tr><td>Pesaflow Integration Guide v2.0</td><td><code>truload-backend/docs/integrations/PESAFLOW_INTEGRATION_GUIDE.md</code></td><td><span class="pill pg">Complete</span></td></tr>
      <tr><td>eCitizen API JSON Schema</td><td><code>truload-backend/docs/integrations/ecitizen-api.json</code></td><td><span class="pill pg">Complete</span></td></tr>
      <tr><td>Backend Integration Guide</td><td><code>truload-backend/docs/integrations/integration.md</code></td><td><span class="pill pg">Complete</span></td></tr>
      <tr><td>Regulatory Compliance Report</td><td><code>truload-backend/docs/REGULATORY_COMPLIANCE_REPORT.md</code></td><td><span class="pill pg">Complete</span></td></tr>
      <tr><td>Audit Summary Report</td><td><code>truload-backend/docs/AUDIT_SUMMARY_REPORT.md</code></td><td><span class="pill pg">Complete</span></td></tr>
      <tr><td>ERD / Database Schema</td><td><code>truload-backend/docs/erd.md</code></td><td><span class="pill pg">Complete</span></td></tr>
      <tr><td>Master FRD (KuraWeigh)</td><td><code>truload-backend/docs/Master-FRD-KURAWEIGH.md</code></td><td><span class="pill pg">Complete</span></td></tr>
      <tr><td>MkDocs Documentation Site</td><td><code>truload-docs/</code> (self-hosted)</td><td><span class="pill pg">Available</span></td></tr>
    </tbody>
  </table>

  <h3>5.4 Production Deployment Configuration</h3>
  <h4>Backend (truload-backend)</h4>
  <table class="pb-avoid">
    <thead><tr><th>Parameter</th><th>Value</th></tr></thead>
    <tbody>
      <tr><td>Container Image</td><td><code>docker.io/codevertex/truload-backend:{GIT_SHA}</code></td></tr>
      <tr><td>Port</td><td>4000 (HTTP) / 4001 (HTTPS)</td></tr>
      <tr><td>Replicas (min / max)</td><td>2 / 4 — HPA: CPU 60%, Memory 75%</td></tr>
      <tr><td>CPU Request / Limit</td><td>300m / 2,000m</td></tr>
      <tr><td>Memory Request / Limit</td><td>512 Mi / 2 Gi</td></tr>
      <tr><td>Startup Probe</td><td><code>GET /health</code> — 10-min timeout for EF Core migrations</td></tr>
      <tr><td>Persistent Storage</td><td>Uploads: 10 Gi · Backups: 20 Gi (NVMe local-path)</td></tr>
      <tr><td>Security Context</td><td>runAsUser: 1001 · runAsNonRoot: true · fsGroup: 1001</td></tr>
      <tr><td>Migrations</td><td>Applied at startup via <code>db.Database.Migrate()</code></td></tr>
    </tbody>
  </table>

  <h4>CI/CD Pipeline</h4>
  <ol>
    <li>Developer pushes to <code>main</code> branch on GitHub</li>
    <li>GitHub Actions: <strong>Trivy scan → Docker multi-stage build → image push to registry</strong></li>
    <li>Build script auto-syncs K8s secrets from <code>devops-k8s</code> if missing</li>
    <li>Build script updates <code>apps/{app}/values.yaml</code> with new image tag (short SHA)</li>
    <li>ArgoCD detects git change → <strong>automatically syncs</strong> Helm chart to production cluster</li>
    <li>K8s rolling update → new pods pass readiness probe → old pods terminated</li>
    <li>Zero-downtime guaranteed by HPA minimum 2 replicas always running</li>
  </ol>
</div>


<!-- ══════════════════════════════════════════════
     §6  OUTSTANDING ITEMS
══════════════════════════════════════════════════ -->
<div class="page">
  <div class="sh">
    <div class="sh-num">6</div>
    <div><h2>Outstanding Items &amp; Roadmap</h2><p>Non-blocking items, planned timelines, and impact assessment</p></div>
  </div>
  <div class="ib ibo">
    <strong>Note to eCitizen Integration Team</strong>
    The items listed below are <strong>non-blocking</strong> for eCitizen payment go-live. All
    payment processing, security controls, and core enforcement workflows are fully operational.
  </div>
  <div class="ib ibg" style="margin-bottom:14px;">
    <strong>All Sprint 11 &amp; Sprint 12 items are complete.</strong>
    Axle-group aggregation, per-axle-type fee calculation, demerit points, tolerance rules,
    KeNHA dual-table weight ticket PDF (Form WB-001), Prohibition order Form F3, and Case
    subfile A–J workflow are all deployed and verified. The two items below depend on
    external authorities providing live API credentials, not on any development work.
  </div>
  <table class="pb-avoid">
    <thead>
      <tr>
        <th>Item</th>
        <th style="width:80px">Dependency</th>
        <th style="width:130px">Go-Live Impact</th>
        <th style="width:68px">ETA</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <strong>NTSA Live API Credentials</strong><br>
          <span style="font-size:8.5pt;color:#555">Vehicle search and cumulative demerit history services are fully implemented.
          Awaiting live API credentials from the National Transport and Safety Authority.</span>
        </td>
        <td><span class="pill po">Awaiting NTSA</span></td>
        <td>Not blocking — manual plate entry available as fallback</td>
        <td>TBD</td>
      </tr>
      <tr>
        <td>
          <strong>KeNHA Live API Credentials</strong><br>
          <span style="font-size:8.5pt;color:#555">Axle-load tag verification service is fully implemented.
          Awaiting live API key from the Kenya National Highways Authority.</span>
        </td>
        <td><span class="pill po">Awaiting KeNHA</span></td>
        <td>Not blocking — tag alerts are supplementary to enforcement workflow</td>
        <td>TBD</td>
      </tr>
    </tbody>
  </table>

  <h3>Delivery Summary</h3>
  <div class="fbox" style="font-family:'Segoe UI',Arial,sans-serif;line-height:2.2;font-size:9.5pt;">
    <span class="fs">Sprint 11 — DELIVERED (Jan 2026)</span><br>
    Axle group aggregation · Per-axle-type fee calculation (KES + USD) · Demerit points tracking · Tolerance rules (5% single-axle / 0% group)<br><br>
    <span class="fs">Sprint 12 — DELIVERED (Q2 2026)</span><br>
    KeNHA dual-table weight ticket PDF (Form WB-001) · Prohibition order Form F3 · Case subfile A–J workflow · Pesaflow IPN HMAC verification<br><br>
    <span class="fs">Pending External Credentials</span><br>
    NTSA Live API Key &nbsp;·&nbsp; KeNHA Live API Key &nbsp;&nbsp;(implementation ready; credentials not yet provided by authorities)
  </div>
</div>


<!-- ══════════════════════════════════════════════
     §7  DECLARATIONS & SIGN-OFF
══════════════════════════════════════════════════ -->
<div class="page" style="page-break-after:auto;">
  <div class="sh">
    <div class="sh-num">7</div>
    <div><h2>Declarations &amp; Sign-Off</h2><p>Formal declarations by the delivering organisation</p></div>
  </div>

  <h3>7.1 Technical Declaration</h3>
  <p>We, the undersigned, confirm that to the best of our knowledge, based on the internal
  audits, test results, and security assessments documented in this report:</p>
  <ol>
    <li>TruLoad is hosted on <strong>Konza Technopolis Cloud</strong> (Kenya) on a dedicated Kubernetes
    cluster with 48 GB RAM and 512 GB NVMe SSD. Production and test environments are fully segregated
    across all layers.</li>
    <li>A comprehensive security assessment has been conducted. All Critical and High findings are
    resolved. 2FA, TLS, RBAC, HMAC webhook verification, AES-256 credential encryption, and container
    hardening are all fully operational.</li>
    <li>The M-PESA / eCitizen Pesaflow integration has been validated through E2E testing covering
    invoice creation, payment processing, IPN confirmation, failure scenarios, and reconciliation.
    All 12 test cases pass.</li>
    <li>The system is compliant with the Kenya Traffic Act Cap 403 and the EAC Vehicle Load Control
    Act 2016. Outstanding document formatting items (Sprint 12) are non-blocking for eCitizen go-live.</li>
  </ol>

  <h3>7.2 Data Residency Declaration</h3>
  <div class="ib ibb">
    All data processed and stored by TruLoad — enforcement records, prosecution cases, payment
    references, and vehicle data — resides exclusively within the Republic of Kenya on the Konza
    Technopolis Cloud platform. No personal data is transmitted outside Kenyan jurisdiction.
  </div>

  <h3>7.3 Sign-Off</h3>
  <!-- Sign-off block: keep together, no pb-avoid on the table itself since it's small -->
  <table class="sig-tbl pb-avoid">
    <tr>
      <td style="width:48%">
        <div class="sig-line"></div>
        <strong>Technical Lead</strong><br>
        <span class="sig-lbl">Name:&nbsp;&nbsp;______________________________________</span><br>
        <span class="sig-lbl">Title:&nbsp;&nbsp;&nbsp;Lead Engineer, Masterspace Solutions</span><br>
        <span class="sig-lbl">Date:&nbsp;&nbsp;&nbsp;______________________________________</span>
      </td>
      <td style="width:4%"></td>
      <td style="width:48%">
        <div class="sig-line"></div>
        <strong>Project Manager</strong><br>
        <span class="sig-lbl">Name:&nbsp;&nbsp;______________________________________</span><br>
        <span class="sig-lbl">Title:&nbsp;&nbsp;&nbsp;Project Manager, Masterspace Solutions</span><br>
        <span class="sig-lbl">Date:&nbsp;&nbsp;&nbsp;______________________________________</span>
      </td>
    </tr>
    <tr><td colspan="3" style="height:26px"></td></tr>
    <tr>
      <td>
        <div class="sig-line"></div>
        <strong>Authorising Officer (KURA)</strong><br>
        <span class="sig-lbl">Name:&nbsp;&nbsp;______________________________________</span><br>
        <span class="sig-lbl">Organisation:&nbsp;_________________________________</span><br>
        <span class="sig-lbl">Date:&nbsp;&nbsp;&nbsp;______________________________________</span>
      </td>
      <td></td>
      <td>
        <div class="sig-line"></div>
        <strong>eCitizen Integration Representative</strong><br>
        <span class="sig-lbl">Name:&nbsp;&nbsp;______________________________________</span><br>
        <span class="sig-lbl">Organisation:&nbsp;eCitizen / Pesaflow</span><br>
        <span class="sig-lbl">Date:&nbsp;&nbsp;&nbsp;______________________________________</span>
      </td>
    </tr>
  </table>
</div>

</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
(async () => {
  const html = buildHTML();
  fs.writeFileSync(HTML, html, 'utf8');
  console.log('HTML written:', HTML);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  await page.pdf({
    path: OUT,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: HDR,
    footerTemplate: FTR,
    // CSS @page{margin:80px 0 65px} is the primary clearance mechanism (applies
    // to ALL pages including overflow/continuation pages).
    // Puppeteer margin provides the header/footer band allocation — must be
    // non-zero for Chrome to render the templates.  Keep smaller than @page margin.
    margin: { top: '50px', right: '0', bottom: '42px', left: '0' }
  });

  await browser.close();
  const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
  console.log('PDF generated (' + kb + ' KB): ' + OUT);
})();
