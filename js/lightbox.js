/**
 * OrthoAM — certificate lightbox + marquee seamlessness.
 * Vanilla JS. Mirrors the conventions of modal.js (focus management, Esc/backdrop close).
 *
 * Markup contract:
 *   <button class="cert-thumb" data-lightbox
 *           data-full="img/...full.jpg"
 *           data-caption="Optional caption">
 *
 * A single reusable overlay (#cert-lightbox) is authored in the HTML and driven here.
 */
(function () {
  "use strict";

  var track = document.querySelector(".cert-track");
  var overlay = document.getElementById("cert-lightbox");
  if (!track || !overlay) { return; }

  // --- Duplicate the set once for a seamless infinite loop ---
  // CSS animates translateX from 0 to -(100% + gap) of one set, so a mirrored
  // copy right after the originals means the visible exit matches the entry.
  (function duplicateTrack() {
    var originals = Array.prototype.slice.call(track.children);
    originals.forEach(function (li) {
      track.appendChild(li.cloneNode(true));
    });
  })();

  var imageEl = overlay.querySelector(".lightbox-image");
  var captionEl = overlay.querySelector(".lightbox-caption");
  var closeBtn = overlay.querySelector(".lightbox-close");
  var lastFocused = null;

  function open(trigger) {
    var full = trigger.getAttribute("data-full");
    var caption = trigger.getAttribute("data-caption") || "";
    if (!full) { return; }

    lastFocused = document.activeElement;

    imageEl.src = full;
    imageEl.alt = caption;
    captionEl.textContent = caption;
    captionEl.hidden = !caption;

    overlay.hidden = false;
    document.body.style.overflow = "hidden";

    window.requestAnimationFrame(function () {
      if (closeBtn) { closeBtn.focus(); }
    });
  }

  function close() {
    overlay.hidden = true;
    imageEl.src = "";
    document.body.style.overflow = "";
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    }
  }

  // Open via delegated click on any [data-lightbox]
  document.addEventListener("click", function (e) {
    var trigger = e.target.closest("[data-lightbox]");
    if (trigger) {
      e.preventDefault();
      open(trigger);
    }
  });

  // Backdrop click
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) { close(); }
  });

  // Close button
  if (closeBtn) {
    closeBtn.addEventListener("click", close);
  }

  // Keyboard: Esc closes; Enter/Space activates a focused thumbnail
  document.addEventListener("keydown", function (e) {
    var trigger = e.target.closest && e.target.closest("[data-lightbox]");
    if (trigger && (e.key === "Enter" || e.key === " " || e.key === "Spacebar")) {
      e.preventDefault();
      open(trigger);
      return;
    }
    if (!overlay.hidden && e.key === "Escape") {
      e.preventDefault();
      close();
    }
  });
})();
