# Design — References section ("Čo o nás hovoria pacienti")

> Spec for a new on-page section showing patient testimonials as an auto-scrolling marquee.
> Brainstormed 2026-06-13. Implementation plan to follow via the `writing-plans` skill.

## Goal

Add a "What our clients say about us" section to the orthoam.sk single-page site. The section presents five patient references that build trust in the ambulance without slipping into a generic 5-star "review-site" aesthetic. The visual language mirrors the existing **Certifikácia** marquee so the two sections read as one system.

## Non-goals (out of scope)

- **No new navbar link** — the navbar already has 6 items (Domov, O nás, Lekár, Služby, Certifikácia, Kontakt); adding another would crowd it.
- **No external data source** — testimonials live directly in `index.html` (only 5, no need for JSON/JS lookup).
- **No schema.org / aggregate-rating markup** — inappropriate for draft copy and not honest without verified reviews.
- **No star ratings** — decided against in brainstorming; undermines the calm clinical tone.
- **No click interaction / lightbox** — cards are purely decorative (contrast with cert thumbs which expand).
- **No photos / avatars** — option C "minimal" card design.
- **No backend / form to collect new testimonials** — static marketing site.

## Content source

Five draft Slovak testimonials will be written by the implementer, each tied to a real service from `docs/ortho-am.md`:

1. **ACP liečba** — autológna kondicionovaná plazma
2. **CHONDROPLUS injekcie** — vnútrokĺbová aplikácia
3. **Ultrasonografická diagnostika** — napr. rameno / koleno
4. **Poúrazová ortopédia** — športový / úrazový stav
5. **Všeobecná konzultácia** — primárne vyšetrenie, prístup lekára

Each testimonial must:

- Be written in Slovak with proper diacritics and Slovak typography (`„…"` quotes, em dashes where appropriate).
- Sound like a real patient — short, specific, references the actual experience (timing, doctor's manner, outcome) rather than generic praise.
- Stay faithful to what the ambulance actually does — no invented services, hours, prices, or outcomes.
- Use the attribution format `— Meno I.` (first name + surname initial) followed by a service line. No full surnames, no locations (GDPR-friendly).
- Be marked in the HTML with `<!-- DRAFT – nahradiť skutočnou referenciou pred launchom -->` directly above each `<li>` so drafts cannot ship unnoticed.

These drafts are placeholders for MUDr. Majcher to review, edit, or replace with real patient references before the site goes live.

## Placement

Inserted as a new `<section>` between **Certifikácia** (`#certifikacia`) and **Objednávanie** (`#objednanie`). The narrative flow becomes: doctor → his credentials → what patients say → how to book.

Section anchor: `id="reference"` (semantic, **not** wired into the navbar — reachable by direct link / scroll only).

## Section header

- Eyebrow: `Naše reference` — small uppercase, primary-color, with the bottom underline motif from `.therapy-eyebrow`.
- Title: `Čo o nás hovoria pacienti`.
- Subtitle: one short muted line (e.g. *"Skúsenosti pacientov OrthoAM ambulancie."*).
- Layout: centered, same spacing rhythm as the Certifikácia heading (`.text-center mb-lg-5 mb-4`).

## Layout — testimonial marquee

Reuse the cert marquee pattern from `css/custom.css` (lines 148–233) but with **parallel** class names so the two sections can be tuned independently:

- `.ref-marquee` (parallel to `.cert-marquee`)
- `.ref-track` (parallel to `.cert-track`)
- `@keyframes ref-scroll` (parallel to `@keyframes cert-scroll`)

### Shared behaviour

- Full-bleed viewport: `width: 100vw; margin-left: calc(50% - 50vw);`
- Side fades via `mask-image` (same gradient as cert marquee).
- Track animates with `ref-scroll`, **duration ~55s linear infinite** (slower than certs — quotes must be readable, certs are visual).
- Track contents are duplicated in HTML (set of 5 repeated twice = 10 items) so the scroll loops seamlessly.
- `:hover` pauses the animation (`animation-play-state: paused`).
- `prefers-reduced-motion: reduce` fallback: `animation: none; flex-wrap: wrap; width: 100%; justify-content: center;` — testimonials remain readable, displayed as a wrapping grid.
- Gap between items: `1.25rem` (matches cert).

### Card design (minimal — "option C")

Each card is a `<li class="ref-item">` containing a `<figure class="ref-card">`:

```
┌─────────────────────────────┐
│                             │
│  „ACP liečba mi vrátila     │
│   pohyb bez bolesti.        │
│   Všetko bolo vysvetlené    │
│   trpezlivo, bez čakania."  │
│                             │
│  — Eva M.                   │
│  ACP liečba                 │
└─────────────────────────────┘
```

- Thin primary-color accent rule across the top — same `inset 0 2px 0 0 var(--primary-color)` shadow as `.cert-thumb`, so the two marquees share visual DNA.
- White card background (`var(--white-color)`), `border-radius: 0.4rem`, soft shadow matching cert thumb.
- Italic blockquote, `var(--p-color)`, light weight, `line-height: 1.5`, generous internal padding.
- Attribution row:
  - `— Eva M.` — em-dash prefix, bold, `var(--title-color)`.
  - Below it: service name in small uppercase, muted, with a 3px primary-color left border — reuses the `.therapy-figure-caption` motif.
- No hover scale on the card itself (unlike cert thumbs) — cards are not interactive.
- Fixed card width: **16rem** desktop (quotes need more room than cert scans). Mobile: narrower (see Responsive).

### Semantic markup

```html
<section class="section-padding" id="reference">
  <div class="container">
    <div class="row">
      <div class="col-12">
        <span class="therapy-eyebrow">Naše reference</span>
        <h2 class="text-center mb-lg-5 mb-4">Čo o nás hovoria pacienti</h2>
        <p class="text-center text-muted mb-5">Skúsenosti pacientov OrthoAM ambulancie.</p>
      </div>

      <div class="ref-marquee">
        <ul class="ref-track">
          <!-- DRAFT – nahradiť skutočnou referenciou pred launchom -->
          <li class="ref-item">
            <figure class="ref-card">
              <blockquote>„…"</blockquote>
              <figcaption>
                <span class="ref-author">— Eva M.</span>
                <span class="ref-service">ACP liečba</span>
              </figcaption>
            </figure>
          </li>
          <!-- …4 more, then the same 5 duplicated for seamless scroll… -->
        </ul>
      </div>
    </div>
  </div>
</section>
```

- `<blockquote>` + `<figcaption>` give the markup correct semantics without needing ARIA roles.
- No `role="carousel"` / `aria-roledescription` — there are no interactive controls, so carousel semantics would be misleading. Content is static text in the DOM and fully accessible.

## CSS strategy

A new block in `css/custom.css`, placed directly under the existing `CERTIFICATION` block (around line 233) so the relationship is visually obvious. The block defines:

1. `.ref-marquee` — same masking / full-bleed rules as `.cert-marquee`. Implemented as a **comma-separated shared selector** with `.cert-marquee` where rules are identical, plus a `.ref-marquee`-only block for the duration variable.
2. `.ref-track` — parallel rules to `.cert-track`, pointing at the `ref-scroll` keyframe with its own duration.
3. `.ref-item` — fixed width `16rem` (vs cert's `12.5rem`).
4. `.ref-card` — white background, accent-rule shadow (same inset as cert thumb), padding, radius.
5. `.ref-card blockquote` — italic, light color, line-height.
6. `.ref-card figcaption` — flex / block layout for author + service.
7. `.ref-author` — bold, title color.
8. `.ref-service` — small uppercase, muted, left-border accent (reuses the visual idea of `.therapy-figure-caption`).
9. `@keyframes ref-scroll` — identical to `cert-scroll` (kept separate so the two animations can diverge later without coupling).
10. Reduced-motion fallback inside the existing `@media (prefers-reduced-motion: reduce)` block — also wrap `.ref-track`.
11. Responsive overrides in the existing `@media screen and (max-width: 767px)` block — narrower `.ref-item` width (e.g. `13rem`), tighter padding.

**Where possible, share rules via grouped selectors** (`.cert-marquee, .ref-marquee { … }`) rather than duplicating. Where they must differ (duration, card width, internal card layout), use separate rules.

## JavaScript

**None.** The marquee is pure CSS (driven by `@keyframes ref-scroll` and a duplicated set of items). The existing `js/lightbox.js` is **not** loaded for this section — cards have no `data-lightbox` / `data-full` attributes and are not clickable.

## Files touched

1. `index.html` — insert the new `<section id="reference">` between `#certifikacia` and `#objednanie`. Add 5 draft testimonials + a duplicated set for seamless scroll.
2. `css/custom.css` — add the references marquee block (`.ref-*` classes + `@keyframes ref-scroll`) and wire up responsive + reduced-motion rules.
3. **No JS changes. No new assets. No docs changes** (the testimonials are draft copy, not canonical content — they do not belong in `docs/`).

## Acceptance criteria

- [ ] Section renders between Certifikácia and Objednávanie with the documented header (eyebrow / title / subtitle).
- [ ] Five testimonials appear, each tied to a real service, each preceded by a `<!-- DRAFT … -->` comment.
- [ ] Testimonials auto-scroll horizontally; scrolling is slower than the cert marquee.
- [ ] Hovering anywhere over the track pauses the animation.
- [ ] With `prefers-reduced-motion: reduce`, testimonials display as a wrapping centered grid and do not animate.
- [ ] On mobile (≤767px), card width is reduced and the section reads comfortably.
- [ ] No new navbar link is added.
- [ ] No JavaScript is added or modified.
- [ ] Visual inspection via Playwright MCP confirms the section visually matches the cert marquee system (accent rule, masking, spacing rhythm) while reading as a calm clinical section rather than a review site.
- [ ] `prefers-reduced-motion` and hover-pause behaviour are verified in the browser.

## Risks / open notes

- **Draft copy quality** — the implementer must write testimonials that sound genuinely Slovak and patient-voiced, not translated or generic. The `frontend-design` plugin is a good fit for the final visual pass; the copy itself should be drafted carefully and flagged for the doctor's review.
- **Marquee readability vs. motion** — 55s duration is a starting point; may need tuning after visual inspection. If quotes still feel rushed, bump to 60–70s.
- **Section count / page length** — adding a section between Certifikácia and Objednávanie lengthens the page slightly; the section-padding rhythm should match neighbours so it doesn't feel bloated.
