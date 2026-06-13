/**
 * OrthoAM — reusable educational modal.
 * Vanilla JS. Content sourced from docs/ortho-am.md and docs/osteoporoza-a-peptidy.md.
 * Driven by .term-trigger elements with data-modal-target="<slug>".
 */
(function () {
  "use strict";

  // Content map keyed by slug. Sourced faithfully from docs/.
  var modalContent = {
    "osteoartróza": {
      title: "Osteoartróza",
      body:
        "<p>Osteoartróza (OA) je najčastejšie degeneratívne ochorenie kĺbov. Je charakterizované degradáciou kĺbovej chrupavky, degeneráciou kĺbu, zápalom synoviálnej membrány a zmenami v okolitej kosti, čo všetko je hlavnou príčinou invalidity. Kĺbová chrupavka je tvorená predovšetkým chondrocytmi a kolagén-proteoglykanovou extracelulárnou matrix, ktorá obsahuje vysoké množstvo glykozylovaných proteínov.</p>" +
        "<p>Nedávne štúdie preukázali, že použitie špecifických peptidov v kombinácii s vysoko kvalitnou kyselinou hyalurónovou podporuje novo vzniknuté chrupavkové/kostné tkanivo a zároveň zaisťuje správne mechanické a funkčné vlastnosti.</p>"
    },
    "peptidy": {
      title: "Peptidy",
      body:
        "<p>Špecifické peptidy v kombinácii s vysoko kvalitnou kyselinou hyalurónovou podporujú novotvorbu chrupavkového a kostného tkaniva, zaisťujú správne mechanické a funkčné vlastnosti kĺbu a chránia biomolekulárne látky pred predčasnou degradáciou.</p>" +
        "<p>Prostrolane obsahuje 5 kľúčových biomimetických peptidov s technológiou postupného uvoľňovania (Sustained Release Technology), vďaka ktorej zostávajú peptidy v kĺbe aktívne po dlhšiu dobu:</p>" +
        "<ul>" +
        "<li><strong>Heptapeptide-16</strong> – zameraný na potlačenie zápalu v kĺbe.</li>" +
        "<li><strong>Nanopeptide-25</strong> – stimuluje regeneráciu chrupavky a chráni ju pred opotrebovaním.</li>" +
        "<li><strong>Octapeptide-11</strong></li>" +
        "<li><strong>Decapeptide-23</strong></li>" +
        "<li><strong>Oligopeptide-92</strong></li>" +
        "</ul>" +
        "<p>Tieto okrem iného podporujú novotvorbu kosti a zabraňujú jej odbúravaniu.</p>"
    }
  };

  var overlay = document.getElementById("term-modal");
  var titleEl = document.getElementById("modal-title");
  var bodyEl = document.getElementById("modal-body");
  var closeBtn = overlay ? overlay.querySelector(".modal-close") : null;
  var lastFocused = null;

  function getFocusable() {
    return overlay.querySelectorAll(
      'a[href], area[href], input:not([disabled]), select:not([disabled]), ' +
      'textarea:not([disabled]), button:not([disabled]), [tabindex="0"]'
    );
  }

  function openModal(slug) {
    var content = modalContent[slug];
    if (!content) { return; }

    lastFocused = document.activeElement;

    titleEl.innerHTML = "";
    titleEl.appendChild(document.createTextNode(content.title));
    bodyEl.innerHTML = content.body;

    overlay.hidden = false;
    document.body.style.overflow = "hidden";

    // Focus the close button once visible
    window.requestAnimationFrame(function () {
      if (closeBtn) { closeBtn.focus(); }
    });
  }

  function closeModal() {
    overlay.hidden = true;
    document.body.style.overflow = "";
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    }
  }

  // Trigger clicks / keyboard activation
  document.addEventListener("click", function (e) {
    var trigger = e.target.closest(".term-trigger");
    if (trigger) {
      openModal(trigger.getAttribute("data-modal-target"));
    }
  });

  document.addEventListener("keydown", function (e) {
    // Enter / Space on trigger
    var trigger = e.target.closest && e.target.closest(".term-trigger");
    if (trigger && (e.key === "Enter" || e.key === " " || e.key === "Spacebar")) {
      e.preventDefault();
      openModal(trigger.getAttribute("data-modal-target"));
      return;
    }

    if (overlay.hidden) { return; }

    // Esc to close
    if (e.key === "Escape") {
      e.preventDefault();
      closeModal();
      return;
    }

    // Focus trap (Tab / Shift+Tab)
    if (e.key === "Tab") {
      var focusable = getFocusable();
      if (focusable.length === 0) { return; }
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Backdrop click (click on overlay itself, not its children)
  if (overlay) {
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) { closeModal(); }
    });
  }

  // Close button
  if (closeBtn) {
    closeBtn.addEventListener("click", closeModal);
  }
})();
