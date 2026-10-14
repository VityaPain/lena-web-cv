/* Плавная прокрутка через Lenis. Lenis крутит настоящий window scroll (не transform),
   поэтому scrollY/IntersectionObserver в других скриптах работают как обычно. */
(function () {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (typeof window.Lenis !== "function") return; // нет библиотеки — обычный scroll

  var lenis = new window.Lenis({
    smoothWheel: true,
    autoRaf: true,
  });

  window.__lenis = lenis;

  // наверх — медленнее дефолтного lerp: длительность 1.2–2.4с по расстоянию, easeInOutCubic
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function scrollToTop() {
    var duration = Math.min(2.4, Math.max(1.2, window.scrollY / 2500));
    lenis.scrollTo(0, { duration: duration, easing: easeInOutCubic });
  }
  window.__scrollToTop = scrollToTop;

  /* Якоря обрабатываем сами, а не через anchors:true Lenis: на кейсах нет элемента #top,
     и Lenis ничего бы не сделал. */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    var hash = a.getAttribute("href");
    if (!hash || hash === "#") return;

    a.addEventListener("click", function (e) {
      if (hash === "#top") {
        e.preventDefault();
        scrollToTop();
        return;
      }
      var target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target);
    });
  });
})();
