import React, { useState, useMemo } from 'react';
import { Source, SessionState, SessionResultItem, MasteryLevel, AssetStateUpdateResult } from '../types';
import { SessionEngine } from '../services/sessionEngine';
import { LearningStateManager } from '../services/learningState';
import {
  CheckCircle2,
  Award,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Target,
  Milestone,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Sparkles,
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';

interface SessionResultsScreenProps {
  state: SessionState;
  source: Source;
  onFinish: () => void;
  onPracticeAgain: () => void;
}

export const SessionResultsScreen: React.FC<SessionResultsScreenProps> = ({
  state,
  source,
  onFinish,
  onPracticeAgain
}) => {
  const [showReview, setShowReview] = useState<boolean>(false);

  const durationSeconds = state.endTime ? Math.max(1, Math.round((state.endTime - state.startTime) / 1000)) : 0;
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;

  // Evaluate complete pedagogical objective outcomes & state updates
  const { achievement, stageMetrics } = SessionEngine.evaluateSession(state);
  const totalActivities = state.plan?.activities?.length || state.exercises.length;
  const correctCount = Object.values(state.scores).filter(Boolean).length;

  const sessionSummary = useMemo(() => {
    try {
      return SessionEngine.createSummary(state);
    } catch {
      return null;
    }
  }, [state]);

  const stateUpdates: AssetStateUpdateResult[] = sessionSummary?.learningStateUpdates || [];
  const unassistedCount = sessionSummary?.unassistedCorrectCount ?? correctCount;
  const recoveredCount = sessionSummary?.recoveredCount ?? 0;

  const items: SessionResultItem[] = sessionSummary?.items || state.plan?.activities?.map((act) => {
    const ex = act.exercise;
    return {
      activityId: act.id,
      exerciseId: ex.id,
      stage: act.stage,
      stageLabel: act.stageLabel,
      pedagogicalIntent: act.pedagogicalIntent,
      exercise: ex,
      userAnswer: state.answers[ex.id] || '(No response)',
      isCorrect: state.scores[ex.id] ?? false,
      timeSpentSeconds: state.timeSpentPerExercise[ex.id] || state.timeSpentPerActivity[act.id] || 0,
      grammarRequested: state.grammarRequested[ex.id] ?? false
    };
  }) || state.exercises.map((ex, idx) => ({
    activityId: `act_${idx}`,
    exerciseId: ex.id,
    stage: 'active_retrieval',
    stageLabel: `Activity ${idx + 1}`,
    pedagogicalIntent: 'Active Retrieval Practice',
    exercise: ex,
    userAnswer: state.answers[ex.id] || '(No response)',
    isCorrect: state.scores[ex.id] ?? false,
    timeSpentSeconds: state.timeSpentPerExercise[ex.id] || 0,
    grammarRequested: state.grammarRequested[ex.id] ?? false
  }));

  // Mastery badge styling helper
  const getMasteryBadge = (level: MasteryLevel) => {
    if (level === 'mastered') {
      return {
        label: 'Objective Mastered',
        bgColor: 'var(--color-success-subtle)',
        borderColor: 'var(--color-success)',
        textColor: 'var(--color-success)',
        icon: CheckCircle2
      };
    }
    if (level === 'developing') {
      return {
        label: 'Competence Developing',
        bgColor: 'var(--color-accent-subtle)',
        borderColor: 'var(--color-accent)',
        textColor: 'var(--color-accent)',
        icon: TrendingUp
      };
    }
    return {
      label: 'Initial Exploration',
      bgColor: 'var(--color-warning-subtle)',
      borderColor: 'var(--color-warning)',
      textColor: 'var(--color-warning)',
      icon: AlertCircle
    };
  };

  const badge = getMasteryBadge(achievement.level);
  const BadgeIcon = badge.icon;

  return (
    <motion.div
      id="session-results-screen"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="max-w-xl mx-auto space-y-6"
    >
      {/* Primary Results Card */}
      <div
        className="rounded-2xl border shadow-sm p-6 sm:p-8 text-center space-y-6 transition-colors"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)'
        }}
      >
        {/* Success / Status Icon */}
        <div
          className="w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto shadow-xs"
          style={{
            backgroundColor: badge.bgColor,
            borderColor: badge.borderColor,
            color: badge.textColor
          }}
        >
          <BadgeIcon className="w-7 h-7" style={{ color: badge.textColor }} />
        </div>

        {/* Header & Objective */}
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full border text-xs font-bold uppercase tracking-wider"
            style={{
              backgroundColor: badge.bgColor,
              borderColor: badge.borderColor,
              color: badge.textColor
            }}
          >
            <span>{badge.label}</span>
          </div>
          <h2
            className="text-2xl font-semibold tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Learning Unit Completed
          </h2>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Source: <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{source.title}</span>
          </p>
        </div>

        {/* Session Objective Card */}
        {state.plan?.objective && (
          <div
            className="p-4 rounded-2xl border text-left space-y-1.5 transition-colors"
            style={{
              backgroundColor: 'var(--color-surface-secondary)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="flex items-center space-x-2">
              <Target className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-accent)' }}>
                Target Objective
              </span>
            </div>
            <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {state.plan.objective.title}
            </p>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {achievement.summary}
            </p>
          </div>
        )}

        {/* Core Metrics Grid */}
        <div className="grid grid-cols-3 gap-3 pt-1">
          <div
            className="p-3.5 border rounded-2xl transition-colors"
            style={{
              backgroundColor: 'var(--color-surface-secondary)',
              borderColor: 'var(--color-border)'
            }}
          >
            <span
              className="text-[10px] uppercase font-bold block tracking-wider"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Time Spent
            </span>
            <span
              className="text-base sm:text-lg font-semibold mt-1 block"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {minutes > 0 ? `${minutes}m ` : ''}{seconds}s
            </span>
          </div>

          <div
            className="p-3.5 border rounded-2xl transition-colors"
            style={{
              backgroundColor: 'var(--color-surface-secondary)',
              borderColor: 'var(--color-border)'
            }}
          >
            <span
              className="text-[10px] uppercase font-bold block tracking-wider"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Activities Done
            </span>
            <span
              className="text-base sm:text-lg font-semibold mt-1 block"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {correctCount} / {totalActivities}
            </span>
          </div>

          <div
            className="p-3.5 border rounded-2xl transition-colors"
            style={{
              backgroundColor: 'var(--color-surface-secondary)',
              borderColor: 'var(--color-border)'
            }}
          >
            <span
              className="text-[10px] uppercase font-bold block tracking-wider"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Mastery Score
            </span>
            <span
              className="text-base sm:text-lg font-semibold mt-1 block"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {achievement.scorePercent}%
            </span>
          </div>
        </div>

        {/* Pedagogical Stage Metrics */}
        {stageMetrics.length > 0 && (
          <div
            className="p-4 border rounded-2xl text-left space-y-2.5 transition-colors"
            style={{
              backgroundColor: 'var(--color-surface-secondary)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="flex items-center space-x-1.5">
              <Milestone className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                Pedagogical Stage Performance
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {stageMetrics.map((sm, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-xl border text-xs space-y-0.5"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <span className="font-semibold block truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {sm.label}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {sm.correct} of {sm.total} verified ({sm.timeSpentSeconds}s)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Learning State & Memory Calibration */}
        {stateUpdates.length > 0 && (
          <div
            id="learning-state-calibration-card"
            className="p-4 border rounded-2xl text-left space-y-2.5 transition-colors"
            style={{
              backgroundColor: 'var(--color-surface-secondary)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Zap className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                  Learning State Calibration
                </span>
              </div>
              <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
                Deterministic Session-to-Session Updates
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {stateUpdates.map((upd, idx) => {
                const isStrong = upd.newStatus === 'strong';
                const isDeveloping = upd.newStatus === 'developing';
                const isImproved = upd.previousStatus !== upd.newStatus;

                return (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl border text-xs flex items-center justify-between transition-colors"
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)'
                    }}
                  >
                    <div className="space-y-0.5 max-w-[65%]">
                      <span className="font-semibold block truncate" style={{ color: 'var(--color-text-primary)' }}>
                        {upd.term}
                      </span>
                      <span className="text-[10px] block truncate" style={{ color: 'var(--color-text-secondary)' }}>
                        {upd.assetType === 'grammar_pattern' ? 'Grammar Pattern' : upd.assetType === 'phrase' ? 'Spoken Cadence' : 'Vocabulary'} • {upd.exposureCount} session{upd.exposureCount > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border inline-block"
                        style={{
                          backgroundColor: isStrong
                            ? 'var(--color-success-subtle)'
                            : isDeveloping
                            ? 'var(--color-accent-subtle)'
                            : 'var(--color-surface-secondary)',
                          borderColor: isStrong
                            ? 'var(--color-success)'
                            : isDeveloping
                            ? 'var(--color-accent)'
                            : 'var(--color-border)',
                          color: isStrong
                            ? 'var(--color-success)'
                            : isDeveloping
                            ? 'var(--color-accent)'
                            : 'var(--color-text-tertiary)'
                        }}
                      >
                        {isStrong ? 'Strong' : isDeveloping ? 'Developing' : 'New'}
                      </span>
                      {upd.consecutiveSuccesses > 1 && (
                        <span className="text-[9px] block mt-0.5 font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
                          🔥 {upd.consecutiveSuccesses} in a row
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Next Recommendation Note */}
        <div
          className="p-4 border rounded-2xl text-left space-y-1 transition-colors"
          style={{
            backgroundColor: 'var(--color-accent-subtle)',
            borderColor: 'var(--color-border)'
          }}
        >
          <h4
            className="text-xs font-semibold uppercase tracking-wide flex items-center space-x-1.5"
            style={{ color: 'var(--color-accent)' }}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Recommended Next Step</span>
          </h4>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {achievement.recommendedNextStep}
          </p>
        </div>

        {/* Drill Breakdown Toggle */}
        <div className="pt-1">
          <button
            id="toggle-drill-review-btn"
            type="button"
            onClick={() => setShowReview(!showReview)}
            className="text-xs font-medium inline-flex items-center space-x-1 py-1 focus:outline-none transition-colors cursor-pointer"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <span>{showReview ? 'Hide Activity Breakdown' : 'Review Activity Details'}</span>
            {showReview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Actions */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <button
            id="results-home-btn"
            type="button"
            onClick={onFinish}
            className="w-full sm:w-auto px-6 py-2.5 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            Return to Home
          </button>

          <button
            id="results-practice-again-btn"
            type="button"
            onClick={onPracticeAgain}
            className="w-full sm:w-auto px-5 py-2.5 border text-xs sm:text-sm font-medium rounded-xl transition-colors inline-flex items-center justify-center space-x-1.5 cursor-pointer"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Practice Another Unit</span>
          </button>
        </div>
      </div>

      {/* Drill Details Breakdown List */}
      {showReview && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <h3
            className="text-xs font-semibold uppercase tracking-wider px-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Learning Unit Activity Breakdown ({items.length} items)
          </h3>
          {items.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl border shadow-xs space-y-2 transition-colors"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)'
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border"
                  style={{
                    backgroundColor: 'var(--color-surface-secondary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  Step {idx + 1} • {item.stageLabel} ({item.exercise.instruction})
                </span>
                <span
                  className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border"
                  style={{
                    backgroundColor: item.isCorrect
                      ? 'var(--color-success-subtle)'
                      : 'var(--color-error-subtle)',
                    borderColor: item.isCorrect
                      ? 'var(--color-success)'
                      : 'var(--color-error)',
                    color: item.isCorrect
                      ? 'var(--color-success)'
                      : 'var(--color-error)'
                  }}
                >
                  {item.isCorrect ? 'Accurate' : 'Calibrated'}
                </span>
              </div>

              <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {item.exercise.prompt}
              </p>

              {item.exercise.type !== 'speaking_shadowing' && (
                <div
                  className="text-[11px] p-2.5 rounded-xl border space-y-1"
                  style={{
                    backgroundColor: 'var(--color-surface-secondary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  <div><strong style={{ color: 'var(--color-text-primary)' }}>Target Answer:</strong> "{item.exercise.correctAnswer}"</div>
                  {item.userAnswer && (
                    <div><strong style={{ color: 'var(--color-text-primary)' }}>Your Response:</strong> "{item.userAnswer}"</div>
                  )}
                </div>
              )}

              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-tertiary)' }}>
                {item.exercise.explanation}
              </p>
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
};
