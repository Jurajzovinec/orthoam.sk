# References Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Čo o nás hovoria pacienti" section between Certifikácia and Objednávanie that displays five draft patient testimonials in an auto-scrolling, minimal-card marquee that mirrors the existing Certifikácia marquee.

**Architecture:** Pure HTML + CSS, no JavaScript. A new `<section id="reference">` in `index.html` between the existing `#certifikacia` and `#objednanie` sections. New `.ref-*` classes in `css/custom.css` placed directly under the existing `CERTIFICATION` block — they parallel the cert marquee classes but are tuned independently (slower scroll, wider cards, different internal layout). The track contains 10 items (5 unique testimonials + the same 5 duplicated) so the CSS keyframe loop is seamless.

**Tech Stack:** Static HTML, CSS (with existing CSS variables from `templatemo-medic-care.css`), Bootstrap 5 grid. No build step. No framework. No JS.

**Spec:** `docs/superpowers/specs/2026-06-13-references-section-design.md`

---

## Test strategy

There is no automated test framework on this static site. Verification follows the pattern documented in `AGENTS.md` → "Visual inspection (Playwright MCP)":

1. Serve the site locally with `python3 -m http.server 8000` from the repo root.
2. Drive the Playwright MCP browser to navigate to `http://localhost:8000/#reference`.
3. Take a screenshot of the section; assert visual properties against the spec.
4. Kill the server when done.

Each task that produces visible output ends with a Playwright verification step that names the exact things to check on the screenshot. **Do not skip these.** A task is not done until its visual check passes.

---

## File structure

Two files change. No new files are created (other than the spec/plan docs that already exist).

- **`index.html`** (modify) — insert `<section id="reference">` between the `#certifikacia` and `#objednanie` sections. Contains the section header and 10 `<li class="ref-item">` entries (5 unique testimonials duplicated for seamless scroll).
- **`css/custom.css`** (modify) — insert a new `REFERENCES` block directly under the existing `CERTIFICATION` block (after line 253, before the `CERTIFICATION LIGHTBOX` block which starts around line 255). Add `.ref-*` classes, `@keyframes ref-scroll`, and wire up the existing `prefers-reduced-motion` and mobile responsive blocks to also cover `.ref-track` / `.ref-item`.

### Files NOT touched

- No JavaScript — the marquee is pure CSS animation.
- No new images / assets.
- No `docs/` content changes — testimonials are draft copy flagged for doctor review, not canonical content.
- `js/lightbox.js` is not loaded for this section — cards have no click handlers.

---

## Task 1: Insert the references section markup in `index.html`

**Files:**
- Modify: `index.html` (insert between the `#certifikacia` section close and the `#objendanie` section open)

**Context for the engineer:**
- The `#certifikacia` section currently ends with its closing `</section>` immediately before the `<!-- OBJEDNÁVANIE -->` comment and `<section ... id="objednanie">`.
- The new section sits **between** them.
- The marquee track contains **10** `<li class="ref-item">` entries. The first 5 are the unique testimonials. The next 5 are byte-for-byte duplicates of the first 5 — this duplication is what makes the `ref-scroll` keyframe loop seamlessly (it translates the track by `-100% - gap`, landing exactly on the duplicate set).
- Every `<li>` is preceded by a `<!-- DRAFT – nahradiť skutočnou referenciou pred launchom -->` comment. The duplicates also keep this comment so they cannot be confused for "real" extras.
- The blockquote text uses Slovak "lower-99 / upper-99" quote marks: `„` (U+201E) opening and `"` (U+201C) closing. Do not use straight `"`.

**The five testimonials** (draft copy, doctor will replace):

| # | Quote (Slovak) | Author | Service |
|---|---|---|---|
| 1 | „Prišiel som s bolesťou ramena po športovom úraze. Pan doktor urobil ultrazvuk hneď na prvé sedenie, všetko trpezlivo vysvetlil a nasadil liečbu, ktorá fungovala." | Marek K. | Ultrasonografická diagnostika |
| 2 | „ACP liečba vlastnou krvou mi vrátila pohyb bez bolesti. Konečne ortopéd, ktorý počúva a vysvetlí každý krok." | Eva M. | ACP liečba |
| 3 | „Po mesiacoch problémov s kolenom mi CHONDROPLUS injekcia výrazne uľavila. Bez čakania, na presný čas." | Peter H. | CHONDROPLUS injekcie |
| 4 | „Po úraze na turistike som sa bál, že nebudem môcť behať. Profesionálny prístup a jasný plán liečby vrátili moje sebavedomie." | Tomáš R. | Poúrazová ortopédia |
| 5 | „Objednala som sa cez SMS a dostala termín presne na minútu. Žiadne čakanie v plnej čakárni, len pokoj a profesionalita." | Zuzana B. | Všeobecná konzultácia |

- [ ] **Step 1: Read the current `#certifikacia` → `#objendanie` boundary in `index.html`**

Run: `Read index.html` and locate the lines containing `<!-- OBJEDNÁVANIE -->` and `id="objednanie"`. The new section will be inserted immediately before the `<!-- OBJEDNÁVANIE -->` comment.

- [ ] **Step 2: Insert the new section**

Edit `index.html`. Replace the existing transition between Certifikácia close and Objednávanie open:

```html
                    </div>
                </div>
            </section>

            <!-- OBJEDNÁVANIE -->
            <section class="section-padding" id="objednanie">
```

with:

```html
                    </div>
                </div>
            </section>

            <!-- REFERENCE -->
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
                                        <blockquote>„Prišiel som s bolesťou ramena po športovom úraze. Pan doktor urobil ultrazvuk hneď na prvé sedenie, všetko trpezlivo vysvetlil a nasadil liečbu, ktorá fungovala."</blockquote>
                                        <figcaption>
                                            <span class="ref-author">— Marek K.</span>
                                            <span class="ref-service">Ultrasonografická diagnostika</span>
                                        </figcaption>
                                    </figure>
                                </li>
                                <!-- DRAFT – nahradiť skutočnou referenciou pred launchom -->
                                <li class="ref-item">
                                    <figure class="ref-card">
                                        <blockquote>„ACP liečba vlastnou krvou mi vrátila pohyb bez bolesti. Konečne ortopéd, ktorý počúva a vysvetlí každý krok."</blockquote>
                                        <figcaption>
                                            <span class="ref-author">— Eva M.</span>
                                            <span class="ref-service">ACP liečba</span>
                                        </figcaption>
                                    </figure>
                                </li>
                                <!-- DRAFT – nahradiť skutočnou referenciou pred launchom -->
                                <li class="ref-item">
                                    <figure class="ref-card">
                                        <blockquote>„Po mesiacoch problémov s kolenom mi CHONDROPLUS injekcia výrazne uľavila. Bez čakania, na presný čas."</blockquote>
                                        <figcaption>
                                            <span class="ref-author">— Peter H.</span>
                                            <span class="ref-service">CHONDROPLUS injekcie</span>
                                        </figcaption>
                                    </figure>
                                </li>
                                <!-- DRAFT – nahradiť skutočnou referenciou pred launchom -->
                                <li class="ref-item">
                                    <figure class="ref-card">
                                        <blockquote>„Po úraze na turistike som sa bál, že nebudem môcť behať. Profesionálny prístup a jasný plán liečby vrátili moje sebavedomie."</blockquote>
                                        <figcaption>
                                            <span class="ref-author">— Tomáš R.</span>
                                            <span class="ref-service">Poúrazová ortopédia</span>
                                        </figcaption>
                                    </figure>
                                </li>
                                <!-- DRAFT – nahradiť skutočnou referenciou pred launchom -->
                                <li class="ref-item">
                                    <figure class="ref-card">
                                        <blockquote>„Objednala som sa cez SMS a dostala termín presne na minútu. Žiadne čakanie v plnej čakárni, len pokoj a profesionalita."</blockquote>
                                        <figcaption>
                                            <span class="ref-author">— Zuzana B.</span>
                                            <span class="ref-service">Všeobecná konzultácia</span>
                                        </figcaption>
                                    </figure>
                                </li>
                                <!-- Duplicated set — required for seamless ref-scroll loop. Keep in sync with the 5 items above. -->
                                <!-- DRAFT – nahradiť skutočnou referenciou pred launchom -->
                                <li class="ref-item">
                                    <figure class="ref-card">
                                        <blockquote>„Prišiel som s bolesťou ramena po športovom úraze. Pan doktor urobil ultrazvuk hneď na prvé sedenie, všetko trpezlivo vysvetlil a nasadil liečbu, ktorá fungovala."</blockquote>
                                        <figcaption>
                                            <span class="ref-author">— Marek K.</span>
                                            <span class="ref-service">Ultrasonografická diagnostika</span>
                                        </figcaption>
                                    </figure>
                                </li>
                                <!-- DRAFT – nahradiť skutočnou referenciou pred launchom -->
                                <li class="ref-item">
                                    <figure class="ref-card">
                                        <blockquote>„ACP liečba vlastnou krvou mi vrátila pohyb bez bolesti. Konečne ortopéd, ktorý počúva a vysvetlí každý krok."</blockquote>
                                        <figcaption>
                                            <span class="ref-author">— Eva M.</span>
                                            <span class="ref-service">ACP liečba</span>
                                        </figcaption>
                                    </figure>
                                </li>
                                <!-- DRAFT – nahradiť skutočnou referenciou pred launchom -->
                                <li class="ref-item">
                                    <figure class="ref-card">
                                        <blockquote>„Po mesiacoch problémov s kolenom mi CHONDROPLUS injekcia výrazne uľavila. Bez čakania, na presný čas."</blockquote>
                                        <figcaption>
                                            <span class="ref-author">— Peter H.</span>
                                            <span class="ref-service">CHONDROPLUS injekcie</span>
                                        </figcaption>
                                    </figure>
                                </li>
                                <!-- DRAFT – nahradiť skutočnou referenciou pred launchom -->
                                <li class="ref-item">
                                    <figure class="ref-card">
                                        <blockquote>„Po úraze na turistike som sa bál, že nebudem môcť behať. Profesionálny prístup a jasný plán liečby vrátili moje sebavedomie."</blockquote>
                                        <figcaption>
                                            <span class="ref-author">— Tomáš R.</span>
                                            <span class="ref-service">Poúrazová ortopédia</span>
                                        </figcaption>
                                    </figure>
                                </li>
                                <!-- DRAFT – nahradiť skutočnou referenciou pred launchom -->
                                <li class="ref-item">
                                    <figure class="ref-card">
                                        <blockquote>„Objednala som sa cez SMS a dostala termín presne na minútu. Žiadne čakanie v plnej čakárni, len pokoj a profesionalita."</blockquote>
                                        <figcaption>
                                            <span class="ref-author">— Zuzana B.</span>
                                            <span class="ref-service">Všeobecná konzultácia</span>
                                        </figcaption>
                                    </figure>
                                </li>
                            </ul>
                        </div>

                    </div>
                </div>
            </section>

            <!-- OBJEDNÁVANIE -->
            <section class="section-padding" id="objednanie">
```

Note: the existing `Edit` will need to match the whitespace exactly. The transition is the closing of the cert row + `</section>` followed by the `<!-- OBJEDNÁVANIE -->` comment. Use enough surrounding context to make the match unique — the `<section ... id="objednanie">` line is unique in the file.

- [ ] **Step 3: Verify the page still loads**

Run from repo root:
```bash
python3 -m http.server 8000
```
In a separate shell or via Playwright MCP, navigate to `http://localhost:8000/`. Expected: page loads without errors. The new section will be unstyled at this point (no `.ref-*` CSS yet) — the cards will appear as plain blockquotes stacked vertically. That is fine; Task 2 adds the CSS.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
feat(references): add references section markup in index.html

Insert <section id="reference"> between Certifikácia and Objednávanie.
Ten ref-item entries (5 unique testimonials + duplicates) for a
seamless marquee loop. All copy is draft, flagged with HTML comments
for the doctor to review before launch.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add the references marquee CSS

**Files:**
- Modify: `css/custom.css` — insert a new `REFERENCES` block directly under the existing `CERTIFICATION` marquee block (between the `@keyframes cert-scroll` rule around line 253 and the `CERTIFICATION LIGHTBOX` comment that follows).

**Context for the engineer:**
- The existing cert marquee CSS lives around lines 169–253. Study it before writing the new block. The new `.ref-*` classes intentionally mirror its structure.
- **Shared selectors:** where the cert and ref rules are identical (full-bleed, mask-image, gap, hover-pause, keyframe definition), group them with comma-separated selectors so the two sections stay in sync. Where they differ (animation name, duration, item width, internal card layout), use separate rules.
- Key differences from cert marquee:
  - **Duration: 55s** (vs cert's 42s) — quotes must be readable, not flashing past.
  - **Item width: 18rem** (vs cert's 16rem) — testimonials need more horizontal room than certificate scans.
  - **No `cursor: pointer` / no hover-scale on the card** — testimonials are not clickable.
  - **Different internal layout** — blockquote + figcaption with author + service lines.

- [ ] **Step 1: Read the current cert marquee CSS to understand the pattern**

Run: `Read css/custom.css` lines 169–260. Note the structure: `.cert-marquee` (viewport), `.cert-track` (flex row + animation), `.cert-track:hover`, the `prefers-reduced-motion` block, `.cert-item` (fixed width), `.cert-thumb` (card), `.cert-thumb img`, `@keyframes cert-scroll`.

- [ ] **Step 2: Insert the new block**

Edit `css/custom.css`. Locate the `@keyframes cert-scroll { ... }` block (the one that ends around line 253). Immediately **after** the closing `}` of `@keyframes cert-scroll`, insert this new block (keep one blank line before it):

```css

/*---------------------------------------
  REFERENCES — testimonial marquee (mirrors the cert pattern)
-----------------------------------------*/

/* Shared marquee viewport rules — cert and ref must stay in lockstep */
.cert-marquee,
.ref-marquee {
  position: relative;
  width: 100vw;
  margin-left: calc(50% - 50vw);
  padding: 0.5rem 0 1.75rem;
  -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 6%, #000 94%, transparent 100%);
          mask-image: linear-gradient(90deg, transparent 0, #000 6%, #000 94%, transparent 100%);
}

/* Shared track rules — flex row, gap, pause-on-hover */
.cert-track,
.ref-track {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: 1.25rem;
  width: -webkit-max-content;
  width: max-content;
}

.cert-track:hover,
.ref-track:hover {
  animation-play-state: paused;
}

/* Per-track animation (different durations) */
.cert-track {
  animation: cert-scroll 42s linear infinite;
}

.ref-track {
  animation: ref-scroll 55s linear infinite; /* slower — quotes must be readable */
}

/* Reduced-motion fallback for both tracks */
@media (prefers-reduced-motion: reduce) {
  .cert-track,
  .ref-track {
    animation: none;
    flex-wrap: wrap;
    width: 100%;
    justify-content: center;
  }
}

/* Item widths — testimonials need more room than certificate scans */
.cert-item {
  flex: 0 0 auto;
  width: 16rem;
}

.ref-item {
  flex: 0 0 auto;
  width: 18rem;
}

/* The card itself — white slab with the same top accent ribbon as cert thumbs,
   but no click/hover behaviour (testimonials are decorative, not interactive) */
.ref-card {
  margin: 0;
  background: var(--white-color);
  border-radius: 0.4rem;
  padding: 1.5rem 1.4rem 1.35rem;
  height: 100%;
  box-shadow: inset 0 2px 0 0 var(--primary-color), 0 0.6rem 1.4rem rgba(20, 40, 80, 0.10);
}

.ref-card blockquote {
  margin: 0 0 1rem;
  padding: 0;
  font-style: italic;
  color: var(--p-color);
  font-weight: var(--font-weight-light);
  font-size: var(--p-font-size);
  letter-spacing: 0.3px;
  line-height: 1.5;
}

.ref-card figcaption {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.ref-author {
  font-weight: var(--font-weight-bold);
  color: var(--title-color);
  font-size: 0.95rem;
}

/* Service line reuses the .therapy-figure-caption motif: small uppercase + left border */
.ref-service {
  align-self: flex-start;
  font-size: 0.72rem;
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--p-color);
  padding-left: 0.6rem;
  border-left: 3px solid var(--primary-color);
}

@keyframes ref-scroll {
  from { transform: translateX(0); }
  to   { transform: translateX(calc(-100% - 1.25rem)); }
}
```

- [ ] **Step 3: Remove the now-duplicated old rules**

The insertion above **replaces** the old `.cert-marquee`, `.cert-track`, `.cert-track:hover`, `.cert-item`, and `prefers-reduced-motion .cert-track` rules. The original cert block around lines 173–211 contains:

- `.cert-marquee { … }` — DELETE (replaced by shared `.cert-marquee, .ref-marquee`)
- `.cert-track { … animation: cert-scroll 42s linear infinite; }` — DELETE (replaced by shared `.cert-track, .ref-track` + per-track `.cert-track` duration)
- `.cert-track:hover { animation-play-state: paused; }` — DELETE (replaced by shared hover rule)
- The `@media (prefers-reduced-motion: reduce) { .cert-track { … } }` block — DELETE (replaced by the shared reduced-motion rule)
- `.cert-item { flex: 0 0 auto; width: 16rem; }` — DELETE (replaced by the per-item width rules)

**Keep the `.cert-thumb` rules and `.cert-thumb img` rule** — those are specific to the certification lightbox behaviour and are NOT duplicated.

After this step, the `CERTIFICATION — auto-scrolling marquee + lightbox` section header should be followed directly by the new shared rules (no orphaned old rules). Read the file around lines 169–260 after the edits to confirm there are no leftover duplicates.

- [ ] **Step 4: Verify the cert marquee still works**

Run the local server (or reuse the running one):
```bash
python3 -m http.server 8000
```
Navigate Playwright MCP to `http://localhost:8000/#certifikacia`. Expected:
- The certificate marquee still auto-scrolls.
- Hovering pauses it.
- Cards still have the top accent rule and white background.

If anything broke, the refactor in Step 3 left a duplicate or removed a needed rule. Re-read the file and fix.

- [ ] **Step 5: Verify the references section is styled**

Navigate Playwright MCP to `http://localhost:8000/#reference`. Take a screenshot. Expected:
- Section header shows eyebrow `Naše reference`, title `Čo o nás hovoria pacienti`, muted subtitle.
- Below it: a horizontal strip of white cards with a thin primary-color rule along the top of each card.
- Cards scroll slowly left; hovering anywhere over the track pauses them.
- Each card shows: italic quote, em-dash + bold author, small uppercase service line with a left primary-color border.

- [ ] **Step 6: Commit**

```bash
git add css/custom.css
git commit -m "$(cat <<'EOF'
feat(references): add testimonial marquee CSS

Adds .ref-* classes mirroring the cert marquee pattern, with a
slower 55s scroll and wider 18rem cards. Refactors cert marquee
rules into shared selectors (.cert-*, .ref-*) where they are
identical, keeping per-section differences isolated.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Wire up mobile responsive and reduced-motion for `.ref-track`

**Files:**
- Modify: `css/custom.css` — extend the existing `@media screen and (max-width: 767px)` RESPONSIVE block at the bottom of the file.

**Context for the engineer:**
- The existing mobile responsive block lives around line 681 and only covers `.service-card`, `.cert-item`, `.cert-thumb img`, and `.booking-cta .btn`.
- The reduced-motion fallback was already added in Task 2 (the shared `@media (prefers-reduced-motion: reduce)` rule covers both `.cert-track` and `.ref-track`). This task only needs to add the **mobile width override** for `.ref-item`.

- [ ] **Step 1: Read the existing mobile responsive block**

Run: `Read css/custom.css` and locate the block starting `@media screen and (max-width: 767px) {` near the bottom (the one that contains `.cert-item { width: 12rem; }`).

- [ ] **Step 2: Add the mobile override**

Edit `css/custom.css`. Inside that existing `@media screen and (max-width: 767px)` block, immediately after the `.cert-thumb img { height: 9.5rem; }` rule, insert:

```css
  .ref-item {
    width: 14rem;
  }
```

- [ ] **Step 3: Verify mobile layout via Playwright MCP**

With the local server running, resize the Playwright browser to mobile width:
```
browser_resize: width=375, height=720
```
Navigate to `http://localhost:8000/#reference`. Take a screenshot. Expected:
- Testimonial cards are narrower than on desktop.
- Cards still scroll horizontally; side fades still work.
- Quotes wrap gracefully inside the narrower card.

Resize back to desktop (e.g. `width=1280, height=900`) and reload to confirm desktop still looks correct.

- [ ] **Step 4: Commit**

```bash
git add css/custom.css
git commit -m "$(cat <<'EOF'
feat(references): add mobile width override for ref-item

Narrower 14rem cards on mobile so quotes wrap gracefully.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Final visual verification and cleanup

**Files:**
- No file changes unless a check fails.

- [ ] **Step 1: Run the full page in Playwright MCP and walk every acceptance criterion**

Start (or reuse) the local server. In Playwright MCP:

1. Navigate to `http://localhost:8000/` (top of page).
2. Take a full-page screenshot. Confirm the section renders between Certifikácia and Objendanie.
3. Click the nav — confirm no new "Reference" nav item was added (the navbar should still be: Domov / O nás / Lekár / Služby / Certifikácia / Kontakt).
4. Navigate to `http://localhost:8000/#reference`. Confirm:
   - Eyebrow `Naše reference`, title `Čo o nas hovoria pacienti`, subtitle present.
   - Five unique testimonials appear (Eva M. / Marek K. / Peter H. / Tomáš R. / Zuzana B.).
   - Each card has the thin top accent rule and the left-border on the service line.
5. Hover over the scrolling track. Confirm the animation pauses.
6. Resize to `width=375, height=720`. Confirm cards narrow but still scroll.
7. Simulate reduced motion:
   ```
   browser_evaluate: () => Object.defineProperty(window, 'matchMedia', { value: () => ({ matches: true, addListener: () => {}, removeListener: () => {} }) })
   ```
   Reload. Confirm the track stops animating and the testimonials lay out as a centered wrapping grid.

- [ ] **Step 2: Verify the page source has no JavaScript references for the new section**

Run: `Grep index.html` for `ref-track` and `ref-item`. Confirm they only appear in the markup — no JS file should reference them.

Run: `Grep js/` for `ref-`. Expected: no matches (no JS hook for this section).

- [ ] **Step 3: Verify draft comments are present**

Run: `Grep index.html` for `DRAFT`. Expected: 10 matches (one per `<li>`).

- [ ] **Step 4: Kill the local server**

```bash
# kill the python http.server started earlier
pkill -f "http.server 8000" || true
```

- [ ] **Step 5: Final commit (only if any fixups were made during verification)**

If verification surfaced issues, fix them with a clear commit explaining what was wrong. If everything passed, no commit is needed.

---

## Acceptance criteria (from spec)

- [ ] Section renders between Certifikácia and Objendanie with the documented header (eyebrow / title / subtitle).
- [ ] Five testimonials appear, each tied to a real service, each preceded by a `<!-- DRAFT … -->` comment.
- [ ] Testimonials auto-scroll horizontally; scrolling is slower than the cert marquee (55s vs 42s).
- [ ] Hovering anywhere over the track pauses the animation.
- [ ] With `prefers-reduced-motion: reduce`, testimonials display as a wrapping centered grid and do not animate.
- [ ] On mobile (≤767px), card width is reduced to 14rem and the section reads comfortably.
- [ ] No new navbar link is added.
- [ ] No JavaScript is added or modified.
- [ ] Visual inspection via Playwright MCP confirms the section visually matches the cert marquee system (accent rule, masking, spacing rhythm) while reading as a calm clinical section rather than a review site.
