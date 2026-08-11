// Web Audio API Sound Synthesizer for POS Cashier Beeps
class SoundManager {
  constructor() {
    this.audioCtx = null;
  }

  init() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  // Crisp POS Scanner Beep when adding item to ticket
  playBeep() {
    try {
      this.init();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, this.audioCtx.currentTime); // C6 tone
      osc.frequency.exponentialRampToValueAtTime(1567.98, this.audioCtx.currentTime + 0.08); // G6 chime

      gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.08);
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }

  // Cha-Ching sound when confirming sale
  playChaChing() {
    try {
      this.init();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(987.77, now); // B5
      osc1.frequency.setValueAtTime(1318.51, now + 0.08); // E6
      
      osc2.frequency.setValueAtTime(1318.51, now + 0.08);
      osc2.frequency.setValueAtTime(1975.53, now + 0.16); // B6

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc1.start(now);
      osc2.start(now + 0.08);
      osc1.stop(now + 0.25);
      osc2.stop(now + 0.25);
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }
}

export const soundManager = new SoundManager();
