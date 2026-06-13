# Design — Nav restructure (drop "Domov", promote "Kde nás nájdete")

> Spec for restructuring the top navbar and surfacing the existing location section.
> Brainstormed 2026-06-13. Implementation plan to follow via the `writing-plans` skill.

## Goal

Remove the **Domov** nav link (it duplicates the centered "OrthoAM" brand, which already scrolls to `#hero`) and add a **Kde nás nájdete** link pointing to the existing `#lokalita` section. The result is a balanced 4-link nav centered around the brand, with each link mapping to a section in document order.

## Non-goals (out of scope)

- **No change to the hero / `#hero` section** — its content, slideshow, and id stay as-is. "Domov" only disappears as a *nav link*; the hero remains the home target.
- **No change to the brand markup or `#hero` href** — the centered "OrthoAM" logo is the home affordance, on both mobile and desktop.
- **No content change to `#lokalita`** — address, copy, embedded map, and Google/Apple/Waze links stay exactly as authored (source of truth: `docs/ortho-am.md`).
- **No section move** — `#lokalita` already sits directly above `#kontakt` (index.html:535-587 → footer at 591+), which matches the new nav order (… → Kde nás nájdete → Kontakt). The document already flows correctly.
- **No CSS changes** — the navbar is a flex row centered around the brand; swapping one link for another keeps it balanced (2 links left, 2 right).
- **No JS changes** — smooth-scroll (`js/main.js`) and mobile-collapse are anchor-based and pick up the new link automatically. No scroll-spy is wired up today.
- **No modals, no new sections, no copy from outside the source docs.**

## Target nav order

Desktop (`<ul class="navbar-nav mx-auto">`) and mobile (hamburger collapse) render the same link order:

1. **O nás** → `#o-nas`
2. **Služby** → `#sluzby`
3. *(centered brand)* **OrthoAM** / Ortopedická ambulancia → `#hero` *(unchanged)*
4. **Kde nás nájdete** → `#lokalita` *(new)*
5. **Kontakt** → `#kontakt`

## Current state (reference)

`index.html:51-74` — the `<ul class="navbar-nav mx-auto">` block:

- Line 53-55: `<li class="nav-item active"><a href="#hero">Domov</a></li>` → **removed**
- Line 57-59: `<li class="nav-item"><a href="#o-nas">O nás</a></li>` → kept; becomes first item, receives `active`
- Line 61-64: centered brand `<a href="#hero">OrthoAM …</a>` → **unchanged**
- Line 66-68: `<li class="nav-item"><a href="#sluzby">Služby</a></li>` → kept, stays after brand
- Line 70-72: `<li class="nav-item"><a href="#kontakt">Kontakt</a></li>` → kept, stays last

`#lokalita` section lives at index.html:535-587 and already contains the eyebrow "Kde nás nájdete", the `<h2>Lokalita</h2>`, full address, map iframe, and three directional links. Its copy is the source of truth and is **not** modified by this spec.

## Changes

### `index.html` — `<ul class="navbar-nav mx-auto">` (lines 51-74)

1. **Delete** the "Domov" `<li>` (lines 53-55).
2. **Add** `active` class to the "O nás" `<li>` so the template's default initial highlight is preserved on the new first item.
3. **Add** a new `<li class="nav-item">` containing `<a class="nav-link" href="#lokalita">Kde nás nájdete</a>`. Position: **after the Služby `<li>`, before the Kontakt `<li>`** (matches target order: O nás, Služby, *brand*, Kde nás nájdete, Kontakt).

Resulting `<ul>`:

```
<ul class="navbar-nav mx-auto">
    <li class="nav-item active">
        <a class="nav-link" href="#o-nas">O nás</a>
    </li>
    <li class="nav-item">
        <a class="nav-link" href="#sluzby">Služby</a>
    </li>

    <a class="navbar-brand d-none d-lg-block" href="#hero">
        OrthoAM
        <strong class="d-block">Ortopedická ambulancia</strong>
    </a>

    <li class="nav-item">
        <a class="nav-link" href="#lokalita">Kde nás nájdete</a>
    </li>
    <li class="nav-item">
        <a class="nav-link" href="#kontakt">Kontakt</a>
    </li>
</ul>
```

The mobile brand `<a class="navbar-brand mx-auto d-lg-none" href="#hero">` (lines 42-45) is **unchanged**.

### That's the entire change

- No edits to `css/custom.css`, `js/main.js`, `js/modal.js`, or any section body.
- No edits to `#lokalita` content.
- No image / asset additions.

## Verification

1. Visual: open `index.html` locally (Python http.server), confirm desktop nav shows 4 links in the target order with brand centered between Služby and Kde nás nájdete. Balance looks even.
2. Click each link — confirm scroll target and 74px offset (existing `js/main.js` smooth-scroll) still works.
3. Click the centered "OrthoAM" brand — confirms scroll to `#hero` (home behavior).
4. Mobile viewport: hamburger expands, shows the 4 links in order, collapse-on-click works.
5. No console errors. Modal system still works (orthogonal — sanity check only).

Per `AGENTS.md`, capture a Playwright screenshot of the desktop nav after the change as evidence before claiming done.
