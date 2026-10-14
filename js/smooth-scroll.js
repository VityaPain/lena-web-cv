/* ===== РАУНД 41: мягкая инерционная прокрутка всего сайта (референс signal-a.studio) =====
   У signal-a.studio под капотом библиотека Lenis (проверено в их же бандле — window.Lenis
   есть, на <html> висит класс "lenis"). Подключаем ту же версию (1.1.20), но храним файл
   у себя в js/vendor/ — сайт и так самодостаточный (шрифты, иконки локально), без CDN.

   Lenis перехватывает колесо/тачпад и плавно "довозит" scroll с лёгкой инерцией вместо
   резких шагов — но крутит НАСТОЯЩИЙ window.scroll (не через transform на обёртке, как
   Locomotive Scroll), поэтому всё, что завязано на обычный scroll, продолжает работать без
   переделки: прилипающий/прячущийся хедер (nav.js — syncTop()/onScroll читают window.scrollY
   каждый кадр) и анимация выезда карточек кейса (case-cards.js — IntersectionObserver следит
   за видимостью элементов, ему неважно, как именно меняется scroll).

   Якорные ссылки (#works/#about/#contacts в хедере, #top у кнопки "наверх" внизу кейса) —
   встроенный anchors:true у Lenis сам ищет элемент через querySelector(href), а у "наверх"
   на кейс-страницах элемента с id="top" нет (там этот фрагмент работает за счёт спецправила
   самого HTML — скролл к началу документа), так что библиотека тихо ничего бы не сделала.
   Поэтому якоря обрабатываем сами через lenis.scrollTo() — предсказуемо работает везде,
   и заодно то же место, где раньше (РАУНД 38) был отдельный ручной обработчик "наверх" в
   case-cards.js — теперь не нужен, убран оттуда, чтобы не крутить страницу двумя разными
   анимациями одновременно (нативный scrollTo вперемешку с Lenis). */
(function () {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (typeof window.Lenis !== "function") return; // библиотека не подгрузилась — остаётся обычный scroll

  var lenis = new window.Lenis({
    smoothWheel: true,
    autoRaf: true,
  });

  window.__lenis = lenis;

  /* РАУНД 66: прокрутка наверх (стрелка внизу кейса и т.п.) — медленнее и мягче, по просьбе
     Лены: по умолчанию Lenis довозит через lerp, и с низа длинной страницы это пролетало почти
     мгновенно. Здесь — явная длительность (растёт с расстоянием, 1.2–2.4с) и плавный разгон/
     торможение (easeInOutCubic). */
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function scrollToTop() {
    var duration = Math.min(2.4, Math.max(1.2, window.scrollY / 2500));
    lenis.scrollTo(0, { duration: duration, easing: easeInOutCubic });
  }
  window.__scrollToTop = scrollToTop;

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
      if (!target) return; // нет такого якоря на этой странице — пусть браузер делает что хочет
      e.preventDefault();
      lenis.scrollTo(target);
    });
  });
})();
