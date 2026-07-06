# Coach360 — Documentation

> **Purpose:** Entry point for all canonical Coach360 project documentation.  
> **Location:** `coach360_draft/docs/`  
> **Last reorganized:** June 2026

When docs conflict, resolve in this order:

1. **Product** → [`product/flows.md`](./product/flows.md)
2. **Open decisions** → [`product/stakeholder-questions.md`](./product/stakeholder-questions.md)
3. **Content model** → [`architecture/content-model.md`](./architecture/content-model.md)
4. **AI** → [`architecture/ai-integration.md`](./architecture/ai-integration.md)
5. **Tech stack** → [`architecture/tech-stack.md`](./architecture/tech-stack.md)
6. **Development best practices** → [`architecture/best-practices.md`](./architecture/best-practices.md)
7. **Frontend architecture** → [`architecture/frontend-architecture.md`](./architecture/frontend-architecture.md)
8. **UI design reference** → [`design/ui-reference.md`](./design/ui-reference.md)
9. **Delivery** → [`delivery/delivery-estimate.md`](./delivery/delivery-estimate.md)

---

## Folder structure

```
docs/
├── README.md                 ← you are here
├── product/
│   ├── flows.md              # 18 journeys, access matrix (canonical)
│   └── stakeholder-questions.md
├── architecture/
│   ├── tech-stack.md         # Single-stack architecture (Vite + Capacitor + SaaS)
│   ├── frontend-architecture.md  # Monorepo, FSD layers, repository pattern
│   ├── admin-deploy.md       # Admin web staging/production deploy
│   ├── mobile-deploy.md      # Mobile web (browser) staging/production on Vercel
│   ├── best-practices.md     # Client patterns & integration rules
│   ├── content-model.md      # CMS, packaging, uploads
│   └── ai-integration.md     # RAG, recommendations
├── design/
│   └── ui-reference.md       # UI tokens, primitives (source: packages/ui, App.jsx mock)
├── delivery/
│   └── delivery-estimate.md  # 172 h plan + quick reference (Appendix C)
└── prototype/
    └── README.md             # UI mock (apps/mobile) + slice-first story workflow
```

---

## Immutable resources

| Document | Description |
| --- | --- |
| [`product/flows.md`](./product/flows.md) | Product source of truth |
| [`product/stakeholder-questions.md`](./product/stakeholder-questions.md) | Open decisions (P0 blockers) |
| [`architecture/content-model.md`](./architecture/content-model.md) | Content entities, CMS/admin split |
| [`architecture/ai-integration.md`](./architecture/ai-integration.md) | AI recommendations, RAG |
| [`architecture/tech-stack.md`](./architecture/tech-stack.md) | Single-stack architecture and SaaS services |
| [`architecture/best-practices.md`](./architecture/best-practices.md) | Vite/Capacitor dev patterns and integrations |
| [`delivery/delivery-estimate.md`](./delivery/delivery-estimate.md) | Sole-developer delivery plan |

---

## Supporting docs

| Document | Description |
| --- | --- |
| [`prototype/README.md`](./prototype/README.md) | UI mock (`src/App.jsx`) — slice-first workflow, hardens into production |

**Active planning baseline:** **172 hours** (~22 working days, solo). See [`delivery/delivery-estimate.md`](./delivery/delivery-estimate.md).

---

## Topic → document map

| Topic | Primary doc |
| --- | --- |
| User journeys & tiers | `product/flows.md` |
| Open product questions | `product/stakeholder-questions.md` |
| Content packaging & uploads | `architecture/content-model.md` |
| Sanity vs admin dashboard | `architecture/content-model.md` |
| AI / RAG | `architecture/ai-integration.md` |
| Application stack (Vite + Capacitor) | `architecture/tech-stack.md` |
| Backend SaaS & integrations | `architecture/tech-stack.md` + `architecture/best-practices.md` |
| Effort & phases | `delivery/delivery-estimate.md` |
| Application UI & components | `prototype/README.md` + `design/ui-reference.md` |

---

## Publishing

Docs are published from this folder via **GitHub Pages** (source: branch `main`, path `/docs`). Pushes to `main` update the site automatically.

After adding or moving markdown files, run `npm run docs:manifest` (also runs on pre-commit) so `manifest.json` stays in sync for the doc viewer.

---

## Sync & change policy

1. **Product changes** → update `product/flows.md` first, then architecture docs.
2. **Resolved questions** → Decision Log in `stakeholder-questions.md`, then update flows/architecture.
3. **Estimate changes** → update `delivery/delivery-estimate.md` (including Appendix C).
4. **UI / component changes** → update `prototype/README.md` when data models or screens change; new stories follow slice-first workflow there.
5. **Stack changes** → update `architecture/tech-stack.md` first, then `best-practices.md`.

---

## External source files

| File | Status |
| --- | --- |
| `Coach360_Complete_Flows-latest.docx` | Not in repo — `product/flows.md` is canonical |
| `revised_estiamte.docx` | Referenced in delivery estimate |

---

*Index version: 2.0*
