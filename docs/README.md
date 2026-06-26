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
6. **Delivery** → [`delivery/delivery-estimate.md`](./delivery/delivery-estimate.md)

---

## Folder structure

```
docs/
├── README.md                 ← you are here
├── product/
│   ├── flows.md              # 18 journeys, access matrix (canonical)
│   └── stakeholder-questions.md
├── architecture/
│   ├── tech-stack.md         # SaaS, third-party services
│   ├── content-model.md      # CMS, packaging, uploads
│   └── ai-integration.md     # RAG, recommendations
├── delivery/
│   └── delivery-estimate.md  # 172 h plan + quick reference (Appendix C)
├── commercial/
│   └── pricing-philippines.md
└── prototype/
    └── README.md             # UI mock only (non-canonical)
```

---

## Immutable resources

| Document | Description |
| --- | --- |
| [`product/flows.md`](./product/flows.md) | Product source of truth |
| [`product/stakeholder-questions.md`](./product/stakeholder-questions.md) | Open decisions (P0 blockers) |
| [`architecture/content-model.md`](./architecture/content-model.md) | Content entities, CMS/admin split |
| [`architecture/ai-integration.md`](./architecture/ai-integration.md) | AI recommendations, RAG |
| [`architecture/tech-stack.md`](./architecture/tech-stack.md) | Tech stack and SaaS |
| [`delivery/delivery-estimate.md`](./delivery/delivery-estimate.md) | Sole-developer delivery plan |

---

## Supporting docs

| Document | Description |
| --- | --- |
| [`commercial/pricing-philippines.md`](./commercial/pricing-philippines.md) | PH market pricing and client SaaS costs |
| [`prototype/README.md`](./prototype/README.md) | React + Vite + Capacitor UI prototype |

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
| Third-party SaaS | `architecture/tech-stack.md` |
| Effort & phases | `delivery/delivery-estimate.md` |
| Commercial pricing | `commercial/pricing-philippines.md` |
| Prototype UI | `prototype/README.md` |

---

## Sync & change policy

1. **Product changes** → update `product/flows.md` first, then architecture docs.
2. **Resolved questions** → Decision Log in `stakeholder-questions.md`, then update flows/architecture.
3. **Estimate changes** → update `delivery/delivery-estimate.md` (including Appendix C).
4. **Prototype only** → update `prototype/README.md`; never treat as product truth.

---

## External source files

| File | Status |
| --- | --- |
| `Coach360_Complete_Flows-latest.docx` | Not in repo — `product/flows.md` is canonical |
| `revised_estiamte.docx` | Referenced in delivery estimate |

---

*Index version: 2.0*
