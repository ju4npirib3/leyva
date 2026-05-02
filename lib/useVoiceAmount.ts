'use client';

import { useState, useRef } from 'react';
import { parseSpanishAmount } from './parseSpanishAmount';

export type VoiceStatus = 'idle' | 'listening' | 'processing';

export function useVoiceAmount(onAmount: (v: string) => void) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [error, setError] = useState('');
  const srRef = useRef<any>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function stopAll() {
    srRef.current?.abort();
    srRef.current = null;
    if (mrRef.current?.state === 'recording') mrRef.current.stop();
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus('idle');
  }

  async function startMediaRecorder() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType =
        MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
        MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' :
        MediaRecorder.isTypeSupported('audio/ogg;codecs=opus') ? 'audio/ogg;codecs=opus' :
        'audio/mp4';

      const mr = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (chunksRef.current.length === 0) { setStatus('idle'); return; }
        setStatus('processing');
        try {
          const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'webm';
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const fd = new FormData();
          fd.append('audio', blob, `rec.${ext}`);
          const res = await fetch('/api/transcribe', { method: 'POST', body: fd });
          if (!res.ok) throw new Error('api-error');
          const { transcript } = await res.json();
          const parsed = parseSpanishAmount(transcript);
          const num = parsed ? parseFloat(parsed) : NaN;
          if (num > 0) { onAmount(String(Math.round(num * 100) / 100)); setError(''); }
          else setError(`Escuché: "${transcript}" — intenta de nuevo`);
        } catch (err: any) {
          if (err.message === 'api-error') setError('Servicio de voz no disponible.');
          else setError('Error al procesar el audio.');
        } finally {
          setStatus('idle');
        }
      };
      mr.start();
      mrRef.current = mr;
      setStatus('listening');
      // Auto-stop after 5 seconds
      timerRef.current = setTimeout(() => {
        if (mrRef.current?.state === 'recording') mrRef.current.stop();
      }, 5000);
    } catch (err: any) {
      setStatus('idle');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Permiso de micrófono denegado. Permite el acceso en tu navegador.');
      } else {
        setError(`Error al acceder al micrófono: ${err.message ?? err.name}`);
      }
    }
  }

  async function start() {
    setError('');
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;

    if (!SR) {
      await startMediaRecorder();
      return;
    }

    const rec = new SR();
    rec.lang = 'es-MX';
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    rec.onstart = () => setStatus('listening');
    rec.onresult = (e: any) => {
      let parsed = '';
      for (let i = 0; i < e.results[0].length; i++) {
        parsed = parseSpanishAmount(e.results[0][i].transcript);
        if (parsed) break;
      }
      if (parsed) { onAmount(parsed); setError(''); }
      else setError(`Escuché: "${e.results[0][0].transcript}" — intenta de nuevo`);
    };
    rec.onerror = async (e: any) => {
      setStatus('idle');
      srRef.current = null;
      // Transparently fall back to MediaRecorder on permission/service errors
      if (e.error === 'service-not-allowed' || e.error === 'not-allowed') {
        await startMediaRecorder();
        return;
      }
      const msgs: Record<string, string> = {
        'audio-capture': 'No se detectó micrófono en este dispositivo.',
        'network': 'Error de red al procesar el audio.',
        'no-speech': '',
        'aborted': '',
      };
      const msg = msgs[e.error];
      if (msg === undefined) setError(`Error de micrófono: ${e.error}`);
      else if (msg) setError(msg);
    };
    rec.onend = () => { if (srRef.current) setStatus('idle'); };

    try {
      rec.start();
      srRef.current = rec;
    } catch (err: any) {
      srRef.current = null;
      if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
        await startMediaRecorder();
      } else {
        setError(`Error al iniciar micrófono: ${err.message ?? err.name}`);
      }
    }
  }

  function toggle() {
    if (status !== 'idle') stopAll();
    else start();
  }

  return { status, error, toggle, stopAll };
}
