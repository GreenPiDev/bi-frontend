/** Yeni bildirim sesi - ses dosyasi gerektirmez, Web Audio ile kisa bir "ding" uretir.
 * Tarayicilar kullanici etkilesimi olmadan sesi engeller; bu yuzden ilk tikla/tusa basista
 * AudioContext "unlock" edilir. Engellenirse sessizce yutulur (bildirimin kendisi etkilenmez). */
let audioContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
  }
  return audioContext;
}

export function installNotificationSoundUnlock(): () => void {
  const unlock = () => {
    const ctx = getContext();
    if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
  return () => {
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
}

const REPEAT_COUNT = 2;
const REPEAT_GAP_SECONDS = 0.35;

export function playNotificationSound(): void {
  try {
    const ctx = getContext();
    if (!ctx || ctx.state !== 'running') return;
    for (let repeat = 0; repeat < REPEAT_COUNT; repeat += 1) {
      const start = ctx.currentTime + repeat * REPEAT_GAP_SECONDS;
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);
      // Iki notali kisa "ding-dong": 880 Hz -> 1320 Hz
      [880, 1320].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start + i * 0.12);
        osc.connect(gain);
        osc.start(start + i * 0.12);
        osc.stop(start + i * 0.12 + 0.35);
      });
    }
  } catch {
    // Ses calinamamasi bildirim akisini bozmamali.
  }
}
