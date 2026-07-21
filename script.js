/* ===========================================================
   The Forbidden Tome — interaction & atmosphere
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
  const soundIcon = soundToggle.querySelector(".sound-icon");

  const incantation =
    "Hush now, little reader — you have turned the final page.\n" +
    "The words upon this leaf were carved by hands long rotted,\n" +
    "and every soul that reads them is remembered by the dark.\n" +
    "It knows your name. It always has.\n" +
    "Do not look behind you.";

  /* ---------------- Ambient audio (Web Audio API) ---------------- */
  let audioCtx = null;
  let audioOn = false;
  let droneNodes = [];

  function buildDrone() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    const master = audioCtx.createGain();
    master.gain.value = 0.0;
    master.connect(audioCtx.destination);

    // two detuned low oscillators for an uneasy drone
    [55, 58.2, 82.4].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      osc.type = i === 2 ? "triangle" : "sine";
      osc.frequency.value = freq;

      const g = audioCtx.createGain();
      g.gain.value = i === 2 ? 0.05 : 0.12;

      // slow tremolo
      const lfo = audioCtx.createOscillator();
      lfo.frequency.value = 0.07 + i * 0.03;
      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = 0.04;
      lfo.connect(lfoGain);
      lfoGain.connect(g.gain);

      osc.connect(g);
      g.connect(master);
      osc.start();
      lfo.start();
      droneNodes.push(osc, lfo);
    });

    // filtered noise = distant wind / hiss
    const bufferSize = 2 * audioCtx.sampleRate;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let seed = 12345;
    for (let i = 0; i < bufferSize; i++) {
      // deterministic pseudo-noise
      seed = (seed * 16807) % 2147483647;
      output[i] = ((seed / 2147483647) * 2 - 1) * 0.5;
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.value = 320;
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.value = 0.08;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);
    noise.start();
    droneNodes.push(noise);

    // fade in
    master.gain.linearRampToValueAtTime(0.6, audioCtx.currentTime + 3);
    droneNodes.master = master;
  }

  function toggleSound() {
    if (!audioCtx) {
      buildDrone();
      audioOn = true;
      soundIcon.textContent = "🔊";
      return;
    }
    if (audioOn) {
      droneNodes.master.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
      audioOn = false;
      soundIcon.textContent = "🔇";
    } else {
      audioCtx.resume();
      droneNodes.master.gain.linearRampToValueAtTime(0.6, audioCtx.currentTime + 1);
      audioOn = true;
      soundIcon.textContent = "🔊";
    }
  }

  soundToggle.addEventListener("click", toggleSound);

  /* ---------------- Typewriter incantation ---------------- */
  function typeIncantation(text, speed) {
    let i = 0;
    incantEl.textContent = "";
    (function tick() {
      if (i <= text.length) {
        incantEl.textContent = text.slice(0, i);
        i++;
        // vary the delay a little for an uneasy feel
        const jitter = text[i - 1] === "\n" ? 380 : speed + Math.abs(((i * 73) % 40) - 20);
        setTimeout(tick, jitter);
      } else {
        incantEl.classList.add("done");
        whisperEl.classList.add("show");
      }
    })();
  }

  /* ---------------- Entry sequence ---------------- */
  let entered = false;
  function enter() {
    if (entered) return;
    entered = true;

    // try to start ambient sound on this user gesture
    try {
      buildDrone();
      audioOn = true;
      soundIcon.textContent = "🔊";
    } catch (e) {
      /* autoplay blocked; user can toggle manually */
    }

    gate.classList.add("hidden");
    stage.classList.add("revealed");
    document.body.classList.add("shake");
    setTimeout(() => document.body.classList.remove("shake"), 600);

    // open the book after the reveal settles
    setTimeout(() => {
      book.classList.add("open");
    }, 1200);

    // begin the incantation once the cover has swung open
    setTimeout(() => {
      typeIncantation(incantation, 55);
    }, 3200);
  }

  enterBtn.addEventListener("click", enter);
  // allow Enter key too
  document.addEventListener("keydown", function (e) {
    if (!entered && (e.key === "Enter" || e.key === " ")) enter();
  });

  /* ---------------- Cursor-reactive parallax ---------------- */
  const stageEl = stage;
  window.addEventListener("mousemove", function (e) {
    if (!entered) return;
    const dx = (e.clientX / window.innerWidth - 0.5) * 6;
    const dy = (e.clientY / window.innerHeight - 0.5) * 4;
    stageEl.style.transform = `rotateX(${-dy}deg) rotateY(${dx}deg)`;
  });
})();
