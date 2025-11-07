let audioCtx;

// Create or resume audio context only after user interaction
document.addEventListener("click", () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
});

// Beep function
function beep(freq = 780, duration = 55) {
  if (!audioCtx) return; // wait for click first

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  // Use sine wave for softer sound
  oscillator.type = "sine";
  
  // Start at higher frequency and sweep down for cute effect
  oscillator.frequency.setValueAtTime(freq * 1.5, audioCtx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(freq, audioCtx.currentTime + duration / 1000);

  // Add fade out for softer end
  gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration / 1000);

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + duration / 1000);
}

function beep_start(duration = 130) {
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  const sampleRate = audioCtx.sampleRate;
  const len = Math.floor(sampleRate * (duration / 1000));

  // Soft splash noise
  const buffer = audioCtx.createBuffer(1, len, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const env = 1 - i / len;
    data[i] = (Math.random() * 2 - 1) * env * 0.2;
  }

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  const band = audioCtx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 4;
  band.frequency.setValueAtTime(1200, now);
  band.frequency.exponentialRampToValueAtTime(600, now + duration / 1000);

  // Main droplet tone
  const osc = audioCtx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1000, now);
  osc.frequency.exponentialRampToValueAtTime(350, now + duration / 1000);

  const toneLP = audioCtx.createBiquadFilter();
  toneLP.type = "lowpass";
  toneLP.frequency.setValueAtTime(1500, now);
  toneLP.frequency.exponentialRampToValueAtTime(900, now + duration / 1000);

  const toneGain = audioCtx.createGain();
  toneGain.gain.value = 0.45;

  const noiseGain = audioCtx.createGain();
  noiseGain.gain.value = 0.25;

  // EXTRA POP (final bubble)
  const pop = audioCtx.createOscillator();
  pop.type = "sine";

  const popGain = audioCtx.createGain();

  // Pop timing happens slightly after main decay
  const popTime = now + (duration / 1000) * 1.1;

  pop.frequency.setValueAtTime(500, popTime);
  pop.frequency.exponentialRampToValueAtTime(1600, popTime + 0.07);

  popGain.gain.setValueAtTime(0.0001, popTime);
  popGain.gain.exponentialRampToValueAtTime(0.9, popTime + 0.01);
  popGain.gain.exponentialRampToValueAtTime(0.0001, popTime + 0.12);

  // Master envelope
  const master = audioCtx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.8, now + 0.005);
  master.gain.exponentialRampToValueAtTime(0.001, now + duration / 1000);

  noise.connect(band);
  band.connect(noiseGain);
  noiseGain.connect(master);

  osc.connect(toneLP);
  toneLP.connect(toneGain);
  toneGain.connect(master);

  pop.connect(popGain);
  popGain.connect(master);

  master.connect(audioCtx.destination);

  noise.start(now);
  noise.stop(now + duration / 1000 + 0.02);

  osc.start(now);
  osc.stop(now + duration / 1000 + 0.02);

  pop.start(popTime);
  pop.stop(popTime + 0.15);
}
