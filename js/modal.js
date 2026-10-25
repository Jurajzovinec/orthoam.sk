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
        "<p>Peptidy sú krátke úseky bielkovín – látok, z ktorých je postavené celé naše telo. Vďaka svojej malej veľkosti dobre prenikajú tkanivami a v tele fungujú ako „poslovia“: odovzdávajú bunkám pokyny, kde je potrebná obnova alebo upokojenie zápalu.</p>" +
        "<p>Pri ochoreniach kĺbov je táto signalizácia kľúčová – telo potrebuje podnety na novotvorbu chrupavkového a kostného tkaniva a na ochranu látok, ktoré sa predčasne rozpadajú. Práve to peptidy v kombinácii s vysokokvalitnou kyselinou hyalurónovou podporujú, vďaka čomu kĺb lepšie vydrží záťaž a pohyb.</p>" +
        "<p>Preto sú biomimetické peptidy (umelo vytvorené podľa vzoru tých prirodzených) súčasťou prípravkov CHONDROPLUS aj PROSTROLANE, ktoré v ambulancii aplikujem.</p>"
    },
    "indikacie-acp": {
      title: "Indikácie ACP liečby",
      body:
        "<p>ACP liečba (autológna kondicionovaná plazma) je vhodná pri týchto diagnózach a stavoch:</p>" +
        "<ul>" +
        "<li>Artróza kĺbov – koleno, rameno, členok, lakeť, bedrový kĺb – vhodné u I.–III. stupňa artrózy, v IV. štádiu má význam na zmiernenie ťažkostí u pacientov, ktorí nemôžu podstúpiť operačnú liečbu</li>" +
        "<li>Poúrazové poškodenie chrupavky po artroskopickom ošetrení chrupavky</li>" +
        "<li>Akútne a subakútne poškodenia kĺbových väzov</li>" +
        "<li>Podvrtnutie kĺbov a natiahnutie väzov</li>" +
        "<li>Ochorenie úponov šliach a väzov – napr. tenisový lakeť, zápal Achillovej šlachy…</li>" +
        "<li>Akútne a chronické zápaly šliach a väzov</li>" +
        "<li>Podpora hojenia chrupaviek, väzov, svalov, šliach po úrazoch a operáciách</li>" +
        "</ul>"
    },
    "zlozenie-chondroplus": {
      title: "Zloženie Chondroplus",
      body:
        "<p>Priehľadný a sterilný gél určený na aplikáciu do kĺbu dodávaný v sklenenej injekčnej striekačke (2 ml).</p>" +
        "<ul>" +
        "<li><strong>2 % hyaluronát sodný (40 mg / 2 ml)</strong> – vysokokvalitná kyselina hyalurónová neživočínskeho pôvodu. Zabezpečuje premazanie kĺbu a obnovu viskozity kĺbovej tekutiny.</li>" +
        "<li><strong>1 % syntetický peptid (20 mg / 2 ml)</strong> – kolagénový tripeptid s nízkou molekulovou hmotnosťou. Vďaka malej molekule lepšie preniká do kĺbových tkanív a podporuje regeneračné procesy priamo v chrupavke.</li>" +
        "</ul>"
    },
    "zlozenie-prostrolane": {
      title: "Zloženie a technológia PROSTROLANE",
      body:
        "<p>Základom je kyselina hyalurónová, ktorá slúži ako nosič aktívnych látok. Vďaka technológii postupného uvoľňovania (Sustained Release Technology) zostávajú peptidy v kĺbe aktívne po dlhšiu dobu. Medzi 5 kľúčových biomimetických peptidov patria:</p>" +
        "<ul>" +
        "<li><strong>Heptapeptide-16</strong> – zameraný na potlačenie zápalu v kĺbe.</li>" +
        "<li><strong>Nonapeptide-25</strong> – stimuluje regeneráciu chrupavky a chráni ju pred opotrebením.</li>" +
        "<li><strong>Octapeptide-11, Decapeptide-23, Oligopeptide-92</strong> – dopĺňajú komplex biomimetických peptidov, ktoré napodobňujú prirodzené aminokyselinové sekvencie a podporujú protizápalové a regeneračné procesy v kĺbe.</li>" +
        "</ul>"
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
