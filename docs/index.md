# TruLoad

TruLoad is a weighbridge enforcement platform. It captures vehicle weights
from static, mobile, and multideck scales, applies the regulatory
compliance rules in the Kenya Traffic Act Cap 403 and the EAC Vehicle Load
Control Act 2016, and handles the full downstream workflow: case register,
prosecution, invoicing, M-PESA/eCitizen settlement, receipts, reweigh, and
closure.

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

## Where to start

<a class="md-button md-button--primary" href="user-manual/">:material-book-open-variant: User Guide</a>
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
