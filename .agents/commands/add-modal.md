---
description: Add a clickable educational modal for a medical term on the orthoam.sk site.
allowed-tools: Read, Edit, Write, Grep, Glob, Bash
---

# Add an educational modal for a medical term

You are working on the orthoam.sk static website. The site uses inline modals to surface educational content for cherry-picked medical terms in the body copy. Add support for a new term: **$ARGUMENTS**.

Follow the pattern documented in `AGENTS.md` (section "Modal / educational popover pattern"). Concretely:

1. **Verify the source content.** Search `docs/ortho-am.md` and `docs/osteoporoza-a-peptidy.md` for the term. Only proceed if there is real educational content there. If the term is not mentioned in either doc, **stop and tell the user** — do not invent clinical content. Quote the source passage you're using.
2. **Register the modal content** in the site's modal content map (find the existing map — likely a JS/JSON object keyed by term slug, or per-modal markup). Write a concise Slovak summary of the sourced passage; stay faithful to the doctor's wording.
3. **Mark the trigger term** in the body copy with the trigger class (e.g. `.term-trigger`) and the matching `data-modal-target` attribute. Render the term with `text-decoration: underline dotted; cursor: pointer;` and the ⓘ affordance consistent with the other triggers.
4. **Accessibility:** ensure `role="dialog"`, `aria-labelledby`, focus trap on open, focus restore on close, Esc-to-close, and backdrop click-to-close all behave the same as existing modals.
5. **Visual consistency:** reuse the existing modal styles and transition — do not introduce a second modal design.
6. **Verify** the trigger opens the right modal, the text matches the source doc, and nothing else on the page changed.

Rules:
- All copy in Slovak. No English filler.
- No new framework, no backend.
- Do not change the doctor's clinical wording beyond light summarization.
- If the term should appear in multiple places, mark every occurrence but register the modal content only once.
