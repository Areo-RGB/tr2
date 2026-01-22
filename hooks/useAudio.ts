import { useCallback } from 'react';

// Singleton context and buffer cache
let audioCtx: AudioContext | null = null;
let beepBuffer: AudioBuffer | null = null;
let isFetchingBeep = false;
const BEEP_URL = 'https://video-idea.fra1.cdn.digitaloceanspaces.com/beeps/beep-short.mp3';

export const useAudio = () => {
  const initAudio = useCallback(() => {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }, []);

  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.1) => {
    const ctx = initAudio();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  }, [initAudio]);

  const loadBeep = useCallback(async () => {
    if (beepBuffer || isFetchingBeep) return;
    isFetchingBeep = true;
    try {
        const ctx = initAudio();
        const response = await fetch(BEEP_URL);
        const arrayBuffer = await response.arrayBuffer();
        beepBuffer = await ctx.decodeAudioData(arrayBuffer);
    } catch (e) {
        console.warn('Error loading beep sound:', e);
    } finally {
        isFetchingBeep = false;
    }
  }, [initAudio]);

  const playBeep = useCallback((freq = 600, duration = 0.1) => {
    const ctx = initAudio();
    
    if (beepBuffer) {
        const source = ctx.createBufferSource();
        source.buffer = beepBuffer;
        const gainNode = ctx.createGain();
        gainNode.gain.value = 0.6;
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start(0);
    } else {
        // Start loading if not already
        loadBeep();
        // Fallback to synthesized tone
        playTone(freq, duration, 'sine', 0.1);
    }
  }, [initAudio, loadBeep, playTone]);

  const playSuccess = useCallback(() => {
    playTone(500, 0.1, 'sine', 0.1);
    setTimeout(() => playTone(800, 0.2, 'sine', 0.1), 100);
  }, [playTone]);

  const playFailure = useCallback(() => {
    playTone(300, 0.2, 'sawtooth', 0.1);
    setTimeout(() => playTone(200, 0.3, 'sawtooth', 0.1), 200);
  }, [playTone]);

  return { playBeep, playSuccess, playFailure };
};