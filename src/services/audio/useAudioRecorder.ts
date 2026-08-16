import { useState, useRef, useEffect, useCallback } from 'react';
import {
  AudioRecordingState,
  AudioRecordingError,
  AudioRecordingResult,
  AudioRecorderOptions
} from './types';
import { AudioRecorderService } from './AudioRecorderService';

export interface UseAudioRecorderReturn {
  state: AudioRecordingState;
  isRecording: boolean;
  isProcessing: boolean;
  isReady: boolean;
  elapsedMs: number;
  elapsedSeconds: number;
  audioResult: AudioRecordingResult | null;
  error: AudioRecordingError | null;
  isSupported: boolean;
  startRecording: (options?: AudioRecorderOptions) => Promise<void>;
  stopRecording: () => Promise<AudioRecordingResult | null>;
  cancelRecording: () => void;
  resetRecording: () => void;
  clearError: () => void;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<AudioRecordingState>('idle');
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [audioResult, setAudioResult] = useState<AudioRecordingResult | null>(null);
  const [error, setError] = useState<AudioRecordingError | null>(null);

  const recorderRef = useRef<AudioRecorderService | null>(null);

  if (!recorderRef.current) {
    recorderRef.current = new AudioRecorderService();
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recorderRef.current) {
        recorderRef.current.cleanup();
      }
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetRecording = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.cleanup();
    }
    setState('idle');
    setElapsedMs(0);
    setAudioResult(null);
    setError(null);
  }, []);

  const startRecording = useCallback(
    async (options?: AudioRecorderOptions) => {
      if (!recorderRef.current) return;
      setError(null);
      setAudioResult(null);
      setElapsedMs(0);
      setState('requesting_permission');

      try {
        await recorderRef.current.start(options, (currentElapsedMs) => {
          setElapsedMs(currentElapsedMs);
        });
        setState('recording');
      } catch (err: any) {
        setState('error');
        setError(err as AudioRecordingError);
      }
    },
    []
  );

  const stopRecording = useCallback(async (): Promise<AudioRecordingResult | null> => {
    if (!recorderRef.current) return null;
    setState('processing');

    try {
      const result = await recorderRef.current.stop();
      setAudioResult(result);
      setState('ready');
      return result;
    } catch (err: any) {
      setState('error');
      setError(err as AudioRecordingError);
      return null;
    }
  }, []);

  const cancelRecording = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.cancel();
    }
    setState('idle');
    setElapsedMs(0);
    setAudioResult(null);
  }, []);

  return {
    state,
    isRecording: state === 'recording',
    isProcessing: state === 'processing',
    isReady: state === 'ready',
    elapsedMs,
    elapsedSeconds: Math.floor(elapsedMs / 1000),
    audioResult,
    error,
    isSupported: AudioRecorderService.isSupported(),
    startRecording,
    stopRecording,
    cancelRecording,
    resetRecording,
    clearError
  };
}
