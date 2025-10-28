# TruLoad Documentation

Welcome to the comprehensive documentation for **TruLoad** - the Intelligent Weighing and Enforcement Solution.

<div class="grid cards" markdown>

-   :material-rocket-launch:{ .lg .middle } __Getting Started__

    ---

    Quick start guide to get you up and running with TruLoad

    [:octicons-arrow-right-24: Get Started](getting-started/quick-start.md)

-   :material-book-open-variant:{ .lg .middle } __User Manual__

    ---

    Complete guide for end users and operators

    [:octicons-arrow-right-24: User Manual](user-manual/index.md)

-   :material-code-braces:{ .lg .middle } __Technical Docs__

    ---

    Architecture, API reference, and developer guides

    [:octicons-arrow-right-24: Technical Documentation](technical/index.md)

-   :material-test-tube:{ .lg .middle } __Testing__

    ---

    Testing strategies, guides, and reports

    [:octicons-arrow-right-24: Testing Documentation](testing/index.md)

</div>

## Overview

TruLoad is a cloud-hosted enforcement and weighing solution that enables roadside officers to:

- **Capture vehicle weights** using static, WIM, or axle weighing methods
- **Verify compliance** with EAC Vehicle Load Control Act (2016) or Kenya Traffic Act (Cap 403)
- **Manage enforcement actions** including prosecution, yard operations, and special releases
- **Generate comprehensive reports** and analytics
- **Integrate with external systems** like eCitizen, case management, and payment gateways

## Key Features

### :material-scale-balance: Weighing Module
Multi-mode weighing support (Static, WIM, Axle) with TruConnect integration, ANPR camera support, and offline capabilities.

### :material-gavel: Prosecution Module
Automated charging based on EAC or Traffic Act with document generation, invoice integration, and court escalation.

### :material-warehouse: Yard Management
Prohibition orders, redistribution workflows, offloading management, and compliance verification.

### :material-file-document-check: Special Release
Tolerance-based releases, permit verification, and manual authorization workflows.

### :material-chart-line: Reporting & Analytics
Real-time dashboards, customizable reports, and comprehensive analytics.

## Quick Links

| Documentation | Description |
|--------------|-------------|
| [Quick Start](getting-started/quick-start.md) | Get started in 5 minutes |
| [Installation](getting-started/installation.md) | Deploy TruLoad backend and frontend |
| [API Reference](technical/api/index.md) | REST API documentation |
| [Swagger UI](technical/api/swagger.md) | Interactive API explorer |
| [Database Schema](technical/architecture/database.md) | Complete database design |
| [Testing Guide](testing/index.md) | Testing strategies and examples |
| [FAQ](support/faq.md) | Frequently asked questions |

## System Requirements

### Backend
- .NET 8 SDK
- PostgreSQL 16+
- Redis 7+
- RabbitMQ 3.13+ (optional)

### Frontend
- Node.js 20+
- pnpm 8+
- Modern web browser (Chrome, Firefox, Safari, Edge)

### DevOps
- Docker 24+
- Kubernetes 1.28+
- Helm 3+
- ArgoCD 2.9+

## Support

- **Documentation**: [docs.truload.example.com](https://docs.truload.example.com)
- **API Status**: [status.truload.example.com](https://status.truload.example.com)
- **GitHub**: [github.com/Bengo-Hub/truload](https://github.com/Bengo-Hub/truload)
- **Email**: [support@truload.example.com](mailto:support@truload.example.com)

## License

TruLoad is proprietary software. See [LICENSE](https://github.com/Bengo-Hub/truload/blob/main/LICENSE) for details.

---

**Last Updated**: {{ git_revision_date_localized }}

