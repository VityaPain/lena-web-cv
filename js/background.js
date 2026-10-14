/* Фон: value-noise шейдер (два слоя шума, масштабированные расстоянием до центра и левого
   нижнего угла, + зерно, через smoothstep). Результат f идёт не в цвет, а в альфу одного
   цвета #36A9E2 — на светлой странице получается лёгкое голубое облако. */
(function () {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var canvas = document.createElement("canvas");
  canvas.id = "bg-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.insertBefore(canvas, document.body.firstChild);

  // preserveDrawingBuffer: кадры копятся без gl.clear(), и фон не мигает при пропуске кадра
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
    // без аспект-коррекции намеренно
    "  vec2 uv = gl_FragCoord.xy / uRes;" +
    "  float t = uTime;" +
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
    // степень 1.5 гасит слабые места шума (почти весь экран белый), пик альфы 0.6
    "  float alpha = pow(f, 1.5) * 0.6;" +
    // premultiplied alpha — так его ждёт WebGL-холст по умолчанию, иначе цвет уходит в бирюзу
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

  // #36A9E2
  gl.uniform3f(uColor, 54 / 255, 169 / 255, 226 / 255);

  /* Кадры накладываются без gl.clear() — сглаживает зерно во времени. Постоянный вес
     нового кадра одинаков для цвета и альфы, поэтому в буфере всегда #36A9E2 × альфа. */
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
