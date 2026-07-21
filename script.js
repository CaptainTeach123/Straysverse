/* ===========================================================
   The Strays — fog, moonlight, and a werewolf's howl
   =========================================================== */

(function () {
  "use strict";

  const gate = document.getElementById("gate");
  const enterBtn = document.getElementById("enterBtn");
  const stage = document.getElementById("stage");
  const book = document.getElementById("book");
  const incantEl = document.getElementById("incantation");
  const whisperEl = document.querySelector(".whisper");

  // give the title a hand-inked, uneven look (per-letter jitter)
  (function unevenize() {
    const el = document.querySelector(".gate-title");
    if (!el) return;
    const text = el.textContent;
    el.textContent = "";
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === " ") { el.appendChild(document.createTextNode(" ")); continue; }
      const s = document.createElement("span");
      s.className = "ltr";
      s.textContent = ch;
      const rot = ((i * 37) % 9) - 4;   // -4..4 deg
      const dy = ((i * 53) % 6) - 3;     // -3..2 px
      s.style.transform = "rotate(" + rot + "deg) translateY(" + dy + "px)";
      el.appendChild(s);
    }
  })();

  // narration for the opening (a deep, rich voice)
  const narration = new Audio("assets/narration.mp3");
  narration.preload = "auto";
  narration.volume = 0.95;
  function playNarration() {
    try {
      narration.currentTime = 0;
      const p = narration.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch (e) { /* ignore */ }
  }

  // passage as segments so one word can carry its own (bloody) styling
  const passageParts = [
    { text: "When Madness Reigns\nwho will be king... " },
    { text: "you", cls: "blood", slow: true },
    { text: "?" }
  ];

  /* ================= Fog canvas ================= */
  const fogCanvas = document.getElementById("fog");
  const fctx = fogCanvas.getContext("2d");
  let W = 0, H = 0, dpr = 1;
  const puffs = [];

  function sizeFog() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    fogCanvas.width = Math.floor(W * dpr);
    fogCanvas.height = Math.floor(H * dpr);
    fogCanvas.style.width = W + "px";
    fogCanvas.style.height = H + "px";
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // deterministic pseudo-random so we never call Math.random()
  let rngState = 20250101;
  function rnd() {
    rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
    return rngState / 0x7fffffff;
  }

  function makePuffs() {
    puffs.length = 0;
    const count = W < 700 ? 24 : 40;
    for (let i = 0; i < count; i++) {
      const depth = rnd();               // 0 = distant/slow, 1 = near/fast
      puffs.push({
        x: rnd() * (W + 400) - 200,
        y: rnd() * H,
        r: 140 + depth * 280,
        speed: 0.28 + depth * 1.25,       // wind blows to the right
        sway: 0.4 + rnd() * 0.9,
        phase: rnd() * Math.PI * 2,
        alpha: 0.1 + (1 - depth) * 0.14,  // distant fog reads a touch denser
        tint: rnd(),
      });
    }
  }

  let fogTime = 0;
  function drawFog() {
    fctx.clearRect(0, 0, W, H);
    fctx.globalCompositeOperation = "screen";
    fogTime += 0.016;
    for (const p of puffs) {
      p.x += p.speed;
      if (p.x - p.r > W + 60) {          // wrap back to the left edge
        p.x = -p.r - rnd() * 160;
        p.y = rnd() * H;
      }
      const y = p.y + Math.sin(fogTime * p.sway + p.phase) * 22;
      const g = fctx.createRadialGradient(p.x, y, 0, p.x, y, p.r);
      // warm sepia moonlit fog (matches the reference moon)
      const b = 120 + Math.floor(p.tint * 34);   // warm mid-tone
      const rC = b + 26, gC = b + 6, bC = b - 34; // red-forward, low blue
      g.addColorStop(0, "rgba(" + rC + "," + gC + "," + bC + "," + p.alpha + ")");
      g.addColorStop(0.5, "rgba(" + (rC - 12) + "," + (gC - 8) + "," + (bC - 6) + "," + (p.alpha * 0.5) + ")");
      g.addColorStop(1, "rgba(" + (rC - 12) + "," + (gC - 8) + "," + Math.max(0, bC - 6) + ",0)");
      fctx.fillStyle = g;
      fctx.beginPath();
      fctx.arc(p.x, y, p.r, 0, Math.PI * 2);
      fctx.fill();
    }
    requestAnimationFrame(drawFog);
  }

  sizeFog();
  makePuffs();
  window.addEventListener("resize", function () { sizeFog(); makePuffs(); });
  requestAnimationFrame(drawFog);

  /* ================= Audio ================= */

  // smoothly ramp an <audio> element's volume
  function fadeTo(audio, target, ms, done) {
    if (audio._fade) clearInterval(audio._fade);
    const steps = 30, dt = Math.max(16, ms / steps);
    const start = audio.volume;
    const delta = (target - start) / steps;
    let i = 0;
    audio._fade = setInterval(function () {
      i++;
      let v = start + delta * i;
      audio.volume = Math.max(0, Math.min(1, v));
      if (i >= steps) {
        clearInterval(audio._fade); audio._fade = null;
        if (done) done();
      }
    }, dt);
  }

  /* --- Breathing ambience (plays on the landing, fades out on entry) --- */
  const AMBIENCE_LEVEL = 0.55;
  const ambience = new Audio("assets/ambience.mp3");
  ambience.loop = true;
  ambience.preload = "auto";
  ambience.volume = 0;
  let ambienceStarted = false;

  const wakeEvents = ["pointerdown", "mousemove", "touchstart", "keydown"];
  function startAmbience() {
    if (ambienceStarted || entered) return;
    ambienceStarted = true;
    const p = ambience.play();
    if (p && typeof p.then === "function") {
      p.then(function () {
        fadeTo(ambience, AMBIENCE_LEVEL, 2500);
        wakeEvents.forEach(ev => window.removeEventListener(ev, startAmbience));
      }).catch(function () {
        ambienceStarted = false;   // blocked — let the next gesture try again
      });
    } else {
      fadeTo(ambience, AMBIENCE_LEVEL, 2500);
    }
  }
  // browsers block autoplay, so begin on the visitor's first interaction
  wakeEvents.forEach(ev => window.addEventListener(ev, startAmbience, { passive: true }));

  /* --- Werewolf howl (recorded sample) --- */
  const howlAudio = new Audio("assets/howl.mp3");
  howlAudio.preload = "auto";
  howlAudio.volume = 0.9;

  function playHowl() {
    try {
      howlAudio.currentTime = 0;
      const p = howlAudio.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch (e) { /* ignore */ }
  }

  /* ================= Typewriter ================= */
  const beginBtn = document.getElementById("beginBtn");
  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  const NARR_FALLBACK = 11.1;     // used only if the clip's real duration is unavailable
  const STROKE = 0.85;           // seconds a single underline takes to draw
  const STAG = 0.62;             // gap between the three strokes
  let seqStart = 0;              // wall-clock start of the narration+typing (ms)
  const elapsed = () => (seqStart ? (performance.now() - seqStart) / 1000 : 0);
  function atSec(sec, fn) { setTimeout(fn, Math.max(0, (sec - elapsed()) * 1000)); }

  function renderParts(n) {
    let rem = n, html = "";
    for (const p of passageParts) {
      if (rem <= 0) break;
      const take = Math.min(p.text.length, rem);
      const shown = esc(p.text.slice(0, take));
      html += p.cls ? '<span class="' + p.cls + '">' + shown + "</span>" : shown;
      rem -= take;
    }
    incantEl.innerHTML = html;
  }

  // type the passage over `totalMs`, so it can be paced to the narration
  function typePaced(totalMs, onDone) {
    const len = passageParts.map(p => p.text).join("").length;
    const per = Math.max(30, totalMs / len);
    let n = 0;
    incantEl.innerHTML = "";
    (function tick() {
      if (n <= len) {
        renderParts(n);
        n++;
        setTimeout(tick, per * (0.78 + ((n * 17) % 44) / 100)); // slight human jitter
      } else {
        incantEl.classList.add("done");
        if (whisperEl) whisperEl.classList.add("show");
        if (onDone) onDone();
      }
    })();
  }

  // draw three uneven blood underlines under "you"; the third finishes at time D
  function drawUnderlinesSynced(D) {
    const blood = incantEl.querySelector(".blood");
    if (!blood) { if (beginBtn) beginBtn.classList.add("show"); return; }
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "scratch");
    svg.setAttribute("viewBox", "0 0 100 22");
    svg.setAttribute("preserveAspectRatio", "none");
    const strokes = [
      "M2,5 C 18,3.4 34,6.8 52,4.6 S 84,6.4 98,5.1",
      "M2,12 C 22,13.9 41,10.3 60,12.7 S 87,10.8 98,12.3",
      "M3,19 C 21,17.4 45,20.7 64,18.4 S 90,20.2 97,19.1"
    ];
    const paths = strokes.map(d => {
      const pa = document.createElementNS(NS, "path");
      pa.setAttribute("d", d);
      pa.setAttribute("pathLength", "100");
      svg.appendChild(pa);
      return pa;
    });
    blood.appendChild(svg);
    const drip = document.createElement("i");
    drip.className = "drip";
    blood.appendChild(drip);

    // stroke k (0..2) starts so the last one finishes exactly at D
    paths.forEach((pa, k) => atSec(D - STROKE - (2 - k) * STAG, () => pa.classList.add("draw")));
    atSec(D - 0.05, () => drip.classList.add("run"));
    if (beginBtn) atSec(D + 0.6, () => beginBtn.classList.add("show"));
  }

  // start narration + typing together, timed so the final underline lands at the clip's end
  function startOpening() {
    const go = () => {
      const D = (isFinite(narration.duration) && narration.duration > 0.5)
        ? narration.duration : NARR_FALLBACK;
      seqStart = performance.now();
      playNarration();
      const firstStroke = D - STROKE - 2 * STAG;        // when strokes begin
      const typeEnd = Math.max(1.4, firstStroke - 0.35); // finish typing just before
      typePaced(typeEnd * 1000, () => drawUnderlinesSynced(D));
    };
    if (isFinite(narration.duration) && narration.duration > 0.5) go();
    else {
      let started = false;
      const once = () => { if (!started) { started = true; go(); } };
      narration.addEventListener("loadedmetadata", once, { once: true });
      setTimeout(once, 500); // fall back to the estimate if metadata never arrives
    }
  }

  /* ================= Entry sequence ================= */
  let entered = false;
  function enter() {
    if (entered) return;
    entered = true;

    // the breathing ambience fades away as you cross the threshold
    if (ambienceStarted) fadeTo(ambience, 0, 1400, function () { ambience.pause(); });

    // a werewolf's howl greets the click
    try { playHowl(); } catch (e) {}

    // drop the fog behind the book so it no longer drifts over the pages
    fogCanvas.style.zIndex = "5";

    gate.classList.add("hidden");
    stage.classList.add("revealed");

    // hold on the closed werewolf cover so it's clearly seen, THEN open it
    setTimeout(() => book.classList.add("open"), 2400);

    // once the cover is open, narration + typing begin together and are timed
    // so the final blood underline lands exactly as the clip ends
    setTimeout(startOpening, 4500);
  }

  enterBtn.addEventListener("click", enter);
  document.addEventListener("keydown", function (e) {
    if (!entered && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); enter(); }
    else if (entered && (e.key === "h" || e.key === "H")) { playHowl(); }
  });

  /* ================= Cursor parallax (rAF-throttled for smoothness) ======= */
  let parX = 0, parY = 0, parPending = false;
  function applyParallax() {
    parPending = false;
    stage.style.transform = "rotateX(" + (-parY) + "deg) rotateY(" + parX + "deg)";
  }
  window.addEventListener("mousemove", function (e) {
    if (!entered) return;
    parX = (e.clientX / window.innerWidth - 0.5) * 6;
    parY = (e.clientY / window.innerHeight - 0.5) * 4;
    if (!parPending) { parPending = true; requestAnimationFrame(applyParallax); }
  });
})();
