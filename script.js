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
  const soundToggle = document.getElementById("soundToggle");
  const soundState = soundToggle.querySelector(".sound-state");
  const howlBtns = document.querySelectorAll("[data-howl]");

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
        alpha: 0.08 + (1 - depth) * 0.11, // distant fog reads a touch denser
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
      // moonlit blue-grey fog
      const b = 150 + Math.floor(p.tint * 40);
      g.addColorStop(0, "rgba(" + (b + 20) + "," + (b + 25) + "," + (b + 40) + "," + p.alpha + ")");
      g.addColorStop(0.5, "rgba(" + b + "," + (b + 8) + "," + (b + 24) + "," + (p.alpha * 0.5) + ")");
      g.addColorStop(1, "rgba(" + b + "," + b + "," + (b + 20) + ",0)");
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
  let ctx = null;
  let ambientOn = false;
  let ambientMaster = null;
  let ambientNodes = [];

  function ensureCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  /* --- Ambient wind / night drone --- */
  function startAmbient() {
    ensureCtx();
    ambientMaster = ctx.createGain();
    ambientMaster.gain.value = 0.0001;
    ambientMaster.connect(ctx.destination);

    [52, 55.5, 78].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 2 ? "triangle" : "sine";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = i === 2 ? 0.04 : 0.1;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.06 + i * 0.025;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.035;
      lfo.connect(lfoGain); lfoGain.connect(g.gain);
      osc.connect(g); g.connect(ambientMaster);
      osc.start(); lfo.start();
      ambientNodes.push(osc, lfo);
    });

    // filtered noise = wind over the moor
    const len = 2 * ctx.sampleRate;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let s = 99173;
    for (let i = 0; i < len; i++) {
      s = (s * 16807) % 2147483647;
      data[i] = ((s / 2147483647) * 2 - 1) * 0.5;
    }
    const wind = ctx.createBufferSource();
    wind.buffer = buf; wind.loop = true;
    const wf = ctx.createBiquadFilter();
    wf.type = "lowpass"; wf.frequency.value = 380;
    const wfLfo = ctx.createOscillator();     // gusts
    wfLfo.frequency.value = 0.08;
    const wfLfoGain = ctx.createGain();
    wfLfoGain.gain.value = 160;
    wfLfo.connect(wfLfoGain); wfLfoGain.connect(wf.frequency);
    const wg = ctx.createGain(); wg.gain.value = 0.09;
    wind.connect(wf); wf.connect(wg); wg.connect(ambientMaster);
    wind.start(); wfLfo.start();
    ambientNodes.push(wind, wfLfo);

    ambientMaster.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 3);
    ambientOn = true;
    reflectAmbient();
  }

  function stopAmbient() {
    if (!ctx || !ambientMaster) return;
    ambientMaster.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    const dead = ambientNodes.slice();
    setTimeout(() => dead.forEach(n => { try { n.stop(); } catch (e) {} }), 800);
    ambientNodes = [];
    ambientOn = false;
    reflectAmbient();
  }

  function toggleAmbient() {
    if (ambientOn) stopAmbient(); else startAmbient();
  }
  function reflectAmbient() {
    soundState.textContent = ambientOn ? "on" : "off";
    soundToggle.setAttribute("aria-pressed", String(ambientOn));
  }

  /* --- Werewolf howl (synthesised) --- */
  function playHowl() {
    ensureCtx();
    const t = ctx.currentTime;
    const dur = 2.7;

    const out = ctx.createGain();
    out.gain.value = 0.0001;

    // canyon echo tail
    const delay = ctx.createDelay(1.0);
    delay.delayTime.value = 0.32;
    const fb = ctx.createGain(); fb.gain.value = 0.32;
    const echoMix = ctx.createGain(); echoMix.gain.value = 0.45;
    out.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(echoMix);
    out.connect(ctx.destination);
    echoMix.connect(ctx.destination);

    // vowel formant (the "aa-ooo")
    const formant = ctx.createBiquadFilter();
    formant.type = "bandpass"; formant.Q.value = 3.5;
    formant.frequency.setValueAtTime(720, t);
    formant.frequency.linearRampToValueAtTime(1050, t + 0.6);
    formant.frequency.linearRampToValueAtTime(560, t + dur);
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass"; tone.frequency.value = 2600;
    tone.connect(formant); formant.connect(out);

    // pitch contour: rise, waver, fall — like a real howl
    function contour(osc, mult) {
      const f = osc.frequency;
      f.setValueAtTime(300 * mult, t);
      f.exponentialRampToValueAtTime(520 * mult, t + 0.45);
      f.exponentialRampToValueAtTime(500 * mult, t + 1.7);
      f.exponentialRampToValueAtTime(250 * mult, t + dur);
    }

    // vibrato
    const vib = ctx.createOscillator();
    vib.frequency.value = 5.2;
    const vibGain = ctx.createGain();
    vibGain.gain.setValueAtTime(4, t);
    vibGain.gain.linearRampToValueAtTime(14, t + 1.0);
    vib.connect(vibGain);

    // detuned sawtooth voices for a rich, throaty tone
    [{ type: "sawtooth", det: 0, m: 1, g: 0.5 },
     { type: "sawtooth", det: -7, m: 1, g: 0.34 },
     { type: "sawtooth", det: 9, m: 1, g: 0.30 },
     { type: "triangle", det: 0, m: 2, g: 0.14 }].forEach(v => {
      const osc = ctx.createOscillator();
      osc.type = v.type;
      osc.detune.value = v.det;
      contour(osc, v.m);
      vibGain.connect(osc.frequency);
      const g = ctx.createGain(); g.gain.value = v.g;
      osc.connect(g); g.connect(tone);
      osc.start(t); osc.stop(t + dur + 0.05);
    });
    vib.start(t); vib.stop(t + dur + 0.05);

    // breath at the tail
    const bl = 0.7 * ctx.sampleRate;
    const bbuf = ctx.createBuffer(1, bl, ctx.sampleRate);
    const bd = bbuf.getChannelData(0);
    let bs = 4242;
    for (let i = 0; i < bl; i++) { bs = (bs * 16807) % 2147483647; bd[i] = ((bs / 2147483647) * 2 - 1); }
    const breath = ctx.createBufferSource(); breath.buffer = bbuf;
    const bf = ctx.createBiquadFilter(); bf.type = "bandpass"; bf.frequency.value = 1100; bf.Q.value = 0.8;
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.0001, t + dur - 0.9);
    bg.gain.linearRampToValueAtTime(0.06, t + dur - 0.5);
    bg.gain.linearRampToValueAtTime(0.0001, t + dur + 0.2);
    breath.connect(bf); bf.connect(bg); bg.connect(out);
    breath.start(t + dur - 0.9);

    // overall amplitude envelope
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.5, t + 0.28);
    out.gain.setValueAtTime(0.5, t + 1.7);
    out.gain.exponentialRampToValueAtTime(0.28, t + dur - 0.2);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.35);
  }

  soundToggle.addEventListener("click", toggleAmbient);
  howlBtns.forEach(b => b.addEventListener("click", playHowl));

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

    try { startAmbient(); } catch (e) { /* autoplay blocked; toggle manually */ }

    gate.classList.add("hidden");
    stage.classList.add("revealed");
    document.body.classList.add("shake");
    setTimeout(() => document.body.classList.remove("shake"), 600);

    setTimeout(() => book.classList.add("open"), 1200);

    // a lone howl greets you as the book falls open
    setTimeout(() => { try { playHowl(); } catch (e) {} }, 2600);

    // the passage writes itself once the cover has swung wide
    setTimeout(() => typePassage(passage, 55), 3400);
  }

  enterBtn.addEventListener("click", enter);
  document.addEventListener("keydown", function (e) {
    if (!entered && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); enter(); }
  });

  /* ================= Cursor parallax ================= */
  window.addEventListener("mousemove", function (e) {
    if (!entered) return;
    const dx = (e.clientX / window.innerWidth - 0.5) * 6;
    const dy = (e.clientY / window.innerHeight - 0.5) * 4;
    stage.style.transform = "rotateX(" + (-dy) + "deg) rotateY(" + dx + "deg)";
  });
})();
