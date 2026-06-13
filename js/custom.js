
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

  })(window.jQuery);
