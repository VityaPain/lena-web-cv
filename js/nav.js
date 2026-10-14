/* Хедер: scramble-анимация текста при наведении/загрузке, прилипание с автоскрытием, мобильное меню. */

/* Определяем WebKit по navigator.vendor, а не по UA: эмуляция iPhone в Chrome DevTools
   подменяет UA, но не vendor. Отдельный IIFE — класс нужен и при prefers-reduced-motion. */
(function () {
  if (/Apple/.test(navigator.vendor || "")) {
    document.documentElement.classList.add("is-webkit");
  }

  /* Тач-устройства: хедер — position:sticky (html.touch-nav), чтобы не дёргался на iOS.
     sticky держится, только пока родитель на экране, поэтому переносим <header> в начало body. */
  if (window.matchMedia("(hover: none), (pointer: coarse)").matches) {
    document.documentElement.classList.add("touch-nav");
    var nav = document.querySelector(".hero-nav");
    if (nav) document.body.insertBefore(nav, document.body.firstChild);
  }
})();

(function () {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var CHARS = "АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЭЮЯABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  var ORIGINAL = new WeakMap(); // текстовый узел → исходный текст
  var SCRAMBLING = new WeakSet(); // узлы, которые сейчас анимируются

  // fast=true — укороченная анимация (заголовки при загрузке)
  function scrambleNode(node, fast) {
    if (SCRAMBLING.has(node)) return;
    var original = ORIGINAL.get(node);
    if (original === undefined) {
      original = node.nodeValue;
      ORIGINAL.set(node, original);
    }
    SCRAMBLING.add(node);

    var chars = original.split("");
    var revealFrame = chars.map(function () {
      return Math.round(rand(0, fast ? 10 : 22));
    });
    var settleFrame = revealFrame.map(function (start) {
      return start + Math.round(rand(fast ? 10 : 20, fast ? 20 : 40));
    });
    var maxFrame = Math.max.apply(null, settleFrame);

    var frame = 0;
    function tick() {
      var out = "";
      for (var i = 0; i < chars.length; i++) {
        if (/\s/.test(chars[i])) {
          out += chars[i];
        } else if (frame >= settleFrame[i]) {
          out += chars[i];
        } else if (frame >= revealFrame[i]) {
          out += CHARS[Math.floor(Math.random() * CHARS.length)];
        } else {
          out += chars[i];
        }
      }
      node.nodeValue = out;
      frame++;
      if (frame <= maxFrame) {
        requestAnimationFrame(tick);
      } else {
        node.nodeValue = original;
        SCRAMBLING.delete(node);
      }
    }
    requestAnimationFrame(tick);
  }

  // анимируем только текстовые узлы, чтобы вложенная разметка (span, li) осталась целой
  function collectTextNodes(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    var n;
    while ((n = walker.nextNode())) {
      if (n.nodeValue && n.nodeValue.trim() !== "") nodes.push(n);
    }
    return nodes;
  }

  function scrambleTree(root, fast) {
    collectTextNodes(root).forEach(function (node) {
      scrambleNode(node, fast);
    });
  }

  function onHover(selector) {
    document.querySelectorAll(selector).forEach(function (el) {
      el.addEventListener("mouseenter", function () {
        scrambleTree(el);
      });
    });
  }

  onHover(".nav-links a");
  onHover(".work-row");
  onHover(".contacts-email");
  onHover(".contacts-links a");
  onHover(".case-facts-row--first a:not(.case-facts-arrow)");
  onHover(".case-card-link");

  // название кейса «набирается» один раз при загрузке
  var caseTitle = document.querySelector(".case-title");
  if (caseTitle) {
    scrambleTree(caseTitle, true);
  }

  /* Заголовок главной (обе версии — десктоп и мобильная; sr-only <h1> не трогаем).
     Ждём loader:hidden, иначе анимация пройдёт под экраном загрузки. */
  var heroHeadline = document.querySelector(".hero-headline");
  if (heroHeadline) {
    var heroDesktop = heroHeadline.querySelector(".hero-lines--desktop");
    var heroMobile = heroHeadline.querySelector(".hero-lines--mobile");
    var scrambleHero = function () {
      if (heroDesktop) scrambleTree(heroDesktop, true);
      if (heroMobile) scrambleTree(heroMobile, true);
    };
    if (document.getElementById("loading-screen")) {
      document.addEventListener("loader:hidden", scrambleHero, { once: true });
    } else {
      scrambleHero();
    }
  }

  /* Прилипающий хедер с автоскрытием. top=scrollY вместо position:fixed —
     fixed ломает mix-blend-mode (маску-инверсию). */
  var nav = document.querySelector(".hero-nav");
  if (!nav) return;

  function updateNavHeight() {
    document.documentElement.style.setProperty("--nav-h", nav.offsetHeight + "px");
  }
  updateNavHeight();
  window.addEventListener("resize", updateNavHeight);

  // на тач-устройствах хедер sticky (см. выше), syncTop не нужен
  var isTouch = document.documentElement.classList.contains("touch-nav");

  function syncTop() {
    nav.style.top = window.scrollY + "px";
    requestAnimationFrame(syncTop);
  }
  if (!isTouch) requestAnimationFrame(syncTop);

  var lastY = window.scrollY;
  var hidden = false;
  function setHidden(next) {
    if (next === hidden) return;
    hidden = next;
    nav.classList.toggle("nav-hidden", hidden);
  }

  // порог смены направления — чтобы инерция/«резинка» iOS не заставляли хедер мигать
  var DIR_THRESHOLD = 8;

  function onScroll() {
    var y = window.scrollY;
    if (y <= nav.offsetHeight) {
      setHidden(false);
      lastY = y;
      return;
    }
    if (Math.abs(y - lastY) < DIR_THRESHOLD) return; // копим сдвиг, lastY не трогаем
    setHidden(y > lastY);
    lastY = y;
  }
  window.addEventListener("scroll", onScroll, { passive: true });
})();

/* Мобильное меню (≤480px): полноэкранный слой, раскрывается кругом (clip-path) из кнопки.
   Отдельный элемент в конце body — ему нужен z-index, который у хедера ломает маску-инверсию. */
(function () {
  "use strict";

  var toggle = document.querySelector(".nav-menu-toggle");
  var source = document.querySelector(".hero-nav .nav-links");
  var logo = document.querySelector(".hero-nav .logo");
  var footer = document.querySelector("footer.contacts");
  if (!toggle || !source) return;

  var menu = document.createElement("div");
  menu.className = "mobile-menu";
  menu.id = "mobile-menu";
  menu.setAttribute("role", "dialog");
  menu.setAttribute("aria-modal", "true");
  menu.setAttribute("aria-label", "Меню");
  menu.setAttribute("aria-hidden", "true");

  var top = document.createElement("div");
  top.className = "mobile-menu-top";
  if (logo) top.appendChild(logo.cloneNode(true));

  var closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "mobile-menu-close";
  closeBtn.textContent = "(закрыть)";
  top.appendChild(closeBtn);

  var list = document.createElement("nav");
  list.className = "mobile-menu-links";
  source.querySelectorAll("a").forEach(function (a, i) {
    var link = a.cloneNode(true);
    link.className = "mobile-menu-link";
    link.style.setProperty("--i", i); // для поочерёдного появления
    list.appendChild(link);
  });

  menu.appendChild(top);
  menu.appendChild(list);

  // копия футера; id убираем, чтобы не было двух #contacts
  if (footer) {
    var bottom = footer.cloneNode(true);
    bottom.removeAttribute("id");
    bottom.classList.add("mobile-menu-contacts");
    bottom.style.setProperty("--i", list.children.length);
    menu.appendChild(bottom);
  }

  document.body.appendChild(menu);

  var focusables = menu.querySelectorAll("a, button");
  function setFocusable(on) {
    focusables.forEach(function (el) {
      el.tabIndex = on ? 0 : -1;
    });
  }
  setFocusable(false);

  toggle.setAttribute("aria-controls", "mobile-menu");

  var isOpen = false;

  // центр круга — кнопка, радиус — до дальнего угла экрана
  function place() {
    var r = toggle.getBoundingClientRect();
    var x = r.left + r.width / 2;
    var y = r.top + r.height / 2;
    var w = window.innerWidth;
    var h = window.innerHeight;
    var radius = Math.hypot(Math.max(x, w - x), Math.max(y, h - y));
    menu.style.setProperty("--menu-x", x + "px");
    menu.style.setProperty("--menu-y", y + "px");
    menu.style.setProperty("--menu-r", Math.ceil(radius) + "px");
  }

  /* Прокрутку возвращаем только после анимации закрытия (0.7s в CSS): иначе появившийся
     скроллбар сужает окно и меню дёргается посреди анимации. */
  var CLOSE_MS = 700;
  var unlockTimer = null;

  function unlockScroll() {
    clearTimeout(unlockTimer);
    unlockTimer = null;
    document.documentElement.classList.remove("mobile-menu-open");
    if (window.__lenis) window.__lenis.start();
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    clearTimeout(unlockTimer);
    unlockTimer = null;
    // центр круга ставим без transition, иначе круг растёт не из кнопки
    menu.style.transition = "none";
    place();
    menu.offsetWidth; // force reflow
    menu.style.transition = "";
    menu.classList.add("is-open");
    menu.setAttribute("aria-hidden", "false");
    toggle.setAttribute("aria-expanded", "true");
    document.documentElement.classList.add("mobile-menu-open");
    if (window.__lenis) window.__lenis.stop();
    setFocusable(true);
    closeBtn.focus({ preventScroll: true });
  }

  // unlockNow — сразу вернуть прокрутку (остановленный Lenis проигнорировал бы scrollTo)
  function close(returnFocus, unlockNow) {
    if (!isOpen) return;
    isOpen = false;
    menu.classList.remove("is-open");
    menu.setAttribute("aria-hidden", "true");
    toggle.setAttribute("aria-expanded", "false");
    setFocusable(false);
    if (returnFocus) toggle.focus({ preventScroll: true });
    if (unlockNow) unlockScroll();
    else unlockTimer = setTimeout(unlockScroll, CLOSE_MS);
  }

  toggle.addEventListener("click", open);
  closeBtn.addEventListener("click", function () {
    close(true);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") close(true);
  });

  // любая ссылка закрывает меню; якоря на этой странице — плавно через Lenis
  menu.addEventListener("click", function (e) {
    var a = e.target.closest("a");
    if (!a) return;
    var href = a.getAttribute("href") || "";
    var isHash = href.charAt(0) === "#" && href.length > 1;
    var target = isHash && href !== "#top" ? document.querySelector(href) : null;
    close(false, href === "#top" || !!target);
    if (href === "#top") {
      e.preventDefault();
      if (window.__scrollToTop) window.__scrollToTop();
      else window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!target) return;
    e.preventDefault();
    if (window.__lenis) window.__lenis.scrollTo(target);
    else target.scrollIntoView({ behavior: "smooth" });
  });

  window.addEventListener("resize", function () {
    if (isOpen && window.innerWidth > 480) close(false, true);
  });
})();
