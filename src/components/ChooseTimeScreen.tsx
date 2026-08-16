import React, { useState, useMemo } from 'react';
import { Source } from '../types';
import { SessionEngine, DurationMeta } from '../services/sessionEngine';
import { LearningStateManager } from '../services/learningState';
import { ArrowLeft, Sparkles, ArrowRight, Milestone, Target, CheckCircle2, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';

interface ChooseTimeScreenProps {
  source: Source;
  onBack: () => void;
  onConfirm: (durationMinutes: number) => void;
}

export const ChooseTimeScreen: React.FC<ChooseTimeScreenProps> = ({
  source,
  onBack,
  onConfirm
}) => {
  const [selectedDuration, setSelectedDuration] = useState<number>(5);
  const durations = SessionEngine.AVAILABLE_DURATIONS;
  const currentMeta: DurationMeta = SessionEngine.getMetaForDuration(selectedDuration);

  // Categorize source assets to give transparent feedback on adaptation
  const assetCategory = useMemo(() => {
    return LearningStateManager.categorizeSourceAssets(source);
  }, [source]);

  const reviewCount = assetCategory.developing.length;
  const newCount = assetCategory.newItems.length;

  return (
    <motion.div
      id="choose-time-screen"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="max-w-2xl mx-auto rounded-2xl border shadow-sm p-6 sm:p-8 space-y-7 transition-colors"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)'
      }}
    >
      {/* Top Header */}
      <div
        className="space-y-2 border-b pb-4"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <button
          id="back-to-source-details-btn"
          type="button"
          onClick={onBack}
          className="text-xs font-medium inline-flex items-center space-x-1 mb-1 focus:outline-none transition-colors cursor-pointer"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Source</span>
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h2
              className="text-2xl font-semibold tracking-tight"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Configure Learning Unit
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              Source Material: <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{source.title}</span>
            </p>
          </div>
          <div
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium border"
            style={{
              backgroundColor: 'var(--color-accent-subtle)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-accent)'
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Complete Pedagogical Unit</span>
          </div>
        </div>
      </div>

      {/* Adaptive Planning Banner */}
      {reviewCount > 0 ? (
        <div
          id="adaptive-context-banner"
          className="p-3.5 rounded-xl border flex items-center justify-between text-xs transition-colors"
          style={{
            backgroundColor: 'var(--color-accent-subtle)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)'
          }}
        >
          <div className="flex items-center space-x-2.5">
            <RotateCcw className="w-4 h-4 shrink-0" style={{ color: 'var(--color-accent)' }} />
            <div>
              <span className="font-semibold block" style={{ color: 'var(--color-text-primary)' }}>
                Adaptive Session Prioritization
              </span>
              <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                The engine identified {reviewCount} developing pattern{reviewCount > 1 ? 's' : ''} ({assetCategory.developing.slice(0, 3).join(', ')}) to reinforce alongside {newCount} new concept{newCount > 1 ? 's' : ''}.
              </span>
            </div>
          </div>
          <span
            className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border shrink-0 hidden sm:inline-block"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-accent)'
            }}
          >
            Review Balanced
          </span>
        </div>
      ) : (
        <div
          id="adaptive-context-banner"
          className="p-3.5 rounded-xl border flex items-center justify-between text-xs transition-colors"
          style={{
            backgroundColor: 'var(--color-surface-secondary)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)'
          }}
        >
          <div className="flex items-center space-x-2.5">
            <Sparkles className="w-4 h-4 shrink-0" style={{ color: 'var(--color-accent)' }} />
            <div>
              <span className="font-semibold block" style={{ color: 'var(--color-text-primary)' }}>
                Fresh Exploratory Material
              </span>
              <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                All target concepts from this source are new to your learning journey.
              </span>
            </div>
          </div>
          <span
            className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border shrink-0 hidden sm:inline-block"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-tertiary)'
            }}
          >
            Fresh Acquisition
          </span>
        </div>
      )}

      {/* Time Selection Cards (3, 5, 10, 15, 20 min) */}
      <div className="space-y-3">
        <label
          className="block text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Select Available Practice Time
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {durations.map((meta) => {
            const isSelected = selectedDuration === meta.duration;
            return (
              <button
                id={`duration-btn-${meta.duration}`}
                key={meta.duration}
                type="button"
                onClick={() => setSelectedDuration(meta.duration)}
                className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-between cursor-pointer ${
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
                    : 'var(--color-text-primary)'
                }}
              >
                <span className="text-2xl font-semibold tracking-tight">{meta.duration}</span>
                <span
                  className="text-[11px] uppercase tracking-wider mt-0.5"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  min
                </span>
                <span
                  className="mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full border truncate max-w-full"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    color: isSelected
                      ? 'var(--color-accent)'
                      : 'var(--color-text-secondary)'
                  }}
                >
                  {meta.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Session Strategy Breakdown */}
      <div
        id="session-breakdown-card"
        className="p-5 border rounded-2xl space-y-4 transition-colors"
        style={{
          backgroundColor: 'var(--color-surface-secondary)',
          borderColor: 'var(--color-border)'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border"
              style={{
                backgroundColor: 'var(--color-accent-subtle)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-accent)'
              }}
            >
              {currentMeta.label}
            </span>
            <span
              className="text-xs font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              ({currentMeta.exerciseCount} Structured Activities)
            </span>
          </div>
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
            ~{Math.round((selectedDuration * 60) / currentMeta.exerciseCount)}s per activity
          </span>
        </div>

        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {currentMeta.description} Every session starts with an explicit objective, navigates purposeful learning stages, and verifies endpoint retention.
        </p>

        {/* Pedagogical Journey Pipeline Stepper */}
        <div
          className="pt-3 border-t space-y-2.5"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-[11px] font-semibold uppercase tracking-wider flex items-center space-x-1.5"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <Milestone className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
              <span>Pedagogical Sequence (Start → Journey → Endpoint)</span>
            </span>
          </div>

          <div className="space-y-2">
            {currentMeta.stages.map((stg, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs p-2.5 rounded-xl border transition-colors"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)'
                }}
              >
                <div className="flex items-center space-x-2.5">
                  <span
                    className="w-5 h-5 rounded-full border text-[10px] font-bold flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: 'var(--color-surface-secondary)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-accent)'
                    }}
                  >
                    {idx + 1}
                  </span>
                  <div>
                    <span className="font-semibold block" style={{ color: 'var(--color-text-primary)' }}>
                      {stg.label}
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                      {stg.intent}
                    </span>
                  </div>
                </div>
                <span
                  className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border shrink-0 hidden sm:inline-block"
                  style={{
                    backgroundColor: 'var(--color-surface-secondary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-tertiary)'
                  }}
                >
                  {stg.stage.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Target Outcome Guarantee */}
      <div
        className="text-xs p-3.5 rounded-xl border border-dashed flex items-start space-x-2.5 transition-colors"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-secondary)'
        }}
      >
        <Target className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
        <div className="space-y-0.5">
          <span className="font-semibold block" style={{ color: 'var(--color-text-primary)' }}>
            Implicit Mastery Objective
          </span>
          <span>
            You will not just complete exercises; your neural pathways will calibrate target collocations, auditory decoding, and speech intonation without tedious rule drills.
          </span>
        </div>
      </div>

      {/* Actions */}
      <div
        className="flex items-center justify-between pt-2 border-t"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <button
          id="cancel-choose-time-btn"
          type="button"
          onClick={onBack}
          className="text-xs font-medium transition-colors cursor-pointer"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Cancel
        </button>

        <button
          id="begin-session-btn"
          type="button"
          onClick={() => onConfirm(selectedDuration)}
          className="px-6 py-3 text-white text-sm font-semibold rounded-xl shadow-xs hover:shadow transition-all inline-flex items-center space-x-2 cursor-pointer"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          <span>Begin {selectedDuration}-Minute Journey</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};
