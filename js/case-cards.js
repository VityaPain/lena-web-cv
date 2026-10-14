/* Карточки кейса «выезжают» при скролле: у каждой свой IntersectionObserver,
   сторона выезда чередуется по порядку в разметке. */
(function () {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!window.IntersectionObserver) return; // без него коллаж остаётся как есть, без скрытия

  var canvases = document.querySelectorAll(
    ".case-canvas--young-con, .case-canvas--yandex, .case-canvas--thothex, .case-canvas--eng-flow"
  );
  if (!canvases.length) return;

  canvases.forEach(function (canvas) {
    // по всему поддереву — часть карточек лежит в обёртках
    var items = Array.prototype.slice.call(
      canvas.querySelectorAll(".case-photo, .case-card-meta, .case-caption")
    );
    if (!items.length) return;

    canvas.classList.add("case-canvas--card-reveal");

    items.forEach(function (item, i) {
      var fromRight = i % 2 === 1;
      item.style.setProperty("--card-reveal-x", fromRight ? "28px" : "-28px");
      item.style.setProperty("--card-reveal-r", fromRight ? "2.5deg" : "-2.5deg");
      item.style.setProperty("--card-reveal-delay", (i % 5) * 0.07 + "s");
    });

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );

    items.forEach(function (item) {
      observer.observe(item);
    });
  });
})();

/* Yandex и eng flow, только десктоп (≥1101px): низ итогового текста — вровень с низом последней
   карточки. offsetTop/offsetHeight, т.к. на них не влияет transform анимации выезда.
   arrowGap — отступ стрелки «наверх» под карточкой (если не задан — из CSS). */
(function () {
  "use strict";

  var desktop = window.matchMedia("(min-width: 1101px)");

  function insetOutro(page, arrowGap) {
    var canvas = document.querySelector(".case-canvas--" + page);
    var note = document.querySelector(".case-wrap--" + page + " .case-outro-note");
    if (!canvas || !note) return;

    var metas = canvas.querySelectorAll(".case-card-meta");
    var last = metas[metas.length - 1];
    if (!last) return;

    function align() {
      if (!desktop.matches) {
        note.style.removeProperty("--outro-lift");
        note.style.removeProperty("margin-top");
        return;
      }
      var metaBottomInCanvas = last.offsetTop + last.offsetHeight;
      if (arrowGap !== undefined) {
        var wrapGap = parseFloat(getComputedStyle(note.parentNode).rowGap) || 0;
        note.style.marginTop =
          arrowGap - wrapGap - (canvas.offsetHeight - metaBottomInCanvas) + "px";
      }
      var metaBottom = canvas.getBoundingClientRect().top + metaBottomInCanvas;
      var noteBottom = note.getBoundingClientRect().bottom;
      note.style.setProperty("--outro-lift", noteBottom - metaBottom + "px");
    }

    align();
    window.addEventListener("resize", align);
    window.addEventListener("load", align);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(align);
    if (window.ResizeObserver) new ResizeObserver(align).observe(last);
  }

  insetOutro("yandex");
  insetOutro("eng-flow", 40);
})();

/* Thothex, только десктоп (≥1101px): итоговый текст ровно на GAP px ниже самого нижнего
   элемента коллажа (offsetTop/offsetHeight — не зависят от transform анимации). */
(function () {
  "use strict";

  var GAP = 8;
  var canvas = document.querySelector(".case-canvas--thothex");
  var note = document.querySelector(".case-wrap--thothex .case-outro-note");
  if (!canvas || !note) return;

  var items = canvas.querySelectorAll(".case-photo, .case-card-meta");
  var desktop = window.matchMedia("(min-width: 1101px)");

  function align() {
    if (!desktop.matches) {
      note.style.removeProperty("margin-top");
      return;
    }
    var lowest = 0;
    items.forEach(function (el) {
      if (el.offsetParent !== canvas) return; // скрытые (display:none) и прочие — мимо
      lowest = Math.max(lowest, el.offsetTop + el.offsetHeight);
    });
    var wrapGap = parseFloat(getComputedStyle(note.parentNode).rowGap) || 0;
    note.style.marginTop = GAP - wrapGap - (canvas.offsetHeight - lowest) + "px";
  }

  align();
  window.addEventListener("resize", align);
  window.addEventListener("load", align);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(align);
})();
