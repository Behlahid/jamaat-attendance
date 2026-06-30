'use client';

// Singleton AudioContext so we don't hit browser limits
let audioCtx = null;

function initAudio() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(frequency, type, duration, vol = 0.1) {
  const ctx = initAudio();
  if (!ctx) return;
  
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  
  gainNode.gain.setValueAtTime(vol, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
  
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export function playSuccess() {
  playTone(880, 'sine', 0.1);
  setTimeout(() => playTone(1108.73, 'sine', 0.2), 100);
}

export function playLate() {
  playTone(440, 'sine', 0.2, 0.15);
}

export function playError() {
  playTone(150, 'sawtooth', 0.4, 0.2);
}
