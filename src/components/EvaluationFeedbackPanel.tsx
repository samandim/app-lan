import React from 'react';
import { EvaluationResult, Exercise } from '../types';
import { CheckCircle2, XCircle, RotateCcw, ArrowRight, Lightbulb, Sparkles, Target, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface EvaluationFeedbackPanelProps {
  evaluation: EvaluationResult;
  exercise: Exercise;
  attemptNumber: number;
  maxAttempts: number;
  onRetry: () => void;
  onContinue: () => void;
  isLastActivity: boolean;
}

export const EvaluationFeedbackPanel: React.FC<EvaluationFeedbackPanelProps> = ({
  evaluation,
  exercise,
  attemptNumber,
  maxAttempts,
  onRetry,
  onContinue,
  isLastActivity
}) => {
  const { status, isCorrect, feedback, retryRecommended, evidence } = evaluation;
  const canRetry = retryRecommended && attemptNumber < maxAttempts;
  const isRecovered = evidence?.recoveredAfterFeedback;
  const isUnassisted = evidence?.unassistedSuccess;

  // Background and border colors based on status
  const getContainerStyle = () => {
    if (status === 'evaluation_unavailable') {
      return {
        backgroundColor: 'var(--color-accent-subtle)',
        borderColor: 'var(--color-accent)',
        color: 'var(--color-text-primary)'
      };
    }
    if (status === 'strong' || status === 'acceptable') {
      return {
        backgroundColor: 'var(--color-success-subtle)',
        borderColor: 'var(--color-success)',
        color: 'var(--color-text-primary)'
      };
    }
    if (status === 'developing') {
      return {
        backgroundColor: 'var(--color-warning-subtle)',
        borderColor: 'var(--color-warning)',
        color: 'var(--color-text-primary)'
      };
    }
    return {
      backgroundColor: 'var(--color-error-subtle)',
      borderColor: 'var(--color-error)',
      color: 'var(--color-text-primary)'
    };
  };

  const getStatusBadge = () => {
    if (status === 'evaluation_unavailable') {
      return {
        label: 'Vocal Practice Captured',
        icon: <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />,
        style: {
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-accent)',
          color: 'var(--color-accent)'
        }
      };
    }
    if (status === 'strong') {
      return {
        label: isUnassisted ? 'Direct Accurate Recall' : 'Strong Response',
        icon: <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--color-success)' }} />,
        style: {
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-success)',
          color: 'var(--color-success)'
        }
      };
    }
    if (status === 'acceptable') {
      return {
        label: isRecovered ? 'Accurate After Feedback' : 'Communicative & Clear',
        icon: <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--color-success)' }} />,
        style: {
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-success)',
          color: 'var(--color-success)'
        }
      };
    }
    if (status === 'developing') {
      return {
        label: 'Emerging / Needs Calibration',
        icon: <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--color-warning)' }} />,
        style: {
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-warning)',
          color: 'var(--color-warning)'
        }
      };
    }
    return {
      label: 'Needs Support / Model Comparison',
      icon: <XCircle className="w-3.5 h-3.5" style={{ color: 'var(--color-error)' }} />,
      style: {
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-error)',
        color: 'var(--color-error)'
      }
    };
  };

  const badge = getStatusBadge();

  return (
    <motion.div
      id="evaluation-feedback-panel"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 sm:p-6 rounded-2xl border space-y-4 shadow-xs transition-colors"
      style={getContainerStyle()}
    >
      {/* Header Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        <div className="flex items-center space-x-2">
          <span
            className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border inline-flex items-center space-x-1.5"
            style={badge.style}
          >
            {badge.icon}
            <span>{badge.label}</span>
          </span>

          {isRecovered && (
            <span
              className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-accent)',
                color: 'var(--color-accent)'
              }}
            >
              Recovered
            </span>
          )}
        </div>

        <span className="text-[11px] font-medium opacity-80">
          Attempt {attemptNumber} of {maxAttempts}
        </span>
      </div>

      {/* Primary Educational Feedback */}
      <div className="space-y-2">
        <p className="text-xs sm:text-sm leading-relaxed font-medium">
          {feedback.message}
        </p>

        {/* Suggested Target Model Form */}
        {feedback.suggestedCorrection && (!isCorrect || status !== 'strong') && (
          <div
            className="text-xs p-3 rounded-xl border space-y-1"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Standard Target Form:
            </div>
            <p className="font-semibold">{feedback.suggestedCorrection}</p>
          </div>
        )}

        {/* Linguistic / Grammar Explanation */}
        {feedback.explanation && (
          <div className="flex items-start space-x-2 text-xs leading-relaxed opacity-90 pt-1">
            <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
            <span>{feedback.explanation}</span>
          </div>
        )}

        {/* Adaptive Retry Prompt Focus */}
        {canRetry && feedback.retryPrompt && (
          <div
            className="p-3 rounded-xl border flex items-start space-x-2.5 text-xs"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-warning)',
              color: 'var(--color-text-primary)'
            }}
          >
            <Target className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--color-warning)' }} />
            <div>
              <strong className="block font-semibold" style={{ color: 'var(--color-warning)' }}>
                Target Focus for Next Attempt:
              </strong>
              <span>{feedback.retryPrompt}</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Controls */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-end gap-2.5 border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        {canRetry ? (
          <>
            <button
              id="retry-drill-btn"
              type="button"
              onClick={onRetry}
              className="px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl inline-flex items-center justify-center space-x-2 shadow-xs transition-all cursor-pointer"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: '#FFFFFF'
              }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Try Again (Attempt {attemptNumber + 1} of {maxAttempts})</span>
            </button>

            <button
              id="skip-to-next-btn"
              type="button"
              onClick={onContinue}
              className="px-4 py-2 text-xs font-medium rounded-xl border transition-colors cursor-pointer"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)'
              }}
            >
              Continue to Next
            </button>
          </>
        ) : (
          <button
            id="continue-stage-btn"
            type="button"
            onClick={onContinue}
            className="px-6 py-2.5 text-xs sm:text-sm font-semibold rounded-xl text-white shadow-xs hover:shadow transition-all inline-flex items-center justify-center space-x-2 cursor-pointer"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <span>{isLastActivity ? 'Complete Learning Unit' : 'Next Stage'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
};
