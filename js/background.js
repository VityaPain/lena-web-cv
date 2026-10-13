/* ===== фон с нойзом — порт НАСТОЯЩЕГО шейдера chriskalafatis.com (их реальные main.css/main.js,
   присланные Леной) =====
   Раньше (прошлый раунд) фон был собственной реконструкцией — 6 мягких кружков-заглушек через
   max(), придуманные вручную, не по их коду. Лена прислала настоящие исходники — внутри их
   addBg() нашёлся настоящий рецепт: два weight-центра (vc1 — центр холста 0.5/0.5, vc2 — левый
   нижний угол 0/1), от каждого считается расстояние до текущего пикселя (d1/d2), на эти расстояния
   масштабируется value-noise (тот же hash+билинейная интерполяция ns(), что и раньше), два слоя
   шума с разным масштабом (d1*2.0 и d2*2.5) и разным дрейфом по времени складываются, плюс
   примешивается зерно rand(uv+sin(time)) — и результат идёт через smoothstep(0,2,f). У них этим f
   через mix() выбирается между двумя тёмными цветами (почти чёрным и тёмно-серым) — это их тёмная
   тема, весь холст закрашен полностью (альфа всегда ~1). У нас светлая тема и один акцентный
   цвет — поэтому вместо смешивания двух цветов f напрямую идёт в альфу: один и тот же #36A9E2,
   прозрачность растёт в "густых" местах шума и падает до нуля в "пустых" — так на светлой
   странице остаётся лёгкое голубое облако, а не сплошная закраска. Обычный alpha-blend, без
   mix-blend-mode — маска-инверсия намеренно есть только на хедере (см. main.css/.hero-nav),
   нигде больше, включая сам фон и курсор (js/cursor.js). Деформацию шейдера через
   render-to-texture и шлейф спрайтов за курсором (их отдельная сложная 3D-сцена) сознательно не
   переносим — не обсуждалось отдельно, сильно увеличивает объём работы ради детали.

   РАУНД 19 (откат): пробовала поднять пик альфы, добавить отдельное резкое зерно по gl_FragCoord
   и подогнать внутреннее разрешение канваса под его CSS-размер (110vw/110vh) — Лена попросила
   вернуть "прошлый нойз", то есть именно эту версию ниже, как было после РАУНДА 18. Откатила
   все три правки РАУНДА 19 обратно.

   РАУНД 21 (временная замена): переделывала на 6 отдельных мягких кружков вместо этой заливки —
   Лена попросила "верни фон обратно", то есть вернуть именно эту версию (заливка по настоящему
   рецепту addBg(), как было после РАУНДА 18/20). Откатила.

   РАУНД 26: поднят пик альфы с pow(f,0.45)*0.6 до pow(f,0.45)*0.88 — на белой странице при
   альфе не выше 0.6 даже в самых "густых" местах облака итоговый смешанный цвет получался заметно
   светлее настоящего #36A9E2. Проверено поиском самого насыщенного пикселя на скриншоте:
   rgb(45,157,223) против целевого (54,169,226) — близко. Больше ничего не менялось.

   РАУНД 27 (откат по просьбе Лены): пробовала заменить градиент на плоскую заливку + починить
   найденные баги (отсутствие gl.clear(), неограниченный дрейф шума, рассинхрон разрешения canvas
   с его CSS-размером) — Лена попросила откатить всё целиком обратно к этой версии (РАУНД 26). */
(function () {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var canvas = document.createElement("canvas");
  canvas.id = "bg-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.insertBefore(canvas, document.body.firstChild);

  // preserveDrawingBuffer: true — без этого браузер имеет право сам стереть буфер
  // холста сразу после того, как показал его на экране (сброс в прозрачный чёрный),
  // и если наш следующий requestAnimationFrame чуть запаздывает (лагнул кадр, вкладка
  // на секунду ушла в фон и т.п.) — фон на миг становится полностью невидимым/мигает.
  // С preserveDrawingBuffer:true буфер остаётся как мы его нарисовали до следующей отрисовки.
  var glOpts = { preserveDrawingBuffer: true, antialias: false, alpha: true };
  var gl = canvas.getContext("webgl", glOpts) || canvas.getContext("experimental-webgl", glOpts);
  if (!gl) {
    canvas.remove();
    return;
  }

  var vertSrc =
    "attribute vec2 p;" +
    "void main(){ gl_Position = vec4(p, 0.0, 1.0); }";

  var fragSrc =
    "precision highp float;" +
    "uniform vec2 uRes;" +
    "uniform float uTime;" +
    "uniform vec3 uColor;" +
    "float rand(vec2 st){ return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }" +
    "float ns(vec2 p){" +
    "  vec2 ip = floor(p);" +
    "  vec2 u = fract(p);" +
    "  u = u*u*(3.0-2.0*u);" +
    "  float res = mix(" +
    "    mix(rand(ip), rand(ip+vec2(1.0,0.0)), u.x)," +
    "    mix(rand(ip+vec2(0.0,1.0)), rand(ip+vec2(1.0,1.0)), u.x), u.y);" +
    "  return res*res;" +
    "}" +
    "void main(){" +
    // без аспект-коррекции — буквально как vUv квада в их коде (0..1 по обеим осям,
    // поэтому на неквадратном экране пятна формы чуть вытянуты, это так и у них)
    "  vec2 uv = gl_FragCoord.xy / uRes;" +
    "  float t = uTime;" +
    // два "узла" — те же самые точки, что в настоящем addBg(): центр холста и левый нижний угол
    "  vec2 vc1 = vec2(0.5, 0.5);" +
    "  vec2 vc2 = vec2(0.0, 1.0);" +
    "  float d1 = distance(uv, vc1);" +
    "  float d2 = distance(uv, vc2);" +
    "  float gr = mix(-0.2, 0.2, rand(uv + sin(t)));" +
    "  vec2 mv = vec2(t * 0.05, t * -0.05);" +
    "  float f = ns(uv * d1 * 2.0 + mv);" +
    "  f += ns(uv * d2 * 2.5 + vec2(t * -0.075, t * 0.05));" +
    "  f += gr;" +
    "  f = smoothstep(0.0, 2.0, f);" +
    // РАУНД 26: пробовала поднять пик альфы с 0.6 до 0.88, чтобы цвет был ближе к настоящему
    // #36A9E2 даже в самых "густых" местах облака. РАУНД 27: Лена попросила вернуть обратно
    // прозрачность 60% — отменено, снова 0.6, как было в РАУНДЕ 18/20/22.
    // Степень 0.45 → 1.5: после исправления цвета (premultiplied, см. ниже) голубого стало
    // слишком много — Лена попросила, чтобы белого было очень много. Большая степень сильнее
    // гасит слабые места шума (белого на экране ~98% вместо ~26%; пробовали 0.7 — ~79%,
    // 0.9 — ~88%, 1.3 — ~96%), пик 0.6 в "густых" не тронут.
    "  float alpha = pow(f, 1.5) * 0.6;" +
    // цвет умножен на альфу (premultiplied) — так его ждёт WebGL-холст по умолчанию
    // (premultipliedAlpha:true). Без умножения браузер считал цвета "ярче" их альфы, каналы
    // G/B упирались в 255 и облако выходило бледно-бирюзовым, а не #36A9E2 (см. blendFunc ниже)
    "  gl_FragColor = vec4(uColor * alpha, alpha);" +
    "}";

  function compile(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn("bg shader error:", gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  var vs = compile(gl.VERTEX_SHADER, vertSrc);
  var fs = compile(gl.FRAGMENT_SHADER, fragSrc);
  if (!vs || !fs) {
    canvas.remove();
    return;
  }

  var program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("bg program link error:", gl.getProgramInfoLog(program));
    canvas.remove();
    return;
  }
  gl.useProgram(program);

  var quad = new Float32Array([-1, -1, 3, -1, -1, 3]);
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
  var pLoc = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(pLoc);
  gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);

  var uRes = gl.getUniformLocation(program, "uRes");
  var uTime = gl.getUniformLocation(program, "uTime");
  var uColor = gl.getUniformLocation(program, "uColor");

  // #36A9E2 -> 0..1; альфа считается в шейдере за пиксель (без маски/blend-mode — обычный alpha-blend)
  gl.uniform3f(uColor, 54 / 255, 169 / 255, 226 / 255);

  // Кадры по-прежнему накладываются друг на друга без gl.clear() — это сглаживает зерно во
  // времени (вид облака не меняется). Но раньше вес нового кадра был его же альфой
  // (SRC_ALPHA), а для самой альфы получалось альфа² — цвет и прозрачность копились с разной
  // скоростью, и на экране цвет "перевешивал" (бирюзовый оттенок вместо #36A9E2). Теперь у
  // цвета и альфы один и тот же постоянный вес — в буфере всегда ровно #36A9E2 × альфа.
  gl.enable(gl.BLEND);
  gl.blendColor(0, 0, 0, 0.15);
  gl.blendFunc(gl.CONSTANT_ALPHA, gl.ONE_MINUS_CONSTANT_ALPHA);

  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    var w = Math.ceil(window.innerWidth * dpr);
    var h = Math.ceil(window.innerHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
    }
  }
  resize();
  window.addEventListener("resize", resize);

  var start = performance.now();
  var visible = true;
  document.addEventListener("visibilitychange", function () {
    visible = document.visibilityState === "visible";
  });

  function frame(now) {
    if (visible) {
      var t = (now - start) / 1000;
      gl.uniform1f(uTime, t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
