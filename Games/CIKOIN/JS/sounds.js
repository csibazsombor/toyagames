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
function beep(freq = 765, duration = 80) {
  if (!audioCtx) return; // wait for click first

  const oscillator = audioCtx.createOscillator();
  oscillator.type = "square";
  oscillator.frequency.value = freq;

  oscillator.connect(audioCtx.destination);
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + duration / 1000);
}