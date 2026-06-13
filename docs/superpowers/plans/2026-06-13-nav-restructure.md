# Nav Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the "Domov" nav link and add a "Kde nás nájdete" nav link pointing at the existing `#lokalita` section, producing a balanced 4-link nav centered on the "OrthoAM" brand.

**Architecture:** Single-file HTML edit inside the desktop `<ul class="navbar-nav mx-auto">` block (index.html:52-73). The mobile brand `<a>` at index.html:42-45 and the `#lokalita` section body (index.html:535-587) are untouched. No CSS, JS, or content changes — the existing smooth-scroll in `js/main.js` is anchor-based and picks up the new link automatically.

**Tech Stack:** Static HTML (Medic Care template / Bootstrap 5 navbar). No build step.

**Spec:** `docs/superpowers/specs/2026-06-13-nav-restructure-design.md`

---

## File Structure

- **Modify:** `index.html` — the `<ul class="navbar-nav mx-auto">` block (lines 52-73). Two edits: delete the "Domov" `<li>`, insert a "Kde nás nájdete" `<li>` in the correct slot.
- **No other files change.** Specifically: `css/custom.css`, `js/main.js`, `js/modal.js`, the `#lokalita` section body, and the mobile brand `<a>` are all untouched.

---

## Task 1: Restructure the desktop navbar

**Files:**
- Modify: `index.html:52-73` (the `<ul class="navbar-nav mx-auto">` block)

This task makes both edits in one atomic replacement of the `<ul>` block, because the order of `<li>` children around the centered brand `<a>` is what produces the balanced layout. Doing it as one Edit keeps the change reviewable and avoids intermediate broken states.

- [ ] **Step 1: Replace the entire `<ul class="navbar-nav mx-auto">` block**

Use the Edit tool on `index.html`. Old string is the full current `<ul>` (lines 52-73). New string is the restructured `<ul>`.

**Old `old_string`** (current state, verbatim — match indentation exactly: 24 spaces before `<ul>`):

```html
                        <ul class="navbar-nav mx-auto">
                            <li class="nav-item active">
                                <a class="nav-link" href="#hero">Domov</a>
                            </li>

                            <li class="nav-item">
                                <a class="nav-link" href="#o-nas">O nás</a>
                            </li>

                            <a class="navbar-brand d-none d-lg-block" href="#hero">
                                OrthoAM
                                <strong class="d-block">Ortopedická ambulancia</strong>
                            </a>

                            <li class="nav-item">
                                <a class="nav-link" href="#sluzby">Služby</a>
                            </li>

                            <li class="nav-item">
                                <a class="nav-link" href="#kontakt">Kontakt</a>
                            </li>
                        </ul>
```

**New `new_string`** (target state — `active` moved to O nás; Domov removed; Kde nás nájdete inserted between Služby and Kontakt):

```html
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

Notes for the implementer:
- The `active` class moves from the (deleted) Domov `<li>` to the O nás `<li>` — this preserves the template's initial-load highlight on the new first item.
- The brand `<a>` is **unchanged** (same `href="#hero"`, same classes, same content).
- The new "Kde nás nájdete" `<li>` sits **after Služby and before Kontakt**, producing the target order: O nás, Služby, *brand*, Kde nás nájdete, Kontakt.

- [ ] **Step 2: Verify the edit by reading the changed region back**

Read `index.html` lines 51-75 and confirm:
1. The "Domov" `<li>` is gone.
2. The O nás `<li>` carries `class="nav-item active"`.
3. The brand `<a>` is unchanged and still has `href="#hero"`.
4. The new "Kde nás nájdete" `<li>` appears after Služby, before Kontakt.
5. No stray empty `<li>` or duplicated closing `</ul>`.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
feat(nav): drop Domov, add Kde nás nájdete link to #lokalita

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

Expected: one commit touching only `index.html`.

---

## Task 2: Visual verification with Playwright

**Files:** none (inspection only)

Per `AGENTS.md`, the visual review for UI changes uses the Playwright MCP server against a local server. This is the verification step — there is no test suite.

- [ ] **Step 1: Start a local static server**

```bash
cd /Users/juraj/Documents/MISC/orthoam.sk && python3 -m http.server 8000
```

Run in the background. Note the shell id so it can be killed in Step 6.

- [ ] **Step 2: Open the page in Playwright at desktop width**

Navigate to `http://localhost:8000` using the Playwright MCP browser. Set viewport to a desktop width (≥ 992px, e.g. 1280×800) so the desktop nav (not the hamburger) is visible.

- [ ] **Step 3: Snapshot the navbar and confirm link order**

Take an accessibility snapshot focused on the `<nav>` region. Confirm the visible link order, left-to-right, is:

1. O nás
2. Služby
3. *(centered brand)* OrthoAM / Ortopedická ambulancia
4. Kde nás nájdete
5. Kontakt

And that "Domov" is **absent**.

- [ ] **Step 4: Capture a screenshot as evidence**

Screenshot the viewport (or the nav region specifically). Save as `nav-desktop-after.png` (relative path is fine — Playwright MCP output dir). This is the "done" evidence per `superpowers:verification-before-completion`.

- [ ] **Step 5: Functional spot-checks**

In the Playwright browser, click each nav link in turn and confirm:
1. **O nás** scrolls to `#o-nas`.
2. **Služby** scrolls to `#sluzby`.
3. **Kde nás nájdete** scrolls to `#lokalita` (the section with the map iframe).
4. **Kontakt** scrolls to `#kontakt` (footer).
5. **Centered "OrthoAM" brand** scrolls to `#hero` (home behavior — this replaces the old Domov link).

Also confirm: no console errors logged; smooth-scroll offset (~74px) still leaves section headings un-obscured by the fixed navbar.

- [ ] **Step 6: Mobile spot-check**

Resize the Playwright viewport to a mobile width (e.g. 375×667). Confirm:
- Hamburger toggler appears.
- Expanding it shows the 4 links in order: O nás, Služby, Kde nás nájdete, Kontakt.
- Mobile brand `<a>` (top of nav) still reads "OrthoAM" and links to `#hero`.
- Tapping a link collapses the menu (existing `js/main.js` behavior).

- [ ] **Step 7: Kill the local server**

```bash
# kill the background shell from Step 1
```

Do not leave the server running (per `AGENTS.md`).

---

## Done criteria

- [ ] Task 1 commit exists on `main` with the exact diff described (one `<ul>` block replaced in `index.html`, nothing else).
- [ ] Desktop nav shows the target 5-element order (4 links + brand) with no "Domov".
- [ ] All five click targets (4 links + brand) scroll to the correct sections.
- [ ] Mobile nav shows the 4 links in order and collapses on tap.
- [ ] No console errors.
- [ ] Screenshot `nav-desktop-after.png` captured as evidence.
- [ ] Local server killed.

## Out of scope (do not do)

- Do **not** modify the `#lokalita` section content (address, map, directional links, copy).
- Do **not** change `css/custom.css`, `js/main.js`, or `js/modal.js`.
- Do **not** touch the mobile brand `<a>` (index.html:42-45).
- Do **not** add a scroll-spy / intersection observer to dynamically toggle `active`. (Not in the spec; the current site doesn't have one. The `active` class is a static initial-load highlight only.)
- Do **not** add a new section or move `#lokalita` — its current position above `#kontakt` already matches the new nav order.
