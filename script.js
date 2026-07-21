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

  const passage =
    "They call us the Strays — the moon-touched, the wandering.\n" +
    "When the pale lantern swells full above the moor,\n" +
    "the old blood stirs, and gentle men recall their teeth.\n" +
    "Bar your door, dear reader. Draw the curtains close.\n" +
    "For tonight the pack is running, and the night is ours.";

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
    const count = W < 700 ? 20 : 34;
    for (let i = 0; i < count; i++) {
      const depth = rnd();               // 0 = distant/slow, 1 = near/fast
      puffs.push({
        x: rnd() * (W + 400) - 200,
        y: rnd() * H,
        r: 140 + depth * 280,
        speed: 0.28 + depth * 1.25,       // wind blows to the right
        sway: 0.4 + rnd() * 0.9,
        phase: rnd() * Math.PI * 2,
        alpha: 0.06 + (1 - depth) * 0.09, // distant fog reads a touch denser
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
  function typePassage(text, speed) {
    let i = 0;
    incantEl.textContent = "";
    (function tick() {
      if (i <= text.length) {
        incantEl.textContent = text.slice(0, i);
        i++;
        const jitter = text[i - 1] === "\n" ? 360 : speed + Math.abs(((i * 73) % 40) - 20);
        setTimeout(tick, jitter);
      } else {
        incantEl.classList.add("done");
        whisperEl.classList.add("show");
      }
    })();
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
    document.body.classList.add("shake");
    setTimeout(() => document.body.classList.remove("shake"), 600);

    setTimeout(() => book.classList.add("open"), 1200);

    // the passage writes itself once the cover has swung wide
    setTimeout(() => typePassage(passage, 55), 3400);
  }

  enterBtn.addEventListener("click", enter);
  document.addEventListener("keydown", function (e) {
    if (!entered && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); enter(); }
    else if (entered && (e.key === "h" || e.key === "H")) { playHowl(); }
  });

  /* ================= Cursor parallax ================= */
  window.addEventListener("mousemove", function (e) {
    if (!entered) return;
    const dx = (e.clientX / window.innerWidth - 0.5) * 6;
    const dy = (e.clientY / window.innerHeight - 0.5) * 4;
    stage.style.transform = "rotateX(" + (-dy) + "deg) rotateY(" + dx + "deg)";
  });
})();
