/* ===== хедер — анимация пунктов меню (РАУНД 27) =====
   Смена символов (scramble) при наведении на 4 пункта меню (работы/обо мне/контакты/cv) —
   та же идея, что была в РАУНДЕ 16-17 (chriskalafatis.com), с той же замедленной скоростью,
   которую Лена попросила в РАУНДЕ 17 (было слишком быстро на первой версии): старт разброса по
   буквам растянут до ~22 кадров, сама смена символов — 20-40 кадров (~0.7-1.1с на 60fps), а не
   8-18 кадров (~0.3-0.5с), как в самой первой версии.

   Маска-инверсия (mix-blend-mode:difference) и подчёркивание при наведении — это чистый CSS
   (см. .nav-links a / .nav-links a::after в main.css), сюда их заводить не нужно.

   Намеренно НЕ трогаю position хедера (остаётся как есть, в обычном потоке страницы) — прежние
   баги с маской были именно от смены position на fixed/absolute ради прилипания при скролле,
   которое в этом раунде не просили.

   ===== РАУНД 35: тот же эффект — на названиях работ и "тексте рядом" (факты/теги) на
   главной, и на почте/соцсетях в футере (референс signal-a.studio, по просьбе Лены).
   Раньше scramble() умел работать только с "плоским" элементом (просто текст, без вложенных
   тегов) — перезаписывал el.textContent целиком. .work-title (внутри <span class="work-number">
   для "2026" — другой шрифт/размер, см. main.css) и .work-meta (внутри — .work-facts со
   span'ами и .work-tags с <li>) так ломать нельзя: текст слетит в одну строку без вёрстки.
   Поэтому ниже — scrambleTree(root): находит ВСЕ текстовые узлы внутри root (TreeWalker,
   не трогая сами элементы/теги) и анимирует каждый по отдельности, так что разметка/стили
   не задеты, а теги/строки фактов рассыпаются каждая сама по себе (как и выглядит на
   signal-a.studio — весь блок "декодируется" сразу, а не по одному слову). */
/* WebKit (Safari на Mac, любой браузер на iOS): маска-инверсия хедера там не работает — см.
   комментарий у html.is-webkit в main.css. Отдельный IIFE до основного: тот выходит раньше
   при prefers-reduced-motion, а класс нужен всегда. Определяем по navigator.vendor, а не по
   user-agent: у Safari и у ВСЕХ браузеров на iOS (они все на WebKit) там "Apple Computer,
   Inc.", у Chrome/Edge/Opera — "Google Inc.", у Firefox — пусто. Раньше было по UA — и Chrome
   в режиме эмуляции iPhone (DevTools) подставлял UA айфона, получал чёрную шапку вместо
   инверсии, хотя сам инверсию умеет. vendor эмуляция не меняет. */
(function () {
  if (/Apple/.test(navigator.vendor || "")) {
    document.documentElement.classList.add("is-webkit");
  }

  /* РАУНД 46: на тач-устройствах хедер — position:sticky (см. html.touch-nav в конце
     main.css). И top=scrollY из syncTop() (РАУНД 28), и position:fixed (РАУНД 45) на iPhone
     дёргались: первый отстаёт от прокрутки пальцем, второй Safari в iOS 26 сам сдвигает на
     несколько px, пока сворачивает панель с адресом (WebKit bug 297779). sticky — часть
     обычного потока, браузер прокручивает его вместе со страницей. Для этого хедер должен
     стоять в начале <body> (sticky держится, только пока родитель на экране, а в конце body
     он бы "прилип" лишь в самом низу страницы) — переносим его туда. Порядок в разметке
     был нужен только для блендинга без z-index (комментарий у .hero-nav в main.css), а на
     тач-устройствах блендинга нет, z-index есть. Здесь, а не в основном IIFE: тот выходит
     раньше при prefers-reduced-motion, а перенос нужен всегда. Медиа-запрос — тот же, что
     у курсора (cursor.js). */
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

  var ORIGINAL = new WeakMap(); // текстовый узел → исходный текст (на случай повторного наведения во время анимации)
  var SCRAMBLING = new WeakSet(); // текстовые узлы, которые сейчас анимируются

  // РАУНД 44: у заголовка на главной и названия проекта на кейсах (оба "набираются" сами
  // при первой загрузке, см. РАУНДЫ 40/43) буквы менялись слишком долго — Лена попросила
  // покороче. Это тот же scrambleNode, что и у наведений (меню, карточки и т.п.), просто со
  // вторым параметром fast=true — окна случайного старта/длительности смены укорочены вдвое,
  // наведения мышью (onHover ниже) вызывают scrambleTree без него и остаются как были.
  function scrambleNode(node, fast) {
    if (SCRAMBLING.has(node)) return; // уже бежит — не перезапускаем поверх себя
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

  // все непустые текстовые узлы внутри root, независимо от глубины вложенности —
  // элементы/теги (span.work-number, li и т.п.) не трогаем, только содержимое
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

  /* главная: название работы + факты/теги справа — весь .work-row целиком, одним наведением
     (ссылка на всю строку, см. index.html) */
  onHover(".work-row");

  /* футер (на всех страницах): почта и ссылки на соцсети — каждая сама по себе, как пункты
     меню выше. ".contacts-link--pending" (linkedin, ждём ссылку от Лены) намеренно не
     анимируется — он и так приглушён/некликабелен, скремблинг тут выглядел бы как рабочая
     ссылка */
  onHover(".contacts-email");
  onHover(".contacts-links a");

  /* страницы кейсов: текст "сайт"/"тг канал" (первая строка фактов) и "ссылка" у карточек —
     подчёркивание рядом в case.css (РАУНД 39), тут только смена символов, тем же общим
     механизмом. Стрелка .case-facts-arrow не включена — просили только сам текст. */
  onHover(".case-facts-row--first a:not(.case-facts-arrow)");
  onHover(".case-card-link");

  /* ===== РАУНД 40: название проекта (.case-title, Figma нода 12:3958) "набирается" само —
     не по наведению, а один раз при первой загрузке страницы кейса. .case-title есть только
     на 4 страницах кейсов (на главной — .hero/.work-title, их не трогаем), поэтому на index.html
     просто ничего не найдётся и строка ниже тихо ничего не сделает. */
  var caseTitle = document.querySelector(".case-title");
  if (caseTitle) {
    scrambleTree(caseTitle, true);
  }

  /* ===== РАУНД 43: тот же приём — теперь у заголовка на главной (.hero-headline,
     Figma ноды 12:2988/12:2989/12:2990 — те же три строки "Графический И WEB дизайнер: /
     от бренда с нуля до феста / для десяти тысяч человек"). Заголовок продублирован на
     десктопную и мобильную вёрстку (.hero-lines--desktop/--mobile, см. main.css — показана
     только одна по медиа-запросу), скрамблим обе версии, чтобы эффект был независимо от
     ширины экрана. Скрытый для скринридеров <h1 class="sr-only"> с тем же текстом не трогаем —
     скрамбл на лету ломал бы его для screen reader'ов.

     На главной есть экран загрузки (.loading-screen, см. loader.js) — если запустить
     анимацию сразу вместе с остальным скриптом, она пройдёт незаметно под гифкой и к моменту
     открытия экрана буквы уже "осядут". Поэтому ждём кастомный loader:hidden (шлёт loader.js
     в hide()) и стартуем именно в этот момент. На страницах кейсов экрана загрузки нет
     (.loading-screen в разметке отсутствует) — там .hero-headline тоже не найдётся, так что
     весь блок просто тихо ничего не делает. */
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

  /* ===== РАУНД 28: хедер снова "прилипает" к верху экрана и мягко прячется/появляется
     при скролле (референс chriskalafatis.com, как и было в РАУНДАХ 16-18 до полного отката
     в РАУНДЕ 19) — см. подробный комментарий в main.css у .hero-nav про оба прошлых урока:
     top=scrollY вместо position:fixed (не ломает mix-blend-mode), margin-top вместо transform
     для самой анимации скрытия (не провоцирует GPU-слой, который тоже ломает блендинг). */
  var nav = document.querySelector(".hero-nav");
  if (!nav) return;

  // кнопка "(меню)" на мобильном — отдельный полноэкранный слой, см. IIFE в конце файла

  function updateNavHeight() {
    document.documentElement.style.setProperty("--nav-h", nav.offsetHeight + "px");
  }
  updateNavHeight();
  window.addEventListener("resize", updateNavHeight);

  /* РАУНД 45-46: на тач-устройствах хедер — position:sticky (см. IIFE с is-webkit выше),
     его держит сам браузер, syncTop там не нужен. */
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

  // РАУНД 45: направление меняем только после сдвига больше порога — иначе мелкие
  // откаты прокрутки (инерция, "резинка" на iOS, дрожание пальца) заставляли хедер
  // мигать туда-обратно
  var DIR_THRESHOLD = 8;

  function onScroll() {
    var y = window.scrollY;
    if (y <= nav.offsetHeight) {
      // у самого верха страницы хедер всегда виден
      setHidden(false);
      lastY = y;
      return;
    }
    if (Math.abs(y - lastY) < DIR_THRESHOLD) return; // копим сдвиг, lastY не трогаем
    setHidden(y > lastY); // вниз — прячем, вверх — показываем
    lastY = y;
  }
  window.addEventListener("scroll", onScroll, { passive: true });
})();

/* ===== мобильное меню (≤480px): кнопка "(меню)" открывает полноэкранный слой поверх всего
   интерфейса — он "выплывает" кругом из точки, где стоит сама кнопка (правый верхний угол),
   и расширяется, пока не закроет весь экран (clip-path: circle, см. .mobile-menu в main.css).
   Слой — отдельный элемент в конце <body>, а не часть .hero-nav: ему нужен z-index, а у
   хедера z-index ломает маску-инверсию (см. комментарий у .hero-nav в main.css).
   Содержимое по макету (Figma, "iPhone 16 - 1"): сверху — лого + "(закрыть)" (как хедер),
   по центру — 4 ссылки меню, внизу — соцсети и почта (как мобильный футер). Всё это —
   копии уже существующих лого хедера, .nav-links и футера .contacts, чтобы не дублировать
   разметку на 5 страницах.
   Отдельный IIFE: основной выше выходит раньше при prefers-reduced-motion, а меню нужно всегда
   (при reduced-motion анимация в CSS заменена на простое появление). */
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

  // верх — как хедер: лого слева, "(закрыть)" справа на месте "(меню)"
  var top = document.createElement("div");
  top.className = "mobile-menu-top";
  if (logo) top.appendChild(logo.cloneNode(true));

  var closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "mobile-menu-close";
  closeBtn.textContent = "(закрыть)";
  top.appendChild(closeBtn);

  // центр — ссылки меню
  var list = document.createElement("nav");
  list.className = "mobile-menu-links";
  source.querySelectorAll("a").forEach(function (a, i) {
    var link = a.cloneNode(true);
    link.className = "mobile-menu-link";
    link.style.setProperty("--i", i); // порядковый номер — для поочерёдного появления
    list.appendChild(link);
  });

  menu.appendChild(top);
  menu.appendChild(list);

  // низ — соцсети и почта (копия футера; id убираем, чтобы не было двух #contacts)
  if (footer) {
    var bottom = footer.cloneNode(true);
    bottom.removeAttribute("id");
    bottom.classList.add("mobile-menu-contacts");
    bottom.style.setProperty("--i", list.children.length);
    menu.appendChild(bottom);
  }

  document.body.appendChild(menu);

  // пока меню закрыто, его ссылки/кнопки не должны ловить Tab
  var focusables = menu.querySelectorAll("a, button");
  function setFocusable(on) {
    focusables.forEach(function (el) {
      el.tabIndex = on ? 0 : -1;
    });
  }
  setFocusable(false);

  toggle.setAttribute("aria-controls", "mobile-menu");

  var isOpen = false;

  // центр круга — центр кнопки "(меню)"; радиус — до самого дальнего угла экрана,
  // чтобы круг гарантированно закрыл всё
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

  // прокрутку страницы (выключенную на время меню) возвращаем только ПОСЛЕ того, как круг
  // схлопнулся (0.7s — длительность clip-path в main.css). Если вернуть сразу при нажатии
  // "(закрыть)", в браузерах с полосой прокрутки она тут же появляется, окно становится уже,
  // и весь слой меню с текстом резко сдвигается прямо во время анимации закрытия.
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
    clearTimeout(unlockTimer); // открыли снова, пока круг ещё схлопывался — прокрутку не трогаем
    unlockTimer = null;
    // центр круга переставляем мгновенно (без transition) — иначе браузер сначала анимирует
    // сам переезд точки из значения по умолчанию, и круг растёт не из кнопки
    menu.style.transition = "none";
    place();
    menu.offsetWidth; // применить стартовую точку круга до начала анимации
    menu.style.transition = "";
    menu.classList.add("is-open");
    menu.setAttribute("aria-hidden", "false");
    toggle.setAttribute("aria-expanded", "true");
    document.documentElement.classList.add("mobile-menu-open");
    if (window.__lenis) window.__lenis.stop();
    setFocusable(true);
    closeBtn.focus({ preventScroll: true });
  }

  // unlockNow — вернуть прокрутку сразу (нужно, когда сразу после закрытия едем к разделу:
  // остановленный Lenis проигнорировал бы scrollTo)
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

  // любая ссылка в меню (пункты, лого, соцсети, почта) закрывает его. Якоря на этой же
  // странице (#works/#about/#contacts/#top на главной) — плавно едем к разделу тем же Lenis,
  // что и у ссылок в хедере (см. js/smooth-scroll.js). Ссылки на другую страницу
  // (index.html#works с кейсов), соцсети, почту и "cv" браузер обрабатывает сам.
  menu.addEventListener("click", function (e) {
    var a = e.target.closest("a");
    if (!a) return;
    var href = a.getAttribute("href") || "";
    var isHash = href.charAt(0) === "#" && href.length > 1;
    var target = isHash && href !== "#top" ? document.querySelector(href) : null;
    // если сразу едем к разделу — прокрутку возвращаем немедленно, иначе Lenis её проигнорирует
    close(false, href === "#top" || !!target);
    if (href === "#top") {
      e.preventDefault();
      if (window.__scrollToTop) window.__scrollToTop(); // та же мягкая прокрутка, что у стрелки (smooth-scroll.js)
      else window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!target) return;
    e.preventDefault();
    if (window.__lenis) window.__lenis.scrollTo(target);
    else target.scrollIntoView({ behavior: "smooth" });
  });

  // повернули телефон / растянули окно шире мобильной вёрстки — меню больше не нужно
  window.addEventListener("resize", function () {
    if (isOpen && window.innerWidth > 480) close(false, true);
  });
})();
