/* ===== РАУНД 27: карточки кейса "выезжают" при скролле (референс klyuse.com) =====
   Лена прислала исходник klyuse.com — у них карточки "вылетают из стопки" на своё место
   в коллаже через IntersectionObserver, с сдвигом/поворотом и разным выездом по порядку
   (armWide/armNarrow). Переношу ту же идею на наши .case-photo/.case-card-meta/.case-caption
   внутри .case-canvas — сначала (первым сообщением) просили только Yandex/Thothex/eng flow,
   следующим сообщением добавили и Young Con, поэтому теперь работает на всех 4 кейс-страницах.

   У Young Con подписи устроены по-другому, чем у трёх остальных — не .case-card-meta
   (картинка+разделитель+теги), а отдельный .case-caption ("(1)/(2)/(3)/(4)" + текст раздела,
   их на странице всего 4 шт., а не по одной на каждое фото) — оба класса участвуют в анимации.

   .case-carousel-arrow (стрелки карусели на карточке Yandex Cloud) намеренно НЕ входят в
   анимацию — это элементы управления, должны оставаться всегда видимыми и кликабельными,
   а не прятаться/выезжать вместе с контентом.

   Каждая карточка получает свой IntersectionObserver и появляется именно в момент, когда
   до неё реально доскроллили — не все разом при открытии страницы (та же идея, что и в
   js/skills-balls.js: анимация стартует по месту, а не сразу). Сторона выезда (слева/
   справа) чередуется по порядку в разметке — он же примерно порядок расположения в
   коллаже (см. background-position в HTML/Figma Dev Mode), поэтому соседние по разметке
   карточки обычно соседние и визуально. */
(function () {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!window.IntersectionObserver) return; // без него коллаж остаётся как есть, без скрытия

  var canvases = document.querySelectorAll(
    ".case-canvas--young-con, .case-canvas--yandex, .case-canvas--thothex, .case-canvas--eng-flow"
  );
  if (!canvases.length) return;

  canvases.forEach(function (canvas) {
    /* РАУНД 32: было canvas.children + filter (прямые дети) — ломалось для карточек,
       обёрнутых в .case-gallery/.case-photo-pair/.case-photo-offset (Young Con) или
       .case-card-group (Yandex, см. yandex.html и case.css): .case-photo/.case-card-meta
       там больше не прямые дети .case-canvas, а внуки через обёртку (display:contents на
       десктопе её визуально не меняет, но DOM-дерево для querySelector — меняет, та же
       история, что и с CSS-селекторами выше). querySelectorAll ищет по всему поддереву,
       так что обёртки больше не важны — порядок (querySelectorAll отдаёт в document order)
       и состав элементов остаются теми же, что и раньше. */
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

/* Yandex и eng flow, десктоп: итоговый текст поднимается внутрь коллажа так, чтобы его нижний
   край был вровень с нижним краем последней карточки (Yandex — «Дизайн для верстки», eng flow —
   «Экспертные посты»; см. .case-outro-note--inset в case.css). Низ карточки берём через
   offsetTop/offsetHeight (а не getBoundingClientRect) — на них не влияет transform анимации
   выезда выше, пока карточка ещё не "доехала". Отдельный IIFE — тот, что выше, выходит раньше
   при prefers-reduced-motion, а выравнивание нужно всегда.
   arrowGap — если задан, стрелка «наверх» ставится на столько px ниже карточки (eng flow);
   без него — отступ блока из CSS (Yandex: стрелка сразу под коллажем). */
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

/* Thothex, десктоп: от низа последнего кейса (самый нижний элемент коллажа — обычно подпись
   карточки «баннеры» справа) до итогового текста — ровно GAP px. Под ним в коллаже остаётся
   пустое место (высота коллажа в %, подпись в px), его и вычитаем, плюс flex-gap самого
   .case-wrap (19px). Как и у Yandex выше — offsetTop/offsetHeight, не зависят от transform
   анимации выезда. Только >1100px (РАУНД 54: было >860 — до 1100 теперь планшетная раскладка без
   коллажа, см. case.css): ниже коллаж — обычный список, отступ из CSS. */
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

/* РАУНД 38 (мягкая прокрутка кнопки "наверх") здесь была до РАУНДА 41 — теперь это делает
   js/smooth-scroll.js через общий Lenis-скролл всего сайта (см. комментарий там), отдельный
   ручной scrollTo тут больше не нужен и мешал бы (две независимые анимации прокрутки
   одновременно). */
