import React, { useState } from 'react';
import { Source, UserProfile } from '../types';
import { ArrowLeft, Clock, Trash2, Calendar, FileText, ChevronDown, ChevronUp, Award } from 'lucide-react';
import { motion } from 'motion/react';
import { SourceAnalysisView } from './SourceAnalysisView';
import { useLanguage } from '../i18n/LanguageContext';

interface SourceDetailsScreenProps {
  source: Source;
  userProfile?: UserProfile | null;
  onBack: () => void;
  onStartPractice: () => void;
  onDeleteSource?: (id: string) => void;
  onSourceUpdated?: (updated: Source) => void;
}

export const SourceDetailsScreen: React.FC<SourceDetailsScreenProps> = ({
  source,
  userProfile,
  onBack,
  onStartPractice,
  onDeleteSource,
  onSourceUpdated
}) => {
  const { t, isRTL } = useLanguage();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showOriginalText, setShowOriginalText] = useState(false);

  const cefrLevel = source.analysis?.estimatedLevel;

  return (
    <motion.div
      id="source-details-screen"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="max-w-3xl w-full mx-auto rounded-2xl border shadow-xs p-6 sm:p-8 space-y-6 transition-colors"
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)'
      }}
    >
      {/* Top Bar Navigation */}
      <div
        className="flex items-center justify-between border-b pb-4"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <button
          id="back-to-sources-btn"
          type="button"
          onClick={onBack}
          className="text-xs font-medium inline-flex items-center gap-1 focus:outline-none transition-colors cursor-pointer"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <ArrowLeft className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
          <span>{t('sourceDetails.backToSources')}</span>
        </button>

        <div className="flex items-center gap-2">
          {cefrLevel && (
            <span
              className="text-xs font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1"
              style={{
                backgroundColor: 'var(--color-accent-subtle)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-accent)'
              }}
            >
              <Award className="w-3 h-3" />
              <span>{cefrLevel}</span>
            </span>
          )}

          {onDeleteSource && (
            confirmDelete ? (
              <div className="inline-flex items-center gap-1">
                <span className="text-[11px]" style={{ color: 'var(--color-error)' }}>
                  {t('sourceDetails.deleteConfirm')}
                </span>
                <button
                  id="confirm-delete-source-btn"
                  onClick={() => onDeleteSource(source.id)}
                  className="px-2 py-1 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  style={{ backgroundColor: 'var(--color-error)' }}
                >
                  {t('common.confirm')}
                </button>
                <button
                  id="cancel-delete-source-btn"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-1 rounded-lg text-xs border transition-colors cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-surface-secondary)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  {t('common.cancel')}
                </button>
              </div>
            ) : (
              <button
                id="delete-source-btn"
                onClick={() => setConfirmDelete(true)}
                className="p-1.5 rounded-lg transition-colors cursor-pointer"
                style={{ color: 'var(--color-text-tertiary)' }}
                title={t('sourceDetails.deleteSource')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )
          )}
        </div>
      </div>

      {/* Header Info */}
      <div className="space-y-2.5">
        <h1
          className="text-xl sm:text-2xl font-bold tracking-tight leading-snug"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {source.title}
        </h1>

        <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          <span className="inline-flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" style={{ color: 'var(--color-text-tertiary)' }} />
            <span><strong style={{ color: 'var(--color-text-primary)' }}>{source.wordCount}</strong> {t('sourceDetails.words')}</span>
          </span>
          <span>•</span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--color-text-tertiary)' }} />
            <span>{new Date(source.createdAt).toLocaleDateString()}</span>
          </span>
        </div>
      </div>

      {/* Toggle Original Text Accordion */}
      <div
        className="border rounded-2xl overflow-hidden transition-colors"
        style={{
          backgroundColor: 'var(--color-surface-secondary)',
          borderColor: 'var(--color-border)'
        }}
      >
        <button
          id="toggle-original-text-btn"
          type="button"
          onClick={() => setShowOriginalText(!showOriginalText)}
          className="w-full p-4 flex items-center justify-between text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer text-left"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <span>{showOriginalText ? t('sourceDetails.hideOriginalText') : t('sourceDetails.viewOriginalText')}</span>
          {showOriginalText ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showOriginalText && (
          <div className="px-4 pb-4 border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
            <p
              className="text-xs sm:text-sm leading-relaxed max-h-72 overflow-y-auto whitespace-pre-line"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {source.content}
            </p>
          </div>
        )}
      </div>

      {/* Deep Linguistic / Pedagogical Analysis */}
      <SourceAnalysisView
        source={source}
        userProfile={userProfile}
        onAnalysisUpdated={onSourceUpdated}
      />

      {/* Action Footer */}
      <div
        className="pt-4 flex items-center justify-between border-t"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <button
          id="back-bottom-btn"
          type="button"
          onClick={onBack}
          className="text-xs font-medium transition-colors cursor-pointer"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('common.cancel')}
        </button>

        <button
          id="start-practice-source-btn"
          type="button"
          onClick={onStartPractice}
          className="px-6 py-3 text-white text-sm font-semibold rounded-xl shadow-xs transition-all inline-flex items-center gap-2 cursor-pointer"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          <Clock className="w-4 h-4" />
          <span>{t('sourceDetails.startPractice')}</span>
        </button>
      </div>
    </motion.div>
  );
};
