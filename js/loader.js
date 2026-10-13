/* ===== экран загрузки (РАУНД 36, нода Figma 217:10764 — гифка кота + "Loading...") =====
   Полноэкранный оверлей показывается сразу при открытии ЛЮБОЙ страницы сайта — он уже виден
   через чистый CSS (.loading-screen, см. main.css), без ожидания этого скрипта, поэтому даже
   если JS подгрузится с задержкой, мигания "голого" контента не будет.

   Прячется после того, как страница полностью загрузилась (window.load — дождались картинок
   и шрифтов) И прошло минимальное время показа (чтобы кот не мелькал на долю секунды при
   быстрой загрузке с кэшем — тогда анимацию никто не увидит). FALLBACK — защита на случай,
   если какой-то ресурс так и не догрузится: оверлей не должен зависнуть навсегда. */
(function () {
  "use strict";

  var screen = document.getElementById("loading-screen");
  if (!screen) return;

  document.body.classList.add("is-loading");

  var MIN_VISIBLE = 900; // ms
  var FALLBACK = 6000; // ms
  var shownAt = Date.now();
  var hidden = false;

  function hide() {
    if (hidden) return;
    hidden = true;
    screen.classList.add("is-hidden");
    document.body.classList.remove("is-loading");
    // РАУНД 43: сигнал для js/nav.js — заголовок на главной должен "набираться" сам
    // (scramble), но только когда экран загрузки реально исчез, а не пока гифка
    // всё ещё его закрывает (см. комментарий у .hero-headline в nav.js).
    document.dispatchEvent(new CustomEvent("loader:hidden"));
    screen.addEventListener("transitionend", function onEnd() {
      screen.removeEventListener("transitionend", onEnd);
      screen.hidden = true;
    });
    // на случай, если transitionend не придёт (prefers-reduced-motion отключает transition и т.п.)
    setTimeout(function () {
      screen.hidden = true;
    }, 700);
  }

  function ready() {
    var elapsed = Date.now() - shownAt;
    var wait = Math.max(0, MIN_VISIBLE - elapsed);
    setTimeout(hide, wait);
  }

  if (document.readyState === "complete") {
    ready();
  } else {
    window.addEventListener("load", ready);
  }

  setTimeout(hide, FALLBACK);
})();
