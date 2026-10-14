/* «Типы проектов» — физика шариков: Верле с гравитацией, упругие стены, попарное
   расталкивание в несколько подшагов; после падения сила расталкивания растёт.
   Стартует, когда блок попадает в экран (IntersectionObserver). */
(function () {
  "use strict";

  var section = document.querySelector(".skills-canvas");
  if (!section) return;

  var list = section.querySelector(".skills-balls");
  if (!list) return;

  // диаметр шарика относительно ширины холста: мобильный / десктоп
  function diameterRatio() {
    return W < 500 ? 0.2743 : 0.1103;
  }
  function fontRatio() {
    return W < 500 ? 0.2083 : 0.16;
  }
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var words = Array.prototype.map.call(list.querySelectorAll("li"), function (li) {
    return li.textContent.trim();
  });
  if (!words.length) return;

  list.classList.add("skills-balls--hidden");

  var canvas = document.createElement("canvas");
  canvas.className = "skills-physics-canvas";
  section.appendChild(canvas);
  var ctx = canvas.getContext("2d");

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0,
    H = 0;

  function resizeCanvas() {
    var rect = section.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = Math.ceil(W * dpr);
    canvas.height = Math.ceil(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    RADIUS = (W * diameterRatio()) / 2;
    BIG_RADIUS = RADIUS * 1.35;
    balls.forEach(function (b) {
      if (!b.dragged) b.r = b.big ? BIG_RADIUS : RADIUS;
      b.restR = RADIUS;
    });
  }

  function rr(a, b) {
    return a + Math.random() * (b - a);
  }

  var RADIUS = 0,
    BIG_RADIUS = 0;
  var GRAVITY = 0.6,
    INTEGRATE = 0.45,
    PUSH_FORCE = 0.003;
  var FALLEN_GRAVITY = 0.1,
    FALLEN_INTEGRATE = 0.4,
    FALLEN_FORCE = 0.08;
  var RESTITUTION = 0.3;
  var SUBSTEPS = 6;

  var balls = [];
  var fallen = false;
  var mouse = { x: -9999, y: -9999, down: false };
  var dragTarget = null;
  var anyHover = false;

  function Ball(x, y, label) {
    this.x = x;
    this.y = y;
    this.px = x;
    this.py = y;
    this.r = RADIUS;
    this.restR = RADIUS;
    this.label = label.toUpperCase();
    this.hover = false;
    this.dragged = false;
    this.big = false;
    this.fy = 0;
  }

  function spawnAll() {
    words.forEach(function (word, i) {
      setTimeout(function () {
        var x = rr(RADIUS + 4, Math.max(RADIUS + 5, W - RADIUS - 4));
        var y = rr(-H * 0.45, -H * 0.18);
        balls.push(new Ball(x, y, word));
      }, i * 275);
    });
  }

  function integrate(b, dt) {
    if (b.dragged) return;
    var g = fallen ? FALLEN_GRAVITY : GRAVITY;
    b.fy += g;
    var dt2 = dt * dt;
    b.y += b.fy * dt2;
    b.fy = 0;
    var nx = 2 * b.x - b.px;
    var ny = 2 * b.y - b.py;
    b.px = b.x;
    b.py = b.y;
    b.x = nx;
    b.y = ny;
  }

  function resolveEdges(b) {
    if (b.dragged) return;
    if (b.x < b.r) {
      var dvx = b.px - b.x;
      b.x = b.r;
      b.px = b.x - dvx * RESTITUTION;
    } else if (b.x + b.r > W) {
      var dvx2 = b.px - b.x;
      b.x = W - b.r;
      b.px = b.x - dvx2 * RESTITUTION;
    }
    if (!fallen) {
      if (b.y < -b.r * 2.2) {
        var dvy = b.py - b.y;
        b.y = -b.r * 1.5;
        b.py = b.y - dvy * RESTITUTION;
      }
    } else if (b.y < b.r) {
      var dvy2 = b.py - b.y;
      b.y = b.r;
      b.py = b.y - dvy2 * RESTITUTION;
    }
    if (b.y + b.r > H) {
      var dvy3 = b.py - b.y;
      b.y = H - b.r;
      b.py = b.y - dvy3 * RESTITUTION;
    }
  }

  function resolveCollisions() {
    var force = fallen ? FALLEN_FORCE : PUSH_FORCE;
    for (var i = 0; i < balls.length; i++) {
      var a = balls[i];
      for (var j = i + 1; j < balls.length; j++) {
        var b = balls[j];
        if (a.dragged && b.dragged) continue;
        var dx = a.x - b.x,
          dy = a.y - b.y;
        var dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
        var overlap = dist - (a.r + b.r);
        if (overlap < 0) {
          var nx = dx / dist,
            ny = dy / dist;
          var push = -overlap * force;
          if (!a.dragged) {
            a.x += nx * push;
            a.y += ny * push;
          }
          if (!b.dragged) {
            b.x -= nx * push;
            b.y -= ny * push;
          }
        }
      }
    }
  }

  function checkFallen() {
    if (fallen || balls.length < words.length) return;
    var settled = balls.every(function (b) {
      return b.y > b.r;
    });
    if (settled) fallen = true;
  }

  function step() {
    if (!balls.length) return;
    var dt = (fallen ? FALLEN_INTEGRATE : INTEGRATE) / SUBSTEPS;
    for (var s = 0; s < SUBSTEPS; s++) {
      balls.forEach(function (b) {
        integrate(b, dt);
        resolveEdges(b);
      });
      resolveCollisions();
      balls.forEach(resolveEdges);
      resolveCollisions();
      balls.forEach(resolveEdges);
    }
    checkFallen();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    balls.forEach(function (b) {
      // плавный рост/усадка радиуса при драге
      var targetR = b.dragged || b.big ? BIG_RADIUS : b.restR;
      b.r += (targetR - b.r) * 0.2;

      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      if (b.hover) {
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "#36a9e2";
        ctx.stroke();
        ctx.fillStyle = "#000";
      } else {
        // непрозрачный чёрный — чтобы фон не просвечивал сквозь обводку
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#000";
        ctx.stroke();
        ctx.fillStyle = "#000";
      }

      var fontSize = Math.max(9, b.r * fontRatio());
      ctx.font = fontSize + "px 'GT America Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(b.label, b.x, b.y);
    });
  }

  function updateHoverFromMouse() {
    var hovered = null;
    for (var i = balls.length - 1; i >= 0; i--) {
      var b = balls[i];
      var dx = mouse.x - b.x,
        dy = mouse.y - b.y;
      b.hover = Math.sqrt(dx * dx + dy * dy) < b.r;
      if (b.hover && !hovered) hovered = b;
    }
    var nowHover = !!hovered;
    if (nowHover !== anyHover) {
      anyHover = nowHover;
      window.__setCursorBig(anyHover);
    }
    return hovered;
  }

  function toCanvasPoint(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  canvas.addEventListener("pointermove", function (e) {
    var p = toCanvasPoint(e.clientX, e.clientY);
    mouse.x = p.x;
    mouse.y = p.y;
    if (dragTarget) {
      dragTarget.x = mouse.x;
      dragTarget.y = mouse.y;
    } else {
      updateHoverFromMouse();
    }
  });

  canvas.addEventListener("pointerdown", function (e) {
    var hovered = updateHoverFromMouse();
    if (hovered) {
      dragTarget = hovered;
      dragTarget.dragged = true;
      dragTarget.big = true;
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    }
  });

  function releaseDrag() {
    if (dragTarget) {
      dragTarget.dragged = false;
      dragTarget.big = false;
      dragTarget.px = dragTarget.x;
      dragTarget.py = dragTarget.y;
      dragTarget = null;
    }
  }
  canvas.addEventListener("pointerup", releaseDrag);
  canvas.addEventListener("pointercancel", releaseDrag);
  canvas.addEventListener("pointerleave", function () {
    if (!dragTarget) {
      balls.forEach(function (b) {
        b.hover = false;
      });
      if (anyHover) {
        anyHover = false;
        window.__setCursorBig(false);
      }
    }
  });

  var running = true;
  function loop() {
    if (running) {
      if (!reduceMotion) step();
      draw();
    }
    requestAnimationFrame(loop);
  }

  var ro = window.ResizeObserver
    ? new ResizeObserver(function () {
        resizeCanvas();
      })
    : null;
  if (ro) ro.observe(section);
  else window.addEventListener("resize", resizeCanvas);

  document.addEventListener("visibilitychange", function () {
    running = document.visibilityState === "visible";
  });

  resizeCanvas();

  var spawned = false;
  function trySpawn() {
    if (spawned) return;
    spawned = true;
    spawnAll();
  }

  if (window.IntersectionObserver) {
    var spawnObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            trySpawn();
            spawnObserver.disconnect();
          }
        });
      },
      { threshold: 0.2 }
    );
    spawnObserver.observe(section);
  } else {
    trySpawn(); // нет IntersectionObserver — сразу
  }

  requestAnimationFrame(loop);

  // хук для QA/отладки (не используется в проде)
  window.__skillsDebug = function () {
    return balls.map(function (b) {
      return { x: b.x, y: b.y, r: b.r, label: b.label, fallen: fallen };
    });
  };
})();
