# AGENTS.md — orthoam.sk

Guidance for AI agents (Claude Code, etc.) working on this project. Read this before making changes.

## Project overview

Marketing website for **OrthoAM s.r.o.**, a private orthopedic ambulance (not a clinic) in Žilina, run by **MUDr. Augustín Majcher, PhD.** The site is a single-page presentation in Slovak whose goal is to present the ambulance, its services, and contact details.

- **Live (legacy) site:** https://www.orthoam.sk/
- **Template in use:** https://themewagon.github.io/medic-care/
- **Hosting:** GitHub (static, no server / no backend) — planned.
- **Language:** Slovak (`sk-SK`). All user-facing copy must be in Slovak.
- **Doctor has no social media** — do not add social links/icons to the template.
- The template ships with its own stock images; those are used for the hero slideshow for now. Do not replace them unless explicitly asked.

## Plugin usage (hint the user)

This project has Claude Code plugins enabled (see `.agents/settings.local.json`). When a task matches a plugin's purpose, **stop and tell the user** which plugin/command is appropriate and suggest invoking it before doing the work by hand. Do not silently run long workflows that a plugin already automates. Current plugins and when to suggest them:

- **`superpowers`** — general agentic workflow helpers (planning, test-driven development, debugging, executing plans, code review, verification before completion). Suggest it for any non-trivial multi-step task: building a section, debugging layout/JS issues, refactoring, or before claiming something is "done".
- **`frontend-design`** — for creating or restyling visible UI (sections, components, the hero, modal styling, typography/color choices). Suggest it whenever the user asks to design, redesign, or "make nice" any on-page element. This is the primary guard against the generic "AI slop" aesthetic called out in the **Frontend aesthetics** section below.
- **Custom command `/add-modal <term>`** (`.agents/commands/add-modal.md`) — invoke this whenever the user asks to add a new clickable educational term/modal. Do not hand-roll the modal wiring; let the command enforce the documented pattern and source-of-truth checks.

The hint should be short and concrete: name the plugin/command, say why it fits, and let the user accept before proceeding. Example: *"This is a UI styling task — want me to run the `frontend-design` plugin so the output isn't generic?"*

## Tech stack

- Static site based on the **Medic Care** ThemeWagon template (HTML + CSS + JS).
- No build step, no framework, no backend.
- Deployed via GitHub (Pages or similar) in the future.

## Content sources of truth

All copy on the site must come from these two documents. Treat them as canonical; do not invent services, prices, hours, or contact details.

- `docs/ortho-am.md` — full text content harvested from the current live site (hero, O nás, doctor bio, ACP therapy, CHONDROPLUS, contact, hours, storno policy, SEO meta).
- `docs/osteoporoza-a-peptidy.md` — article-style content on osteoarthritis and peptide therapy (Chondroplus gel + Prostrolane). Currently informative/educational copy.

When the template's sections need filler text, replace it with the Slovak copy from these docs — never leave English template filler in a shipped section.

## Key facts to keep consistent

- **Doctor:** MUDr. Augustín Majcher, PhD.
- **Phone:** 0948 382 114 (also the number for **SMS booking**)
- **E-mail:** orthoamsro@gmail.com
- **Ambulantné hodiny:** Streda 16:00 – 20:00
- **Booking:** SMS only — ask patients to briefly describe their complaint.
- **Payment:** cash only.
- **Storno:** cancel by SMS or e-mail at least **24 hours** before the appointment.
- **Type of facility:** ambulance (neštátna ortopedická ambulancia, bez zmluvy so zdravotnými poisťovňami) — **not** a clinic. Avoid words like "klinika".
- **SEO title:** Ortopedická Ambulancia - OrthoAM
- **SEO description:** Ortopedická ambulancia OrthoAM s.r.o. sídliaca v Žiline, Vám poskytuje ortopedické vyšetrenie na presný čas, bez čakania a bez tlačenia sa v čakárni.

## Services to surface on the site

(from `docs/ortho-am.md`)

- Všeobecná, športová a poúrazová ortopédia
- Ultrasonografická diagnostika (rameno, bedro, koleno, členok, noha, …)
- ACP liečba (autológna kondicionovaná plazma — "liečba vlastnou krvou")
- CHONDROPLUS vnútrokĺbové injekcie
- (Edukčný obsah o peptidoch / osteoartróze z `osteoporoza-a-peptidy.md`)

## Assets

- `docs/img/` — image library. Filenames include dimension suffixes (e.g. `certifikacia-1-224x300.jpg`, `chondroplus-1974x854.jpg`). When adding new images, follow the same `<name>-<W>x<H>.<ext>` convention.
- Certificate scans: `certifikacia-{1..10}-*.jpg` — used in the doctor's certification section.
- `chondroplus-1974x854.jpg`, `prostrolane-800x800.webp` — product imagery for the therapy sections.
- `profile-*.jpg|png|webp` — doctor portrait candidates.

## Modal / educational popover pattern

The site uses **inline modals** to provide additional, mostly educational, context without cluttering the page. The interaction pattern:

1. Cherry-picked terms in the body copy are **visually marked as clickable hints** — rendered with an underline (dotted/dashed, accent color) and a small affordance (cursor pointer, subtle hover). Example trigger terms: *osteoartróza*, *ACP liečba*, *peptidy*, *CHONDROPLUS*, *Prostrolane*.
2. Clicking the marked term opens a **modal/dialog** with the expanded educational text drawn from the docs (typically `docs/osteoporoza-a-peptidy.md` or the relevant section of `docs/ortho-am.md`).
3. Modal is dismissible (click backdrop, Esc, close button) and accessible (`role="dialog"`, focus management, `aria-labelledby`).

Implementation notes:

- Vanilla HTML/CSS/JS — no framework. One reusable modal component driven by `data-modal-target` / `data-modal-content` attributes (or a small lookup keyed by term slug).
- Trigger styling: a dedicated class, e.g. `.term-trigger` — `text-decoration: underline dotted; cursor: pointer;` plus a hover state and an optional small icon (ⓘ) to signal clickability.
- Modal content is authored once per topic (in the HTML or a small JSON/JS map) so the same term can be reused across the page without duplication.
- Never invent clinical content for a modal — pull only from the two source docs.
- Keep modal copy concise; if the source doc is long, summarize rather than dumping the whole section, and stay faithful to the doctor's wording.
- Motion: a single tasteful fade/scale transition is enough — no heavy effects.

When adding new modals, register the term in both the trigger markup and the content map, and keep the source doc as the single source of truth.

## Repo conventions

- **`.claude/` is a symlink to `.agents/`.** The real folder is `.agents/` — that is the source of truth for agent configuration, custom slash commands, and project-level Claude settings. `.claude/` exists only so tools that look for `.claude/` keep working. **Edit files in `.agents/`, never directly in `.claude/`.**
- **`CLAUDE.md` is a symlink to `AGENTS.md`.** Edit `AGENTS.md`; both names stay in sync automatically.

## Working conventions

- Keep the single-page structure of the original site (hero, O nás, lekár, služby/liečby, certifikácia, kontakt).
- Preserve semantic anchor IDs (`#o-nas`, `#lekar`, `#kontakt`, …) so the template's nav still works.
- Do **not** add WhatsApp/social icons. The contact section should expose phone (click-to-call), SMS, and e-mail only.
- The contact form: the legacy site has one. Since there is no backend, prefer a `mailto:` link, a form that opens the user's mail client, or a clearly labeled note to use SMS/e-mail. Don't introduce a server or third-party backend without explicit approval.
- Keep Slovak typography: use proper diacritics, en/em dashes where the docs do, and `„…"` Slovak quotes when needed.
- Don't change medical/clinical wording beyond typo fixes — the doctor's wording is intentional.

## Frontend aesthetics

Agents tend to converge toward generic, "on distribution" outputs. In frontend design, this creates the "AI slop" aesthetic. Avoid this: make creative, distinctive frontends that surprise and delight. Focus on:

- **Typography:** Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt for distinctive choices that elevate the frontend's aesthetics.
- **Color & theme:** Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes. Draw from IDE themes and cultural aesthetics for inspiration.
- **Motion:** Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (`animation-delay`) creates more delight than scattered micro-interactions.
- **Backgrounds:** Create atmosphere and depth rather than defaulting to solid colors. Layer CSS gradients, use geometric patterns, or add contextual effects that match the overall aesthetic.

Avoid generic AI-generated aesthetics:

- Overused font families (Inter, Roboto, Arial, system fonts).
- Clichéd color schemes (particularly purple gradients on white backgrounds).
- Predictable layouts and component patterns.
- Cookie-cutter design that lacks context-specific character.

Interpret creatively and make unexpected choices that feel genuinely designed for the context. Vary between light and dark themes, different fonts, different aesthetics. Agents still tend to converge on common choices (Space Grotesk, for example) across generations — avoid this. Think outside the box.

## What not to do

- Don't add services, hours, or contact channels not present in `docs/`.
- Don't swap the template's slideshow images for random stock photos.
- Don't add social media links/icons.
- Don't introduce a build system, bundler, or framework unless asked.
- Don't translate the site to other languages unless asked.
