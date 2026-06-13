# Design — Prostrolane card in "Naše služby"

**Date:** 2026-06-13
**Status:** Approved (pending spec review)
**Scope:** Add one new service card for Prostrolane to the `#sluzby` section of `index.html`.

## Goal

Surface Prostrolane as a fifth service in the "Naše služby" grid, linking to the existing dedicated `#prostrolane` therapy section. Today the grid lists four services (všeobecná/športová/poúrazová ortopédia, ultrasonografická diagnostika, ACP liečba, CHONDROPLUS injekcie); Prostrolane is the only therapy with its own section that is not represented in the grid.

## Approach

Add a single clickable card after the CHONDROPLUS card, mirroring the established clickable-card pattern used by ACP and CHONDROPLUS. No new CSS, no new JS, no new modal, no new asset.

Rejected alternatives:
- **Reorder / merge cards** to avoid a half-empty last row — adds churn for no real benefit; a lone card on the last row already matches how the grid behaves.
- **Combine CHONDROPLUS + Prostrolane into one "Kĺbové injekcie" card** — removes a working entry point and loses information.

## Change

**File:** `index.html`
**Location:** Inside `<section id="sluzby">` → `.container > .row`, immediately after the CHONDROPLUS `.col-lg-6.col-md-6.col-12.mb-4` block — i.e. between current lines 196 (closing `</div>` of the CHONDROPLUS col) and 198 (closing `</div>` of `.row`). The new block is inserted as a sibling of the existing four `.col-...` blocks.

**New markup (verbatim):**

```html
<div class="col-lg-6 col-md-6 col-12 mb-4">
    <a href="#prostrolane" class="text-decoration-none">
        <div class="service-card bg-white shadow-lg h-100">
            <div class="service-icon service-icon-img"><img src="img/syringe-512x512.webp" alt=""></div>
            <h3>Prostrolane</h3>
            <p>Vnútrokĺbová injekčná liečba s biomimetickými peptidmi a kyselinou hyalurónovou na zníženie bolesti a ochranu chrupavky.</p>
            <span class="service-link">Viac informácií <i class="bi-arrow-right"></i></span>
        </div>
    </a>
</div>
```

## Copy sourcing

Card description summarizes the canonical Prostrolane content in `docs/osteoporoza-a-peptidy.md`:
- Medical-device intra-articular injection for osteoarthritic joint pain and mobility.
- Carrier: hyaluronic acid (improves synovial-fluid viscoelasticity, lubrication, cushioning).
- Active: biomimetic peptides (Sustained Release Technology) with anti-inflammatory and cartilage-protective effects.

The one-line `<p>` distills this to "injekčná liečba s biomimetickými peptidmi a kyselinou hyalurónovou na zníženie bolesti a ochranu chrupavky" — faithful to source, no invented claims, Slovak typography preserved.

## Anchor target

`href="#prostrolane"` resolves to the existing section at `index.html:270`:

```html
<section class="section-padding therapy-section therapy-section--alt" id="prostrolane">
```

Template's existing nav/anchor-scroll behavior handles navigation. No JS changes.

## Visual / asset note

Card icon: `img/syringe-512x512.webp`, per explicit user choice. ⚠️ The adjacent CHONDROPLUS card already uses this same icon, so two consecutive cards will share an identical icon. This is a conscious trade-off accepted during design; a future iteration could swap one card's icon (e.g. to `img/prostrolane-800x800-removebg.png`) to differentiate. Out of scope for this change.

## Out of scope

- No new modal / term-trigger (Prostrolane section already handles its own content).
- No CSS changes (reuses `.service-card`, `.service-icon`, `.service-icon-img`, `.service-link`).
- No JS changes.
- No new image assets.
- No CHONDROPLUS icon swap.
- No reordering of existing cards.

## Acceptance criteria

1. `#sluzby` section contains five service cards.
2. Fifth card is titled "Prostrolane", uses `img/syringe-512x512.webp`, links to `#prostrolane`.
3. Card markup passes an HTML validity check (proper tag nesting, no orphan tags).
4. Clicking the card scrolls/navigates to the existing `#prostrolane` section.
5. No other sections of `index.html` are modified.
6. Slovak copy is faithful to `docs/osteoporoza-a-peptidy.md`, with correct diacritics.

## Risks

- **Icon duplication** with CHONDROPLUS card — accepted; see Visual / asset note.
- **Half-empty last grid row** (5 cards in 2-column grid) — pre-existing pattern behavior; acceptable.
