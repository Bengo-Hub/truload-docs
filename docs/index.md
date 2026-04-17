# TruLoad

**TruLoad** is a multi-tenant weighbridge platform that serves two distinct use cases from a single codebase: **axle-load enforcement** for government agencies and **commercial weighing** for private-sector operations.

**Current version: v1.0.1**

---

## Two Platforms, One System

<div class="grid cards" markdown>

- :material-gavel: **Axle Load Enforcement**

    ---

    For government agencies (KURA, KeNHA) enforcing vehicle weight limits under the Kenya Traffic Act (Cap 403) and EAC Vehicle Load Control Act (2016).

    Captures weights, applies regulatory compliance rules, and manages the full downstream workflow: case register, prosecution, invoicing, M-PESA/eCitizen settlement, receipts, reweigh, and closure.

    [:octicons-arrow-right-24: Enforcement Guide](enforcement/)

- :material-factory: **Commercial Weighing**

    ---

    For factories, logistics companies, mining operations, and agricultural processors who need accurate weight-based billing and inventory management.

    Two-pass weighing (gross/tare), stored tare management, quality deductions, cargo-type configuration, and comprehensive tonnage reporting.

    [:octicons-arrow-right-24: Commercial Guide](commercial/)

</div>

## Components

`truload-backend`
: .NET 10 API. Compliance engine, case management, prosecution,
  invoicing, Pesaflow integration, audit log, background jobs.

`truload-frontend`
: Next.js web app. Station operator UI, supervisor dashboards,
  offline-first weighing capture, permission-gated navigation.

`TruConnect`
: Windows desktop bridge. Reads the physical scale over serial, TCP,
  UDP, or HTTP and streams weights to the browser over a local WebSocket.
  Distributed as a signed installer on
  [GitHub Releases](https://github.com/Bengo-Hub/TruConnect/releases).

`Transporter Portal`
: Self-service web interface for transporters and haulers. Cross-tenant
  weighing history, ticket downloads, fleet management, and subscription billing.

## Quick Start

<a class="md-button md-button--primary" href="enforcement/">:material-gavel: Enforcement Guide</a>
<a class="md-button md-button--primary" href="commercial/">:material-factory: Commercial Guide</a>
<a class="md-button" href="portal/">:material-truck: Transporter Portal</a>
<a class="md-button" href="technical/">:material-cog: Operations</a>
<a class="md-button" href="technical/api/swagger/">:material-api: API Reference</a>
<a class="md-button" href="https://kuraweighapitest.masterspace.co.ke/v1/docs/index.html">:material-open-in-new: Live Swagger</a>
<a class="md-button" href="testing/">:material-test-tube: Testing</a>

## Downloads

<a class="md-button" href="pdf/User-Manual.pdf">:material-file-pdf-box: User Guide (PDF)</a>
<a class="md-button" href="pdf/Technical-Operations-Manual.pdf">:material-file-pdf-box: Operations Guide (PDF)</a>
<a class="md-button" href="pdf/Client-Evidence-Pack.pdf">:material-file-pdf-box: Compliance Pack (PDF)</a>
<a class="md-button" href="https://github.com/Bengo-Hub/TruConnect/releases/latest">:material-download: TruConnect installer</a>

## Environments

| Environment | Backend API | Frontend | Docs |
|---|---|---|---|
| Test | `kuraweighapitest.masterspace.co.ke` | `kuraweightest.masterspace.co.ke` | `kuraweigh-docs.masterspace.co.ke` |
| Production | `truloadapi.codevertexitsolutions.com` | `truload.codevertexitsolutions.com` | `truload-docs.codevertexitsolutions.com` |
