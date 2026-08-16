import React, { useState } from 'react';
import { Source, SessionSummary, NextLearningDecision } from '../types';
import {
  Sparkles,
  Plus,
  BookOpen,
  Clock,
  ArrowRight,
  ArrowLeft,
  FileText,
  Compass,
  Award,
  RotateCcw,
  CheckCircle2,
  Trash2,
  TrendingUp,
  Brain,
  HelpCircle,
  Play
} from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../i18n/LanguageContext';

interface HomeScreenProps {
  sources: Source[];
  nextDecision: NextLearningDecision;
  sessionHistory?: SessionSummary[];
  onExecuteDecision: (decision: NextLearningDecision, chosenDurationMinutes: number) => void;
  onDiscardActiveSession?: () => void;
  onSelectSource: (source: Source) => void;
  onAddSource: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  sources,
  nextDecision,
  sessionHistory = [],
  onExecuteDecision,
  onDiscardActiveSession,
  onSelectSource,
  onAddSource
}) => {
  const { isRTL, t } = useLanguage();
  const [selectedDuration, setSelectedDuration] = useState<number>(
    nextDecision.recommendedDurationMinutes || 5
  );
  const [showReasonDetail, setShowReasonDetail] = useState<boolean>(true);

  // Sync default duration if decision changes
  React.useEffect(() => {
    if (nextDecision.recommendedDurationMinutes) {
      setSelectedDuration(nextDecision.recommendedDurationMinutes);
    }
  }, [nextDecision.type, nextDecision.recommendedDurationMinutes]);

  const handlePrimaryClick = () => {
    onExecuteDecision(nextDecision, selectedDuration);
  };

  return (
    <motion.div
      id="home-screen"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-10"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* ------------------------------------------------------------------- */}
      {/* DOMINANT ADAPTIVE NEXT LEARNING DECISION HERO CARD (PHASE 7)        */}
      {/* ------------------------------------------------------------------- */}
      <section
        id="next-learning-decision-card"
        className="p-6 sm:p-7 rounded-3xl border shadow-sm transition-all relative overflow-hidden"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: nextDecision.type === 'RESUME_SESSION'
            ? 'var(--color-accent)'
            : 'var(--color-border)'
        }}
      >
        <div className="flex flex-col space-y-5">
          {/* Header row: Badge + Reason toggle */}
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
              style={{
                backgroundColor: 'var(--color-accent-subtle)',
                color: 'var(--color-accent)'
              }}
            >
              {nextDecision.type === 'RESUME_SESSION' && (
                <RotateCcw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
              )}
              {nextDecision.type === 'REVIEW_DEVELOPING' && (
                <Brain className="w-3.5 h-3.5" />
              )}
              {nextDecision.type === 'CONTINUE_SOURCE' && (
                <BookOpen className="w-3.5 h-3.5" />
              )}
              {nextDecision.type === 'START_NEW_SESSION' && (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {nextDecision.type === 'ADD_SOURCE' && (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>{nextDecision.badge}</span>
            </div>

            <button
              onClick={() => setShowReasonDetail(!showReasonDetail)}
              className="text-[11px] font-medium inline-flex items-center gap-1 transition-opacity opacity-70 hover:opacity-100 cursor-pointer"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{t('home.nextDecision.whyThis')}</span>
            </button>
          </div>

          {/* Title and Subtitle */}
          <div className="space-y-1.5">
            <h2
              className="text-2xl sm:text-3xl font-semibold tracking-tight leading-snug"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {nextDecision.title}
            </h2>
            <p
              className="text-xs sm:text-sm font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {nextDecision.subtitle}
            </p>
          </div>

          {/* Explain Why Box */}
          {showReasonDetail && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-3.5 rounded-2xl text-xs leading-relaxed border transition-colors"
              style={{
                backgroundColor: 'var(--color-surface-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)'
              }}
            >
              <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {t('home.nextDecision.sectionTitle')}:{' '}
              </span>
              <span>{nextDecision.reason}</span>

              {nextDecision.targetItems && nextDecision.targetItems.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                  <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
                    Focus items:
                  </span>
                  {nextDecision.targetItems.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border"
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-accent)'
                      }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Time Picker (Only shown when launching a practice session, not when resuming) */}
          {nextDecision.type !== 'RESUME_SESSION' && nextDecision.type !== 'ADD_SOURCE' && (
            <div className="pt-1 space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <Clock className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
                <span>{t('home.nextDecision.chooseTime')}</span>
              </label>

              <div className="flex flex-wrap items-center gap-2">
                {nextDecision.availableDurations.map((duration) => {
                  const isSelected = selectedDuration === duration;
                  return (
                    <button
                      key={duration}
                      type="button"
                      onClick={() => setSelectedDuration(duration)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        isSelected ? 'shadow-xs scale-105' : 'hover:opacity-80'
                      }`}
                      style={{
                        backgroundColor: isSelected
                          ? 'var(--color-accent)'
                          : 'var(--color-surface-secondary)',
                        borderColor: isSelected
                          ? 'var(--color-accent)'
                          : 'var(--color-border)',
                        color: isSelected ? '#ffffff' : 'var(--color-text-primary)'
                      }}
                    >
                      {duration} {t('home.nextDecision.minutesShort')}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Row: ONE Clear Primary Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              id="next-decision-primary-btn"
              onClick={handlePrimaryClick}
              className="w-full sm:w-auto px-7 py-3.5 text-white font-medium rounded-2xl shadow-sm hover:shadow transition-all duration-150 inline-flex items-center justify-center gap-2.5 text-sm cursor-pointer"
              style={{
                backgroundColor: 'var(--color-accent)'
              }}
            >
              {nextDecision.type === 'RESUME_SESSION' ? (
                <RotateCcw className="w-4 h-4" />
              ) : nextDecision.type === 'ADD_SOURCE' ? (
                <Plus className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              <span>{nextDecision.primaryActionLabel}</span>
              {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>

            {/* Discard Active Session Button if currently resuming */}
            {nextDecision.type === 'RESUME_SESSION' && onDiscardActiveSession && (
              <button
                id="next-decision-discard-btn"
                onClick={onDiscardActiveSession}
                className="w-full sm:w-auto px-4 py-3.5 border rounded-2xl text-xs font-medium transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-surface-secondary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)'
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('home.nextDecision.discardBtn')}</span>
              </button>
            )}

            {/* Inspect Source Button if a source is attached */}
            {nextDecision.recommendedSource && nextDecision.type !== 'RESUME_SESSION' && (
              <button
                onClick={() => onSelectSource(nextDecision.recommendedSource!)}
                className="w-full sm:w-auto px-4 py-3.5 border rounded-2xl text-xs font-medium transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)'
                }}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Inspect Source</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------- */}
      {/* LEARNING SOURCES DIRECTORY                                          */}
      {/* ------------------------------------------------------------------- */}
      <section id="home-sources-section" className="space-y-4 pt-1">
        <div
          className="flex items-center justify-between border-b pb-3"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div>
            <h2
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {t('home.sourcesTitle')}
            </h2>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {t('home.sourcesSubtitle')}
            </p>
          </div>

          <button
            id="add-source-section-btn"
            onClick={onAddSource}
            className="text-xs font-semibold inline-flex items-center gap-1 py-1.5 px-3 rounded-xl border transition-colors cursor-pointer"
            style={{
              backgroundColor: 'var(--color-accent-subtle)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-accent)'
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('home.addSourceBtn')}</span>
          </button>
        </div>

        {sources.length === 0 ? (
          <div
            id="no-sources-card"
            className="text-center py-12 rounded-2xl border border-dashed p-8 space-y-3"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)'
            }}
          >
            <FileText className="w-8 h-8 mx-auto" style={{ color: 'var(--color-text-tertiary)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {t('home.noSourcesTitle')}
            </p>
            <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
              {t('home.noSourcesDesc')}
            </p>
            <button
              id="add-first-source-btn"
              onClick={onAddSource}
              className="mt-2 px-4 py-2 text-white text-xs font-medium rounded-xl shadow-xs transition-colors cursor-pointer"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              {t('home.addFirstSource')}
            </button>
          </div>
        ) : (
          <div id="sources-grid" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sources.map((source) => {
              const cefrLevel = source.analysis?.estimatedLevel;
              const isAnalyzing = source.analysisStatus === 'analyzing';
              const isFailed = source.analysisStatus === 'failed';

              return (
                <div
                  id={`source-card-${source.id}`}
                  key={source.id}
                  onClick={() => onSelectSource(source)}
                  className="group p-5 rounded-2xl border cursor-pointer transition-all duration-150 flex flex-col justify-between shadow-xs hover:shadow-sm"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
                          style={{
                            backgroundColor: 'var(--color-surface-secondary)',
                            borderColor: 'var(--color-border)',
                            color: 'var(--color-text-secondary)'
                          }}
                        >
                          {source.type}
                        </span>

                        {cefrLevel && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-0.5"
                            style={{
                              backgroundColor: 'var(--color-accent-subtle)',
                              borderColor: 'var(--color-border)',
                              color: 'var(--color-accent)'
                            }}
                          >
                            <Award className="w-2.5 h-2.5" />
                            <span>{cefrLevel}</span>
                          </span>
                        )}

                        {isAnalyzing && (
                          <span
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full animate-pulse"
                            style={{
                              backgroundColor: 'var(--color-accent-subtle)',
                              color: 'var(--color-accent)'
                            }}
                          >
                            {t('home.statusAnalyzing')}
                          </span>
                        )}

                        {isFailed && (
                          <span
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: 'var(--color-error-subtle)',
                              color: 'var(--color-error)'
                            }}
                          >
                            {t('home.statusFailed')}
                          </span>
                        )}
                      </div>

                      <span
                        className="text-xs font-medium"
                        style={{ color: 'var(--color-text-tertiary)' }}
                      >
                        {source.wordCount} {t('sourceDetails.words')}
                      </span>
                    </div>

                    <h3
                      className="font-semibold text-sm sm:text-base transition-colors line-clamp-1"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {source.title}
                    </h3>

                    <p
                      className="text-xs line-clamp-2 mt-1.5 leading-relaxed"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {source.content}
                    </p>
                  </div>

                  <div
                    className="mt-4 pt-3 border-t flex items-center justify-between text-xs"
                    style={{
                      borderColor: 'var(--color-border)'
                    }}
                  >
                    <span style={{ color: 'var(--color-text-tertiary)' }}>
                      {new Date(source.createdAt).toLocaleDateString()}
                    </span>
                    <span
                      className="font-medium group-hover:underline inline-flex items-center gap-1"
                      style={{ color: 'var(--color-accent)' }}
                    >
                      <span>{t('home.inspectAndPractice')}</span>
                      {isRTL ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------- */}
      {/* SESSION HISTORY / YOUR PROGRESS                                     */}
      {/* ------------------------------------------------------------------- */}
      {sessionHistory && sessionHistory.length > 0 && (
        <section id="home-history-section" className="space-y-4 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2
                className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"
                style={{ color: 'var(--color-text-primary)' }}
              >
                <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
                <span>{t('home.history.title')}</span>
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {t('home.history.subtitle')}
              </p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full border font-mono font-medium"
              style={{
                backgroundColor: 'var(--color-surface-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)'
              }}
            >
              {sessionHistory.length} completed
            </span>
          </div>

          <div className="space-y-2.5">
            {sessionHistory.slice(0, 4).map((summary) => {
              const accuracyPercent = summary.totalExercises > 0
                ? Math.round((summary.correctExercises / summary.totalExercises) * 100)
                : 0;

              return (
                <div
                  key={summary.id}
                  className="p-4 rounded-xl border transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)'
                  }}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs" style={{ color: 'var(--color-text-primary)' }}>
                        {summary.sourceTitle}
                      </span>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
                        style={{
                          backgroundColor: 'var(--color-accent-subtle)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-accent)'
                        }}
                      >
                        {summary.objectiveAchievement.level}
                      </span>
                    </div>
                    <p className="text-xs line-clamp-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {summary.objective.title}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="font-medium">{accuracyPercent}%</span>
                    </div>
                    <span>•</span>
                    <span>{summary.durationMinutes}m ({summary.actualDurationSeconds}s)</span>
                    <span>•</span>
                    <span style={{ color: 'var(--color-text-tertiary)' }}>
                      {new Date(summary.completedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* CORE PEDAGOGY HIGHLIGHTS                                            */}
      {/* ------------------------------------------------------------------- */}
      <section id="home-principles-section" className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
        <div
          className="p-5 rounded-2xl border space-y-2 transition-colors text-left rtl:text-right"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)'
          }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center mb-2"
            style={{
              backgroundColor: 'var(--color-accent-subtle)',
              color: 'var(--color-accent)'
            }}
          >
            <Clock className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {t('home.principles.timeTitle')}
          </h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {t('home.principles.timeDesc')}
          </p>
        </div>

        <div
          className="p-5 rounded-2xl border space-y-2 transition-colors text-left rtl:text-right"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)'
          }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center mb-2"
            style={{
              backgroundColor: 'var(--color-accent-subtle)',
              color: 'var(--color-accent)'
            }}
          >
            <Compass className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {t('home.principles.noDecisionsTitle')}
          </h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {t('home.principles.noDecisionsDesc')}
          </p>
        </div>

        <div
          className="p-5 rounded-2xl border space-y-2 transition-colors text-left rtl:text-right"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)'
          }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center mb-2"
            style={{
              backgroundColor: 'var(--color-accent-subtle)',
              color: 'var(--color-accent)'
            }}
          >
            <BookOpen className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {t('home.principles.implicitTitle')}
          </h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {t('home.principles.implicitDesc')}
          </p>
        </div>
      </section>
    </motion.div>
  );
};
