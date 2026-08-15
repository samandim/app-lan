import React, { useState, useEffect, useRef } from 'react';
import { Exercise, SessionActivity, UserProfile } from '../types';
import { useAudioRecorder } from '../services/audio/useAudioRecorder';
import { SpeechToTextService, SpeechToTextResult } from '../services/stt/SpeechToTextService';
import { Mic, Square, Play, Pause, RotateCcw, Volume2, AlertCircle, Sparkles, CheckCircle2, Loader2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SpeakingShadowingCardProps {
  exercise: Exercise;
  activity: SessionActivity;
  userProfile?: UserProfile | null;
  hasChecked: boolean;
  isEvaluating: boolean;
  onVerify: (payloadJson: string) => void;
}

export const SpeakingShadowingCard: React.FC<SpeakingShadowingCardProps> = ({
  exercise,
  activity,
  userProfile,
  hasChecked,
  isEvaluating,
  onVerify
}) => {
  const isPersian = userProfile?.supportLanguage === 'fa';
  const referenceSentence = exercise.audioText || exercise.prompt || exercise.correctAnswer;
  const targetTerm = exercise.targetAssetTerm || exercise.highlightText || activity.targetAssetTerm;

  const {
    state: recorderState,
    isRecording,
    isProcessing,
    isReady,
    elapsedSeconds,
    audioResult,
    error: recordError,
    startRecording,
    stopRecording,
    cancelRecording,
    resetRecording,
    clearError
  } = useAudioRecorder();

  const [isPlayingModelAudio, setIsPlayingModelAudio] = useState<boolean>(false);
  const [isPlayingUserAudio, setIsPlayingUserAudio] = useState<boolean>(false);
  const [userAudioProgress, setUserAudioProgress] = useState<number>(0);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [sttAvailable, setSttAvailable] = useState<boolean>(false);
  const [sttResult, setSttResult] = useState<SpeechToTextResult | null>(null);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Check STT availability on mount
  useEffect(() => {
    SpeechToTextService.isSTTAvailable().then((avail) => {
      setSttAvailable(avail);
    });
  }, []);

  // Cleanup user audio playback on unmount or reset
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  // Play reference native audio using Web Speech Synthesis
  const handlePlayModelAudio = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    setIsPlayingModelAudio(true);

    const utterance = new SpeechSynthesisUtterance(referenceSentence);
    utterance.rate = 0.85;
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';

    utterance.onend = () => setIsPlayingModelAudio(false);
    utterance.onerror = () => setIsPlayingModelAudio(false);

    window.speechSynthesis.speak(utterance);
  };

  // Start recording handler
  const handleStartRecording = async () => {
    clearError();
    setLiveTranscript('');
    setSttResult(null);

    // If browser supports live recognition, start companion listener
    SpeechToTextService.startLiveRecognition('en-US');

    await startRecording({ maxDurationMs: 60000 });
  };

  // Stop recording handler
  const handleStopRecording = async () => {
    const liveCaptured = SpeechToTextService.stopLiveRecognition();
    setLiveTranscript(liveCaptured);

    const result = await stopRecording();
    if (result) {
      // Process speech-to-text if configured
      setIsTranscribing(true);
      try {
        const transcription = await SpeechToTextService.transcribe(result.blob, {
          prompt: referenceSentence,
          durationMs: result.durationMs,
          language: 'en'
        });

        // Use transcription transcript or fallback to live-captured transcript
        if (!transcription.transcript && liveCaptured) {
          transcription.transcript = liveCaptured;
          transcription.isAvailable = true;
        }

        setSttResult(transcription);
      } catch (e) {
        console.warn('STT transcription failed:', e);
      } finally {
        setIsTranscribing(false);
      }
    }
  };

  // Toggle user audio playback
  const handleToggleUserPlayback = () => {
    if (!audioResult?.url) return;

    if (isPlayingUserAudio && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setIsPlayingUserAudio(false);
      return;
    }

    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio(audioResult.url);
      audioPlayerRef.current.onended = () => {
        setIsPlayingUserAudio(false);
        setUserAudioProgress(0);
      };
      audioPlayerRef.current.ontimeupdate = () => {
        if (audioPlayerRef.current && audioPlayerRef.current.duration) {
          setUserAudioProgress(
            (audioPlayerRef.current.currentTime / audioPlayerRef.current.duration) * 100
          );
        }
      };
    } else {
      audioPlayerRef.current.src = audioResult.url;
    }

    audioPlayerRef.current
      .play()
      .then(() => setIsPlayingUserAudio(true))
      .catch((e) => {
        console.warn('Playback error:', e);
        setIsPlayingUserAudio(false);
      });
  };

  // Submit verified spoken attempt for evaluation
  const handleSubmitSpokenPractice = () => {
    if (!audioResult) return;

    const finalTranscript = sttResult?.transcript || liveTranscript;
    const isTranscribed = Boolean(sttResult?.isAvailable && finalTranscript.trim().length > 0);

    const payload = JSON.stringify({
      recordingCaptured: true,
      transcriptionAvailable: isTranscribed,
      transcript: finalTranscript.trim(),
      durationMs: audioResult.durationMs,
      provider: sttResult?.provider || 'local-recorder',
      mimeType: audioResult.mimeType
    });

    onVerify(payload);
  };

  const formatSeconds = (sec: number): string => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div id="speaking-shadowing-card" className="space-y-4">
      {/* 1. Reference Sentence Presentation Box */}
      <div
        className="p-4 sm:p-5 rounded-2xl border space-y-3 transition-colors"
        style={{
          backgroundColor: 'var(--color-surface-secondary)',
          borderColor: 'var(--color-border)'
        }}
      >
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-accent)'
            }}
          >
            Reference Model Sentence
          </span>

          <button
            id="listen-model-cadence-btn"
            type="button"
            onClick={handlePlayModelAudio}
            disabled={isPlayingModelAudio || isRecording}
            className="px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer disabled:opacity-50"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
          >
            <Volume2 className={`w-3.5 h-3.5 ${isPlayingModelAudio ? 'animate-bounce text-indigo-500' : ''}`} />
            <span>{isPlayingModelAudio ? 'Speaking...' : 'Hear Native Model'}</span>
          </button>
        </div>

        <p
          className="text-base sm:text-lg font-medium leading-relaxed"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {targetTerm ? (
            <span>
              {referenceSentence.split(new RegExp(`(${targetTerm})`, 'gi')).map((part, i) =>
                part.toLowerCase() === targetTerm.toLowerCase() ? (
                  <strong
                    key={i}
                    className="px-1.5 py-0.5 rounded-md font-bold"
                    style={{
                      backgroundColor: 'var(--color-accent-subtle)',
                      color: 'var(--color-accent)'
                    }}
                  >
                    {part}
                  </strong>
                ) : (
                  part
                )
              )}
            </span>
          ) : (
            referenceSentence
          )}
        </p>

        <p className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
          {isPersian
            ? 'تکنیک Shadowing: همراه یا بلافاصله پس از شنیدن مدل، جمله را با صدای واضح و مکث‌های طبیعی تکرار کنید.'
            : 'Shadowing Technique: Speak right alongside or immediately after the native audio model to reinforce natural phrasing and prosody.'}
        </p>
      </div>

      {/* 2. Error Message Panel */}
      <AnimatePresence>
        {recordError && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="p-4 rounded-xl border flex items-start space-x-3 text-xs"
            style={{
              backgroundColor: 'var(--color-error-subtle)',
              borderColor: 'var(--color-error)',
              color: 'var(--color-error-text)'
            }}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <div className="space-y-1">
              <strong className="block font-semibold">
                {isPersian ? 'خطای دسترسی به میکروفون' : 'Microphone Notice'}
              </strong>
              <p>{isPersian ? recordError.userMessageFa : recordError.userMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Recording Interaction Controls */}
      {!hasChecked && (
        <div
          className="p-5 sm:p-6 rounded-2xl border transition-all text-center space-y-4"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)'
          }}
        >
          {/* STATE A: Idle (Before recording) */}
          {recorderState === 'idle' && (
            <div className="py-3 space-y-3">
              <button
                id="start-microphone-recording-btn"
                type="button"
                onClick={handleStartRecording}
                disabled={isEvaluating}
                className="px-6 py-3.5 rounded-2xl text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all inline-flex items-center space-x-2.5 cursor-pointer transform hover:scale-102 active:scale-98"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                <Mic className="w-5 h-5" />
                <span>{isPersian ? 'لمس کنید برای ضبط صدا' : 'Tap to Record Voice'}</span>
              </button>

              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {isPersian
                  ? 'دسترسی به میکروفون فقط در زمان تمرین فعال می‌شود.'
                  : 'Microphone is activated only during your explicit practice.'}
              </p>
            </div>
          )}

          {/* STATE B: Requesting permission */}
          {recorderState === 'requesting_permission' && (
            <div className="py-6 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-accent)' }} />
              <p className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {isPersian ? 'در حال دریافت دسترسی میکروفون...' : 'Requesting microphone permission...'}
              </p>
            </div>
          )}

          {/* STATE C: Recording Active */}
          {recorderState === 'recording' && (
            <div className="py-4 space-y-4">
              <div className="flex items-center justify-center space-x-3">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                </span>
                <span className="font-mono font-bold text-sm text-red-500 tracking-wider">
                  RECORDING ({formatSeconds(elapsedSeconds)} / 1:00)
                </span>
              </div>

              <div className="flex items-center justify-center space-x-3">
                <button
                  id="stop-microphone-recording-btn"
                  type="button"
                  onClick={handleStopRecording}
                  className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-md transition-all inline-flex items-center space-x-2 cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>{isPersian ? 'توقف ضبط' : 'Stop Recording'}</span>
                </button>

                <button
                  type="button"
                  onClick={cancelRecording}
                  className="px-4 py-2.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  {isPersian ? 'انصراف' : 'Cancel'}
                </button>
              </div>
            </div>
          )}

          {/* STATE D: Processing */}
          {recorderState === 'processing' && (
            <div className="py-6 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-accent)' }} />
              <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                {isPersian ? 'در حال آماده‌سازی فایل صوتی...' : 'Finalizing audio recording...'}
              </p>
            </div>
          )}

          {/* STATE E: Ready & Captured */}
          {recorderState === 'ready' && audioResult && (
            <div className="py-2 space-y-4">
              {/* Recording Success Badge */}
              <div className="flex items-center justify-between p-3 rounded-xl border"
                style={{
                  backgroundColor: 'var(--color-success-subtle)',
                  borderColor: 'var(--color-success)'
                }}
              >
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-800">
                    {isPersian ? 'صدای شما ضبط شد' : 'Audio recording captured'}
                  </span>
                </div>
                <span className="text-[11px] font-mono font-medium text-emerald-700">
                  {formatSeconds(Math.round(audioResult.durationMs / 1000))} ({(audioResult.sizeBytes / 1024).toFixed(1)} KB)
                </span>
              </div>

              {/* Audio Playback Controls */}
              <div
                className="p-4 rounded-xl border flex items-center justify-between gap-3"
                style={{
                  backgroundColor: 'var(--color-surface-secondary)',
                  borderColor: 'var(--color-border)'
                }}
              >
                <button
                  id="play-user-recording-btn"
                  type="button"
                  onClick={handleToggleUserPlayback}
                  className="px-4 py-2 rounded-xl text-white font-semibold text-xs inline-flex items-center space-x-2 shadow-xs transition-colors cursor-pointer"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                >
                  {isPlayingUserAudio ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>{isPersian ? 'مکث' : 'Pause'}</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>{isPersian ? 'شنیدن صدای خود' : 'Listen to Recording'}</span>
                    </>
                  )}
                </button>

                {/* Progress bar */}
                <div className="flex-1 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-100"
                    style={{
                      width: `${userAudioProgress}%`,
                      backgroundColor: 'var(--color-accent)'
                    }}
                  />
                </div>

                <button
                  id="rerecord-microphone-btn"
                  type="button"
                  onClick={resetRecording}
                  className="p-2 rounded-xl border transition-colors cursor-pointer text-xs font-medium inline-flex items-center space-x-1"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)'
                  }}
                  title="Record again"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isPersian ? 'ضبط مجدد' : 'Record Again'}</span>
                </button>
              </div>

              {/* Live transcript insight if captured */}
              {isTranscribing ? (
                <div className="text-xs flex items-center justify-center space-x-2 text-neutral-500 py-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{isPersian ? 'در حال بررسی گفتار...' : 'Transcribing speech...'}</span>
                </div>
              ) : sttResult?.transcript || liveTranscript ? (
                <div
                  className="p-3 rounded-xl border text-left text-xs space-y-1"
                  style={{
                    backgroundColor: 'var(--color-surface-secondary)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    <span>Captured Spoken Words</span>
                  </div>
                  <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    "{sttResult?.transcript || liveTranscript}"
                  </p>
                </div>
              ) : (
                <div className="text-[11px] text-neutral-500 flex items-center justify-center space-x-1">
                  <Info className="w-3.5 h-3.5" />
                  <span>
                    {isPersian
                      ? 'صدا با موفقیت ذخیره شد. برای ثبت روی دکمه بررسی کلیک کنید.'
                      : 'Audio ready. Click "Verify Spoken Practice" to submit your oral exercise.'}
                  </span>
                </div>
              )}

              {/* Submit Spoken Practice Button */}
              <div className="pt-2">
                <button
                  id="submit-spoken-practice-btn"
                  type="button"
                  onClick={handleSubmitSpokenPractice}
                  disabled={isEvaluating}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all inline-flex items-center justify-center space-x-2 cursor-pointer"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                >
                  {isEvaluating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isPersian ? 'در حال ثبت...' : 'Evaluating Practice...'}</span>
                    </>
                  ) : (
                    <span>{isPersian ? 'تأیید و ثبت تمرین گفتاری' : 'Verify Spoken Practice'}</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Development Diagnostics Toggle (Cleanly hidden by default) */}
      <div className="text-right">
        <button
          type="button"
          onClick={() => setShowDiagnostics(!showDiagnostics)}
          className="text-[10px] text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
        >
          {showDiagnostics ? 'Hide Audio Pipeline Diagnostics' : 'Diagnostics'}
        </button>

        {showDiagnostics && (
          <div className="mt-2 p-3 rounded-xl border text-[11px] font-mono text-left bg-neutral-900 text-neutral-200 space-y-1">
            <div>Recorder State: {recorderState}</div>
            <div>Elapsed: {elapsedSeconds}s</div>
            <div>Blob Size: {audioResult ? `${audioResult.sizeBytes} B` : 'none'}</div>
            <div>MIME: {audioResult?.mimeType || 'auto'}</div>
            <div>STT Provider: {sttResult?.provider || (sttAvailable ? 'web-speech' : 'unavailable')}</div>
            <div>STT Available: {sttAvailable ? 'true' : 'false'}</div>
            <div>Transcript: "{sttResult?.transcript || liveTranscript}"</div>
          </div>
        )}
      </div>
    </div>
  );
};
