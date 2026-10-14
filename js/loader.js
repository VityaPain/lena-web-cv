/* Экран загрузки: виден сразу через CSS, прячется после window.load, но не раньше MIN_VISIBLE
   (чтобы не мелькал из кэша); FALLBACK — на случай, если какой-то ресурс не догрузится. */
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
    // сигнал для nav.js — запустить scramble заголовка
    document.dispatchEvent(new CustomEvent("loader:hidden"));
    screen.addEventListener("transitionend", function onEnd() {
      screen.removeEventListener("transitionend", onEnd);
      screen.hidden = true;
    });
    // если transitionend не придёт (например, при reduced-motion)
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
