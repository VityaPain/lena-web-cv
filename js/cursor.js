/* Кастомный курсор: точка с плавным следованием (lerp), увеличивается на кликабельном.
   На тач-устройствах не создаётся. */
(function () {
  "use strict";

  // no-op заглушка всегда — её вызывают другие скрипты (например, canvas с шариками)
  window.__setCursorBig = window.__setCursorBig || function () {};

  if (window.matchMedia("(hover: none), (pointer: coarse)").matches) return;

  var wrap = document.createElement("div");
  wrap.className = "cursor";
  wrap.setAttribute("aria-hidden", "true");
  var dot = document.createElement("div");
  dot.className = "cursor-dot";
  wrap.appendChild(dot);
  document.documentElement.appendChild(wrap);
  document.documentElement.classList.add("has-custom-cursor");

  var pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  var target = { x: pos.x, y: pos.y };
  var ease = 0.2;
  var shown = false;

  function onMove(e) {
    target.x = e.clientX;
    target.y = e.clientY;
    if (!shown) {
      pos.x = target.x;
      pos.y = target.y;
      shown = true;
      wrap.classList.add("is-visible");
    }
  }

  window.addEventListener("mousemove", onMove, { passive: true });
  document.addEventListener("mouseleave", function () {
    wrap.classList.remove("is-visible");
  });
  document.addEventListener("mouseenter", function () {
    if (shown) wrap.classList.add("is-visible");
  });

  function tick() {
    pos.x += (target.x - pos.x) * ease;
    pos.y += (target.y - pos.y) * ease;
    wrap.style.transform = "translate3d(" + pos.x.toFixed(1) + "px," + pos.y.toFixed(1) + "px,0)";
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  window.__setCursorBig = function (on) {
    wrap.classList.toggle("is-hover", !!on);
  };

  var HOVER_SELECTOR = "a, button, .case-totop, [data-cursor-big]";

  document.addEventListener(
    "mouseover",
    function (e) {
      if (e.target && e.target.closest && e.target.closest(HOVER_SELECTOR)) {
        window.__setCursorBig(true);
      }
    },
    true
  );
  document.addEventListener(
    "mouseout",
    function (e) {
      if (e.target && e.target.closest && e.target.closest(HOVER_SELECTOR)) {
        // перешли на другой кликабельный элемент — не уменьшаем
        var to = e.relatedTarget;
        if (to && to.closest && to.closest(HOVER_SELECTOR)) return;
        window.__setCursorBig(false);
      }
    },
    true
  );
})();
