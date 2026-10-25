
  (function ($) {

  "use strict";

    // NAVBAR — collapse on nav click
    $('.navbar-nav .nav-link').click(function(){
        $(".navbar-collapse").collapse('hide');
    });

    // HERO CAROUSEL
    var myCarousel = document.querySelector('#myCarousel');
    if (myCarousel) {
      var carousel = new bootstrap.Carousel(myCarousel, {
        interval: 4000,
      });
    }

    // SMOOTH SCROLL FOR ANCHOR LINKS
    $('a[href*="#"]').click(function (event) {
      if (
        location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
        var target = $(this.hash);
        target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
        if (target.length) {
          event.preventDefault();
          $('html, body').animate({
            scrollTop: target.offset().top - 74
          }, 800);
        }
      }
    });

    // TESTIMONIAL MARQUEE — insert each reference 3x, then scroll one set per loop
    var refTrack = document.querySelector('.ref-track');
    if (refTrack) {
      var originals = Array.prototype.slice.call(refTrack.children);
      originals.forEach(function (li) {
        refTrack.appendChild(li.cloneNode(true));
        refTrack.appendChild(li.cloneNode(true));
      });

      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        window.addEventListener('load', function () {
          var gap = parseFloat(getComputedStyle(refTrack).gap) || 0;
          // width of one set (the original cards) + its trailing gap = seamless loop distance
          var setWidth = originals.reduce(function (sum, li) {
            return sum + li.offsetWidth + gap;
          }, 0);

          refTrack.style.animation = 'none'; // replace the CSS keyframes (they assume 2 sets)
          refTrack.animate(
            [
              { transform: 'translateX(0)' },
              { transform: 'translateX(-' + setWidth + 'px)' }
            ],
            { duration: 55000, iterations: Infinity }
          );
        });
      }
    }

  })(window.jQuery);
