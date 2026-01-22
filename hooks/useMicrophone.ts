import { useState, useEffect, useRef } from 'react';

interface UseMicrophoneProps {
  threshold: number;
  cooldown: number;
  active: boolean;
  onTrigger: () => void;
}

export const useMicrophone = ({ threshold, cooldown, active, onTrigger }: UseMicrophoneProps) => {
  const [level, setLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTriggerTime = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      // Cleanup if inactive
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setLevel(0);
      return;
    }

    const initMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContext();
        audioContextRef.current = audioCtx;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        sourceRef.current = source;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          if (!analyserRef.current) return;

          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Calculate average volume
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          
          // Normalize (approximate max 255 but usually lower for voice)
          const normalizedLevel = Math.min(100, (average / 128) * 100);
          setLevel(normalizedLevel);

          const now = Date.now();
          if (normalizedLevel > threshold && (now - lastTriggerTime.current > cooldown)) {
            lastTriggerTime.current = now;
            onTrigger();
          }

          rafRef.current = requestAnimationFrame(tick);
        };

        tick();

      } catch (err) {
        console.error("Error accessing microphone", err);
        // Ensure cleanup if error occurs during setup
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      }
    };

    initMic();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [active, threshold, cooldown, onTrigger]);

  return { level };
};