import React, { useState, useEffect, useRef } from 'react';
import { Source, SessionState, SessionActivity, Exercise, EvaluationResult, ActivityAttempt } from '../types';
import {
  Volume2,
  HelpCircle,
  ArrowRight,
  X,
  Target,
  Milestone,
  RotateCcw,
  Sparkles,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EvaluationService } from '../services/evaluation';
import { EvaluationFeedbackPanel } from './EvaluationFeedbackPanel';
import { SpeakingShadowingCard } from './SpeakingShadowingCard';
import { LocalRepository } from '../services/store';

interface LearningSessionScreenProps {
  source: Source;
  state: SessionState;
  setState: React.Dispatch<React.SetStateAction<SessionState | null>>;
  onFinish: (finalState: SessionState) => void;
  onQuit: () => void;
}

export const LearningSessionScreen: React.FC<LearningSessionScreenProps> = ({
  source,
  state,
  setState,
  onFinish,
  onQuit
}) => {
  const currentIdx = state.currentActivityIndex ?? state.currentIndex ?? 0;
  const currentActivity: SessionActivity | undefined = state.plan?.activities?.[currentIdx];
  const currentExercise: Exercise | undefined = currentActivity?.exercise || state.exercises[currentIdx];
  const totalActivities = state.plan?.activities?.length || state.exercises?.length || 1;
  const isLast = currentIdx === totalActivities - 1;

  const userProfile = LocalRepository.getUserProfile();
  const maxAttempts = (currentExercise?.options && currentExercise.options.length > 0) ? 2 : 3;

  // Local interaction & evaluation states
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState<string>('');
  const [hasChecked, setHasChecked] = useState<boolean>(false);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [attemptNumber, setAttemptNumber] = useState<number>(1);
  const [activityAttempts, setActivityAttempts] = useState<ActivityAttempt[]>([]);
  const [hintsUsed, setHintsUsed] = useState<number>(0);
  const [currentEvaluation, setCurrentEvaluation] = useState<EvaluationResult | null>(null);

  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [showQuitModal, setShowQuitModal] = useState<boolean>(false);

  // Activity start timestamp for granular timing
  const activityStartTimeRef = useRef<number>(Date.now());

  // Auto-save in-progress session state to LocalRepository on state changes
  useEffect(() => {
    if (state && state.status === 'in_progress') {
      LocalRepository.saveActiveSession(state);
    }
  }, [state]);

  // Reset drill-specific states on index change
  useEffect(() => {
    setSelectedOption(null);
    setTypedAnswer('');
    setHasChecked(false);
    setIsEvaluating(false);
    setAttemptNumber(1);
    setActivityAttempts([]);
    setHintsUsed(0);
    setCurrentEvaluation(null);
    setIsPlayingAudio(false);
    activityStartTimeRef.current = Date.now();
  }, [currentIdx]);

  if (!currentExercise || !currentActivity) {
    return null;
  }

  // Play speech audio using Web Speech Synthesis
  const handlePlayAudio = (textToSpeak?: string) => {
    const text = textToSpeak || currentExercise.audioText || currentExercise.prompt;
    setIsPlayingAudio(true);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.88;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => {
        setIsPlayingAudio(false);
      }, 2500);
    }
  };

  // Toggle explicit grammar instruction (tracked as hint)
  const handleToggleGrammar = () => {
    setHintsUsed(prev => prev + 1);
    setState(prev => {
      if (!prev) return null;
      const currentVal = prev.grammarRequested[currentExercise.id];
      return {
        ...prev,
        grammarRequested: {
          ...prev.grammarRequested,
          [currentExercise.id]: !currentVal
        }
      };
    });
  };

  // Validate answer using pure EvaluationService
  const handleCheckAnswer = async (customResponse?: string) => {
    if (!currentExercise || !currentActivity) return;
    setIsEvaluating(true);

    let finalAnswer = '';
    if (typeof customResponse === 'string') {
      finalAnswer = customResponse;
    } else if (currentExercise.type === 'vocabulary_retrieval' || currentExercise.type === 'contextual_notice') {
      finalAnswer = selectedOption || '';
    } else if (currentExercise.type === 'speaking_shadowing') {
      finalAnswer = 'no_recording';
    } else {
      finalAnswer = typedAnswer.trim();
    }

    const timeSpent = Math.max(1, Math.round((Date.now() - activityStartTimeRef.current) / 1000));
    const activityId = currentActivity.id;

    try {
      const evalResult = await EvaluationService.evaluate({
        exercise: currentExercise,
        activity: currentActivity,
        response: finalAnswer,
        attemptNumber,
        hintsUsed,
        userProfile,
        previousAttempts: activityAttempts,
        objectiveTitle: state.plan?.objective?.title,
        maxAttempts
      });

      const newAttempt: ActivityAttempt = {
        attemptNumber,
        response: finalAnswer,
        evaluation: evalResult,
        timestamp: Date.now()
      };

      const updatedAttempts = [...activityAttempts, newAttempt];
      const activityResult = EvaluationService.buildActivityResult({
        activityId,
        exerciseId: currentExercise.id,
        attempts: updatedAttempts,
        finalEvaluation: evalResult,
        hintsUsed,
        timeSpentSeconds: timeSpent
      });

      setState(prev => {
        if (!prev) return null;
        return {
          ...prev,
          answers: { ...prev.answers, [currentExercise.id]: finalAnswer },
          scores: { ...prev.scores, [currentExercise.id]: evalResult.isCorrect },
          timeSpentPerExercise: { ...prev.timeSpentPerExercise, [currentExercise.id]: timeSpent },
          timeSpentPerActivity: { ...prev.timeSpentPerActivity, [activityId]: timeSpent },
          activityResults: { ...(prev.activityResults || {}), [activityId]: activityResult },
          currentAttempts: { ...(prev.currentAttempts || {}), [activityId]: updatedAttempts },
          hintsUsedPerActivity: { ...(prev.hintsUsedPerActivity || {}), [activityId]: hintsUsed }
        };
      });

      setCurrentEvaluation(evalResult);
      setActivityAttempts(updatedAttempts);
      setHasChecked(true);
    } catch (err) {
      console.error('Evaluation failed:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Retry handler
  const handleRetry = () => {
    setAttemptNumber(prev => prev + 1);
    setHasChecked(false);
    setCurrentEvaluation(null);
    if (currentExercise.options && currentExercise.options.length > 0) {
      setSelectedOption(null);
    }
  };

  // Move to next pedagogical activity or complete session
  const handleNextExercise = () => {
    if (isLast) {
      const finalState: SessionState = {
        ...state,
        status: 'completed',
        endTime: Date.now()
      };
      onFinish(finalState);
    } else {
      setState(prev => {
        if (!prev) return null;
        return {
          ...prev,
          currentIndex: prev.currentIndex + 1,
          currentActivityIndex: (prev.currentActivityIndex ?? 0) + 1
        };
      });
    }
  };

  const isAnswerProvided =
    currentExercise.type === 'vocabulary_retrieval' || currentExercise.type === 'contextual_notice'
      ? (currentExercise.options && currentExercise.options.length > 0 ? selectedOption !== null : typedAnswer.trim().length > 0)
      : currentExercise.type === 'implicit_grammar' || currentExercise.type === 'listening_comprehension'
      ? typedAnswer.trim().length > 0
      : true;

  const isGrammarRequested = state.grammarRequested[currentExercise.id] ?? false;

  return (
    <div id="learning-session-screen" className="max-w-2xl mx-auto space-y-5">
      {/* Session Top Navigation & Exit */}
      <div
        className="flex items-center justify-between text-xs border-b pb-3"
        style={{
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-secondary)'
        }}
      >
        <div className="flex items-center space-x-2">
          <span className="font-semibold px-2 py-0.5 rounded-md border text-[10px] uppercase tracking-wider"
            style={{
              backgroundColor: 'var(--color-accent-subtle)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-accent)'
            }}
          >
            Learning Journey
          </span>
          <span>•</span>
          <span
            className="max-w-[200px] sm:max-w-[300px] truncate font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {source.title}
          </span>
        </div>

        <button
          id="quit-session-btn"
          type="button"
          onClick={() => setShowQuitModal(true)}
          className="text-xs transition-colors inline-flex items-center space-x-1 cursor-pointer"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          <X className="w-3.5 h-3.5" />
          <span>Exit Unit</span>
        </button>
      </div>

      {/* Starting Point / Objective Banner */}
      {state.plan?.objective && (
        <div
          className="p-3.5 rounded-2xl border transition-colors space-y-1.5"
          style={{
            backgroundColor: 'var(--color-surface-secondary)',
            borderColor: 'var(--color-border)'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Target className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-accent)' }}>
                Session Objective
              </span>
            </div>
            <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
              Step {currentIdx + 1} of {totalActivities}
            </span>
          </div>
          <p className="text-xs font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>
            {state.plan.objective.title}
          </p>
        </div>
      )}

      {/* Pedagogical Journey Stepper & Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          <div className="flex items-center space-x-1.5">
            <Milestone className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
            <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {currentActivity.stageLabel || `Activity ${currentIdx + 1}`}
            </span>
            <span className="hidden sm:inline" style={{ color: 'var(--color-text-tertiary)' }}>
              — {currentActivity.pedagogicalIntent}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {attemptNumber > 1 && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-md border"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-warning)',
                  color: 'var(--color-warning)'
                }}
              >
                Attempt {attemptNumber} of {maxAttempts}
              </span>
            )}
            <span className="font-bold" style={{ color: 'var(--color-accent)' }}>
              {Math.round(((currentIdx + 1) / totalActivities) * 100)}%
            </span>
          </div>
        </div>

        {/* Multi-step Journey Bar */}
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
          {Array.from({ length: totalActivities }).map((_, idx) => {
            const isCompleted = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            return (
              <div
                key={idx}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: isCompleted || isCurrent
                    ? 'var(--color-accent)'
                    : 'var(--color-surface-secondary)',
                  opacity: isCurrent ? 1 : isCompleted ? 0.7 : 0.3
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Primary Activity Card */}
      <motion.div
        key={`${currentExercise.id}_attempt_${attemptNumber}`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-2xl border shadow-sm p-6 sm:p-8 space-y-6 transition-colors"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)'
        }}
      >
        {/* Instruction Badge & Prompt */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border"
                style={{
                  backgroundColor: 'var(--color-accent-subtle)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-accent)'
                }}
              >
                {currentExercise.instruction}
              </span>
              {(currentActivity.isReviewItem || currentExercise.isReviewItem) && (
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: 'var(--color-surface-secondary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-accent)'
                  }}
                >
                  Review Focus
                </span>
              )}
            </div>

            {attemptNumber > 1 && !hasChecked && (
              <div className="flex items-center space-x-1.5 text-xs" style={{ color: 'var(--color-warning)' }}>
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="font-semibold text-[11px]">Retry Active</span>
              </div>
            )}
          </div>

          <div
            className="text-sm sm:text-base font-medium leading-relaxed whitespace-pre-line"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {currentExercise.prompt}
          </div>

          {currentActivity.selectionReason && (
            <div
              className="px-3 py-1.5 rounded-xl border text-[11px] flex items-center space-x-2 transition-colors"
              style={{
                backgroundColor: 'var(--color-surface-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)'
              }}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-accent)' }} />
              <span>
                <strong className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Adaptive Logic:</strong> {currentActivity.selectionReason}
              </span>
            </div>
          )}
        </div>

        {/* Dynamic Exercise Input Formats */}
        <div className="pt-1">
          {/* Format 1: Vocabulary Retrieval Multiple Choice */}
          {(currentExercise.type === 'vocabulary_retrieval' || currentExercise.type === 'contextual_notice') && currentExercise.options && (
            <div className="space-y-2.5">
              {currentExercise.options.map((option, idx) => {
                const isSelected = selectedOption === option;
                return (
                  <button
                    id={`vocab-option-${idx}`}
                    key={idx}
                    type="button"
                    disabled={hasChecked || isEvaluating}
                    onClick={() => setSelectedOption(option)}
                    className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm transition-all flex items-start space-x-3 cursor-pointer ${
                      isSelected ? 'shadow-xs' : ''
                    }`}
                    style={{
                      backgroundColor: isSelected
                        ? 'var(--color-accent-subtle)'
                        : 'var(--color-surface-secondary)',
                      borderColor: isSelected
                        ? 'var(--color-accent)'
                        : 'var(--color-border)',
                      color: isSelected
                        ? 'var(--color-accent)'
                        : 'var(--color-text-primary)',
                      fontWeight: isSelected ? 500 : 400
                    }}
                  >
                    <span
                      className="w-5 h-5 rounded-full border text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        backgroundColor: isSelected
                          ? 'var(--color-accent)'
                          : 'var(--color-surface)',
                        borderColor: isSelected
                          ? 'var(--color-accent)'
                          : 'var(--color-border)',
                        color: isSelected ? '#FFFFFF' : 'var(--color-text-tertiary)'
                      }}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="leading-snug">{option}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Format 1B: Open Text Production / Vocabulary */}
          {(currentExercise.type === 'vocabulary_retrieval' || currentExercise.type === 'contextual_notice') && (!currentExercise.options || currentExercise.options.length === 0) && (
            <div className="space-y-3">
              <label
                htmlFor="vocab-input-field"
                className="block text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Type your response sentence:
              </label>
              <textarea
                id="vocab-input-field"
                rows={3}
                disabled={hasChecked || isEvaluating}
                placeholder="Write your sentence here..."
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
                className="w-full p-3.5 border rounded-xl focus:outline-none transition-colors text-sm leading-relaxed"
                style={{
                  backgroundColor: 'var(--color-surface-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)'
                }}
              />
            </div>
          )}

          {/* Format 2: Implicit Grammar Reconstruction */}
          {currentExercise.type === 'implicit_grammar' && (
            <div className="space-y-3">
              <label
                htmlFor="grammar-input-field"
                className="block text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Type the natural, corrected phrase:
              </label>
              <textarea
                id="grammar-input-field"
                rows={3}
                disabled={hasChecked || isEvaluating}
                placeholder="Type the corrected sentence..."
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
                className="w-full p-3.5 border rounded-xl focus:outline-none transition-colors text-sm leading-relaxed"
                style={{
                  backgroundColor: 'var(--color-surface-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)'
                }}
              />
              <p className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
                Tip: Trust your auditory intuition. Read it silently or aloud to spot structural mismatches.
              </p>
            </div>
          )}

          {/* Format 3: Listening Comprehension Cloze */}
          {currentExercise.type === 'listening_comprehension' && (
            <div className="space-y-4">
              <div
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-xl"
                style={{
                  backgroundColor: 'var(--color-surface-secondary)',
                  borderColor: 'var(--color-border)'
                }}
              >
                <div className="flex items-center space-x-3">
                  <button
                    id="play-audio-segment-btn"
                    type="button"
                    onClick={() => handlePlayAudio(currentExercise.audioText)}
                    disabled={isPlayingAudio}
                    className="px-4 py-2.5 text-white text-xs font-semibold rounded-xl flex items-center space-x-2 shadow-xs transition-colors cursor-pointer"
                    style={{ backgroundColor: 'var(--color-accent)' }}
                  >
                    <Volume2 className={`w-4 h-4 ${isPlayingAudio ? 'animate-bounce' : ''}`} />
                    <span>{isPlayingAudio ? 'Speaking Audio...' : 'Play Audio Segment'}</span>
                  </button>
                  <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {isPlayingAudio ? 'Listening to sentence stream' : 'Listen carefully to missing segment'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="listening-input-field"
                  className="block text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Type the missing key word or phrase you heard:
                </label>
                <input
                  id="listening-input-field"
                  type="text"
                  disabled={hasChecked || isEvaluating}
                  placeholder="Type the word that fills the blank..."
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none transition-colors text-sm"
                  style={{
                    backgroundColor: 'var(--color-surface-secondary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)'
                  }}
                />
              </div>
            </div>
          )}

          {/* Format 4: Speaking & Shadowing Cadence */}
          {currentExercise.type === 'speaking_shadowing' && (
            <SpeakingShadowingCard
              exercise={currentExercise}
              activity={currentActivity}
              userProfile={userProfile}
              hasChecked={hasChecked}
              isEvaluating={isEvaluating}
              onVerify={(payloadJson) => handleCheckAnswer(payloadJson)}
            />
          )}
        </div>

        {/* Action Controls & Explicit Grammar Request */}
        <div
          className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {/* Explicit Grammar Toggle */}
          <div>
            <button
              id="explicit-grammar-toggle-btn"
              type="button"
              onClick={handleToggleGrammar}
              className="text-xs font-medium inline-flex items-center space-x-1.5 focus:outline-none transition-colors cursor-pointer"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <HelpCircle className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
              <span>
                {isGrammarRequested
                  ? 'Hide Explicit Grammar Rule'
                  : 'Need explicit grammar explanation?'}
              </span>
            </button>
          </div>

          {/* Action Buttons (Hidden for speaking_shadowing since SpeakingShadowingCard provides dedicated audio controls & verify action) */}
          <div>
            {!hasChecked && currentExercise.type !== 'speaking_shadowing' ? (
              <button
                id="verify-answer-btn"
                type="button"
                disabled={!isAnswerProvided || isEvaluating}
                onClick={() => handleCheckAnswer()}
                className="px-6 py-2.5 text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center space-x-2"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: '#FFFFFF'
                }}
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Evaluating Response...</span>
                  </>
                ) : (
                  <span>Verify Response</span>
                )}
              </button>
            ) : null}
          </div>
        </div>
      </motion.div>

      {/* Explicit Grammar Explanation Box */}
      <AnimatePresence>
        {isGrammarRequested && (
          <motion.div
            id="explicit-grammar-explanation-card"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl p-5 space-y-2 overflow-hidden shadow-xs border transition-colors"
            style={{
              backgroundColor: 'var(--color-warning-subtle)',
              borderColor: 'var(--color-warning)',
              color: 'var(--color-text-primary)'
            }}
          >
            <div className="flex items-center space-x-2">
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-warning)',
                  color: 'var(--color-warning)'
                }}
              >
                Explicit Grammar Insight
              </span>
            </div>
            <p className="text-xs font-semibold" style={{ color: 'var(--color-warning)' }}>
              Grammatical Mechanics & Structure Pattern:
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {currentExercise.grammarInsight ||
                'While implicit grammar is absorbed unconsciously through frequent correction, this target structure follows standard English syntactic harmony. Subject-verb agreement and prepositional collocations govern this phrase.'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase 5 Educational Feedback & Retry Control Panel */}
      <AnimatePresence>
        {hasChecked && currentEvaluation && (
          <EvaluationFeedbackPanel
            evaluation={currentEvaluation}
            exercise={currentExercise}
            attemptNumber={attemptNumber}
            maxAttempts={maxAttempts}
            onRetry={handleRetry}
            onContinue={handleNextExercise}
            isLastActivity={isLast}
          />
        )}
      </AnimatePresence>

      {/* Quit Modal */}
      {showQuitModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div
            className="rounded-2xl border shadow-lg p-6 max-w-sm w-full space-y-4"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
          >
            <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Exit Learning Unit?
            </h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              Your progress in this structured learning journey will be closed. You can begin a new session anytime.
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowQuitModal(false)}
                className="px-3.5 py-2 text-xs font-medium rounded-xl border transition-colors cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-surface-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)'
                }}
              >
                Resume
              </button>
              <button
                type="button"
                onClick={onQuit}
                className="px-4 py-2 text-white text-xs font-semibold rounded-xl shadow-xs cursor-pointer"
                style={{ backgroundColor: 'var(--color-error)' }}
              >
                Exit Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

