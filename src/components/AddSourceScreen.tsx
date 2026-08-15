import React, { useState } from 'react';
import { Source, UserProfile } from '../types';
import { LocalRepository } from '../services/store';
import { AIService } from '../services/ai';
import { useLanguage } from '../i18n/LanguageContext';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface AddSourceScreenProps {
  userProfile?: UserProfile | null;
  onSaved: (source: Source) => void;
  onCancel: () => void;
}

export const AddSourceScreen: React.FC<AddSourceScreenProps> = ({ userProfile, onSaved, onCancel }) => {
  const { t, isRTL } = useLanguage();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanContent = content.trim();

    // 1. Validation: Empty Check
    if (!cleanContent) {
      setError(t('addSource.validation.emptyText'));
      return;
    }

    // 2. Validation: English letters check
    if (!/[a-zA-Z]/.test(cleanContent)) {
      setError(t('addSource.validation.noEnglishWords'));
      return;
    }

    // 3. Validation: Minimum length
    if (wordCount < 5) {
      setError(t('addSource.validation.tooShort'));
      return;
    }

    // 4. Validation: Maximum length upper bound
    if (wordCount > 2500 || cleanContent.length > 15000) {
      setError(t('addSource.validation.tooLong'));
      return;
    }

    setError('');
    setIsAnalyzing(true);

    // Save initial source in 'analyzing' status
    const newSource = LocalRepository.createSource({
      title: title.trim(),
      content: cleanContent,
      type: 'text',
      initialStatus: 'analyzing'
    });

    try {
      // Execute analysis via AI Service
      const analysis = await AIService.analyzeSource({
        title: newSource.title,
        content: newSource.content,
        userLevel: userProfile?.level !== 'unknown' ? userProfile?.level : undefined,
        userProfile
      });

      const updated = LocalRepository.saveSourceAnalysis(newSource.id, analysis);
      setIsAnalyzing(false);
      onSaved(updated || newSource);
    } catch (err) {
      console.error('Source analysis failed:', err);
      LocalRepository.setSourceAnalysisStatus(newSource.id, 'failed');
      setIsAnalyzing(false);
      const failedSource = LocalRepository.getSourceById(newSource.id) || newSource;
      onSaved(failedSource);
    }
  };

  return (
    <motion.div
      id="add-source-screen"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="max-w-2xl w-full mx-auto rounded-2xl border shadow-xs p-6 sm:p-8 space-y-6 transition-colors"
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)'
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between border-b pb-4"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <button
            id="back-to-home-btn"
            type="button"
            onClick={onCancel}
            disabled={isAnalyzing}
            className="text-xs font-medium inline-flex items-center gap-1 mb-2 focus:outline-none transition-colors cursor-pointer disabled:opacity-50"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <ArrowLeft className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
            <span>{t('common.back')}</span>
          </button>
          <h1
            className="text-xl sm:text-2xl font-bold tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {t('addSource.title')}
          </h1>
          <p className="text-xs sm:text-sm mt-1 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {t('addSource.subtitle')}
          </p>
        </div>
      </div>

      {/* Analyzing Progress Overlay */}
      {isAnalyzing ? (
        <div id="analyzing-state" className="py-12 px-4 text-center space-y-4">
          <div className="flex justify-center">
            <Loader2
              className="w-10 h-10 animate-spin"
              style={{ color: 'var(--color-accent)' }}
            />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3
              className="text-base font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {t('addSource.analyzing')}
            </h3>
            <p
              className="text-xs leading-relaxed"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('addSource.analyzingDesc')}
            </p>
          </div>
        </div>
      ) : (
        /* Focused Input Form */
        <form id="add-source-form" onSubmit={handleAnalyze} className="space-y-5">
          {/* Optional Title Input */}
          <div>
            <label
              htmlFor="source-title-input"
              className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('addSource.sourceTitleLabel')}
            </label>
            <input
              id="source-title-input"
              type="text"
              placeholder={t('addSource.sourceTitlePlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 border rounded-xl focus:outline-none transition-colors text-sm"
              style={{
                backgroundColor: 'var(--color-surface-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
            />
          </div>

          {/* Multiline Text Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="source-content-textarea"
                className="block text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {t('addSource.contentLabel')}
              </label>
              <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                {wordCount} {t('addSource.wordCount')}
              </span>
            </div>
            <textarea
              id="source-content-textarea"
              rows={8}
              placeholder={t('addSource.contentPlaceholder')}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (error) setError('');
              }}
              className="w-full px-4 py-3 border rounded-xl focus:outline-none transition-colors text-sm leading-relaxed"
              style={{
                backgroundColor: 'var(--color-surface-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
            />
          </div>

          {/* Error Notice */}
          {error && (
            <div
              id="add-source-error"
              className="p-3 border text-xs rounded-xl"
              style={{
                backgroundColor: 'var(--color-error-subtle)',
                borderColor: 'var(--color-error)',
                color: 'var(--color-error)'
              }}
            >
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div
            className="flex items-center justify-end gap-3 pt-4 border-t"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <button
              id="cancel-add-source-btn"
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 text-xs font-medium rounded-xl transition-colors cursor-pointer"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('common.cancel')}
            </button>
            <button
              id="submit-add-source-btn"
              type="submit"
              className="px-6 py-2.5 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              {t('addSource.analyzeBtn')}
            </button>
          </div>
        </form>
      )}
    </motion.div>
  );
};
