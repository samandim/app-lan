import React, { useState } from 'react';
import { Source, SourceAnalysis, UserProfile } from '../types';
import { AIService } from '../services/ai';
import { LocalRepository } from '../services/store';
import { LearningStateManager } from '../services/learningState';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Sparkles,
  BookOpen,
  HelpCircle,
  Mic,
  RefreshCw,
  AlertCircle,
  Layers,
  MessageSquare
} from 'lucide-react';

interface SourceAnalysisViewProps {
  source: Source;
  userProfile?: UserProfile | null;
  onAnalysisUpdated?: (updated: Source) => void;
}

export const SourceAnalysisView: React.FC<SourceAnalysisViewProps> = ({
  source,
  userProfile,
  onAnalysisUpdated
}) => {
  const { t, isRTL } = useLanguage();
  const [isRetrying, setIsRetrying] = useState(false);
  const [activeTab, setActiveTab] = useState<'vocabulary' | 'phrases' | 'comprehension' | 'speaking' | 'grammar'>('vocabulary');

  const analysis: SourceAnalysis | undefined = source.analysis;
  const status = source.analysisStatus || (analysis ? 'analyzed' : 'not_analyzed');

  const handleRunAnalysis = async () => {
    setIsRetrying(true);
    LocalRepository.setSourceAnalysisStatus(source.id, 'analyzing');

    try {
      const result = await AIService.analyzeSource({
        title: source.title,
        content: source.content,
        userLevel: userProfile?.level !== 'unknown' ? userProfile?.level : undefined,
        userProfile
      });

      const updated = LocalRepository.saveSourceAnalysis(source.id, result);
      setIsRetrying(false);
      if (onAnalysisUpdated && updated) {
        onAnalysisUpdated(updated);
      }
    } catch (err) {
      console.error('Analysis failed:', err);
      LocalRepository.setSourceAnalysisStatus(source.id, 'failed');
      setIsRetrying(false);
      const failed = LocalRepository.getSourceById(source.id) || source;
      if (onAnalysisUpdated) {
        onAnalysisUpdated(failed);
      }
    }
  };

  // State 1: Analyzing in progress
  if (status === 'analyzing' || isRetrying) {
    return (
      <div
        id="source-analyzing-card"
        className="p-6 border rounded-2xl text-center space-y-3 transition-colors"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)'
        }}
      >
        <RefreshCw
          className="w-7 h-7 animate-spin mx-auto"
          style={{ color: 'var(--color-accent)' }}
        />
        <div className="space-y-1">
          <h3
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {t('sourceDetails.analyzingTitle')}
          </h3>
          <p
            className="text-xs max-w-md mx-auto leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('sourceDetails.analyzingSub')}
          </p>
        </div>
      </div>
    );
  }

  // State 2: Analysis Failed
  if (status === 'failed') {
    return (
      <div
        id="source-failed-card"
        className="p-5 border rounded-2xl space-y-3 transition-colors"
        style={{
          backgroundColor: 'var(--color-error-subtle)',
          borderColor: 'var(--color-error)',
          color: 'var(--color-error)'
        }}
      >
        <div className="flex items-center gap-2 font-semibold text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{t('sourceDetails.failedTitle')}</span>
        </div>
        <p className="text-xs leading-relaxed opacity-90">
          {t('sourceDetails.failedDesc')}
        </p>
        <button
          id="retry-analysis-btn"
          type="button"
          onClick={handleRunAnalysis}
          className="px-4 py-2 text-xs font-semibold rounded-xl border shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)'
          }}
        >
          <RefreshCw className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
          <span>{t('sourceDetails.retryAnalysis')}</span>
        </button>
      </div>
    );
  }

  // State 3: Not analyzed yet
  if (!analysis) {
    return (
      <div
        id="source-un-analyzed-card"
        className="p-5 border rounded-2xl text-center space-y-3 transition-colors"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)'
        }}
      >
        <Sparkles className="w-6 h-6 mx-auto" style={{ color: 'var(--color-accent)' }} />
        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {t('sourceDetails.noAnalysisYet')}
        </p>
        <button
          id="analyze-now-btn"
          type="button"
          onClick={handleRunAnalysis}
          className="px-4 py-2 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          {t('sourceDetails.analyzeNow')}
        </button>
      </div>
    );
  }

  // State 4: Analyzed successfully
  const vocabCount = analysis.vocabulary?.length || 0;
  const phrasesCount = analysis.phrases?.length || 0;
  const questionsCount = analysis.comprehensionQuestions?.length || 0;
  const promptsCount = analysis.speakingPrompts?.length || 0;
  const grammarCount = analysis.grammarPatterns?.length || 0;

  return (
    <div
      id="source-analysis-section"
      className="space-y-4"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Summary Box (if present) */}
      {analysis.summary && (
        <div
          id="analysis-summary-box"
          className="p-4 border rounded-2xl space-y-1 transition-colors"
          style={{
            backgroundColor: 'var(--color-surface-secondary)',
            borderColor: 'var(--color-border)'
          }}
        >
          <h4
            className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <BookOpen className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
            <span>{t('sourceDetails.summary')}</span>
          </h4>
          <p
            className="text-xs sm:text-sm leading-relaxed"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {analysis.summary}
          </p>
        </div>
      )}

      {/* Main Learning Assets Container */}
      <div
        id="analysis-assets-card"
        className="border rounded-2xl overflow-hidden transition-colors"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)'
        }}
      >
        {/* Navigation Tabs */}
        <div
          className="flex border-b overflow-x-auto text-xs font-medium"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <button
            id="tab-btn-vocabulary"
            type="button"
            onClick={() => setActiveTab('vocabulary')}
            className="px-4 py-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
            style={{
              borderColor: activeTab === 'vocabulary' ? 'var(--color-accent)' : 'transparent',
              color: activeTab === 'vocabulary' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              fontWeight: activeTab === 'vocabulary' ? 600 : 500
            }}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t('sourceDetails.tabs.vocabulary')}</span>
            <span
              className="text-[10px] px-1.5 py-0.2 rounded-full"
              style={{
                backgroundColor: activeTab === 'vocabulary' ? 'var(--color-accent-subtle)' : 'var(--color-surface-secondary)',
                color: activeTab === 'vocabulary' ? 'var(--color-accent)' : 'var(--color-text-tertiary)'
              }}
            >
              {vocabCount}
            </span>
          </button>

          <button
            id="tab-btn-phrases"
            type="button"
            onClick={() => setActiveTab('phrases')}
            className="px-4 py-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
            style={{
              borderColor: activeTab === 'phrases' ? 'var(--color-accent)' : 'transparent',
              color: activeTab === 'phrases' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              fontWeight: activeTab === 'phrases' ? 600 : 500
            }}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{t('sourceDetails.tabs.phrases')}</span>
            <span
              className="text-[10px] px-1.5 py-0.2 rounded-full"
              style={{
                backgroundColor: activeTab === 'phrases' ? 'var(--color-accent-subtle)' : 'var(--color-surface-secondary)',
                color: activeTab === 'phrases' ? 'var(--color-accent)' : 'var(--color-text-tertiary)'
              }}
            >
              {phrasesCount}
            </span>
          </button>

          <button
            id="tab-btn-comprehension"
            type="button"
            onClick={() => setActiveTab('comprehension')}
            className="px-4 py-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
            style={{
              borderColor: activeTab === 'comprehension' ? 'var(--color-accent)' : 'transparent',
              color: activeTab === 'comprehension' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              fontWeight: activeTab === 'comprehension' ? 600 : 500
            }}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{t('sourceDetails.tabs.comprehension')}</span>
            <span
              className="text-[10px] px-1.5 py-0.2 rounded-full"
              style={{
                backgroundColor: activeTab === 'comprehension' ? 'var(--color-accent-subtle)' : 'var(--color-surface-secondary)',
                color: activeTab === 'comprehension' ? 'var(--color-accent)' : 'var(--color-text-tertiary)'
              }}
            >
              {questionsCount}
            </span>
          </button>

          <button
            id="tab-btn-speaking"
            type="button"
            onClick={() => setActiveTab('speaking')}
            className="px-4 py-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
            style={{
              borderColor: activeTab === 'speaking' ? 'var(--color-accent)' : 'transparent',
              color: activeTab === 'speaking' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              fontWeight: activeTab === 'speaking' ? 600 : 500
            }}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{t('sourceDetails.tabs.speaking')}</span>
            <span
              className="text-[10px] px-1.5 py-0.2 rounded-full"
              style={{
                backgroundColor: activeTab === 'speaking' ? 'var(--color-accent-subtle)' : 'var(--color-surface-secondary)',
                color: activeTab === 'speaking' ? 'var(--color-accent)' : 'var(--color-text-tertiary)'
              }}
            >
              {promptsCount}
            </span>
          </button>

          <button
            id="tab-btn-grammar"
            type="button"
            onClick={() => setActiveTab('grammar')}
            className="px-4 py-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
            style={{
              borderColor: activeTab === 'grammar' ? 'var(--color-accent)' : 'transparent',
              color: activeTab === 'grammar' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              fontWeight: activeTab === 'grammar' ? 600 : 500
            }}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{t('sourceDetails.tabs.grammar')}</span>
            <span
              className="text-[10px] px-1.5 py-0.2 rounded-full"
              style={{
                backgroundColor: activeTab === 'grammar' ? 'var(--color-accent-subtle)' : 'var(--color-surface-secondary)',
                color: activeTab === 'grammar' ? 'var(--color-accent)' : 'var(--color-text-tertiary)'
              }}
            >
              {grammarCount}
            </span>
          </button>
        </div>

        {/* Tab Content Display */}
        <div className="p-4 sm:p-5">
          {/* Tab: Vocabulary */}
          {activeTab === 'vocabulary' && (
            <div id="tab-content-vocabulary" className="space-y-3">
              {analysis.vocabulary && analysis.vocabulary.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {analysis.vocabulary.map((item, idx) => {
                    const assetState = LearningStateManager.getAssetState(item.word);
                    const isStrong = assetState?.status === 'strong';
                    const isDeveloping = assetState?.status === 'developing';
                    const isNew = !assetState || assetState.exposureCount === 0;

                    return (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border space-y-1.5 transition-colors"
                        style={{
                          backgroundColor: 'var(--color-surface-secondary)',
                          borderColor: 'var(--color-border)'
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span
                              className="font-semibold text-sm"
                              style={{ color: 'var(--color-text-primary)' }}
                            >
                              {item.word}
                            </span>
                            <span
                              className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md border"
                              style={{
                                backgroundColor: isStrong
                                  ? 'var(--color-success-subtle)'
                                  : isDeveloping
                                  ? 'var(--color-accent-subtle)'
                                  : 'var(--color-surface)',
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
                          </div>
                          {item.difficulty && (
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-md italic"
                              style={{
                                backgroundColor: 'var(--color-surface)',
                                color: 'var(--color-text-tertiary)'
                              }}
                            >
                              {item.difficulty}
                            </span>
                          )}
                        </div>
                        <p
                          className="text-xs leading-relaxed"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {item.meaning}
                        </p>
                        {item.example && (
                          <p
                            className="text-[11px] italic pt-1 border-t"
                            style={{
                              color: 'var(--color-text-tertiary)',
                              borderColor: 'var(--color-border)'
                            }}
                          >
                            "{item.example}"
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  No vocabulary extracted.
                </p>
              )}
            </div>
          )}

          {/* Tab: Phrases */}
          {activeTab === 'phrases' && (
            <div id="tab-content-phrases" className="space-y-3">
              {analysis.phrases && analysis.phrases.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {analysis.phrases.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border space-y-1.5 transition-colors"
                      style={{
                        backgroundColor: 'var(--color-surface-secondary)',
                        borderColor: 'var(--color-border)'
                      }}
                    >
                      <span
                        className="font-semibold text-sm block"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {item.phrase}
                      </span>
                      <p
                        className="text-xs leading-relaxed"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {item.meaning}
                      </p>
                      {item.example && (
                        <p
                          className="text-[11px] italic pt-1 border-t"
                          style={{
                            color: 'var(--color-text-tertiary)',
                            borderColor: 'var(--color-border)'
                          }}
                        >
                          "{item.example}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  No phrases extracted.
                </p>
              )}
            </div>
          )}

          {/* Tab: Comprehension */}
          {activeTab === 'comprehension' && (
            <div id="tab-content-comprehension" className="space-y-3">
              {analysis.comprehensionQuestions && analysis.comprehensionQuestions.length > 0 ? (
                <div className="space-y-2.5">
                  {analysis.comprehensionQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border space-y-1.5 transition-colors"
                      style={{
                        backgroundColor: 'var(--color-surface-secondary)',
                        borderColor: 'var(--color-border)'
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
                        <span
                          className="font-medium text-xs sm:text-sm"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {q.question}
                        </span>
                      </div>
                      <div className="text-xs pl-6 space-y-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                        <p><strong style={{ color: 'var(--color-text-primary)' }}>Answer:</strong> {q.answer}</p>
                        {q.explanation && <p className="text-[11px]">{q.explanation}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  No comprehension questions generated.
                </p>
              )}
            </div>
          )}

          {/* Tab: Speaking */}
          {activeTab === 'speaking' && (
            <div id="tab-content-speaking" className="space-y-3">
              {analysis.speakingPrompts && analysis.speakingPrompts.length > 0 ? (
                <div className="space-y-2.5">
                  {analysis.speakingPrompts.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border flex items-start gap-2.5 transition-colors"
                      style={{
                        backgroundColor: 'var(--color-surface-secondary)',
                        borderColor: 'var(--color-border)'
                      }}
                    >
                      <Mic className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
                      <div className="space-y-1">
                        <span
                          className="font-medium text-xs sm:text-sm block"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {p.prompt}
                        </span>
                        {p.guidance && (
                          <p
                            className="text-[11px] leading-relaxed"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            {p.guidance}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  No speaking prompts generated.
                </p>
              )}
            </div>
          )}

          {/* Tab: Grammar */}
          {activeTab === 'grammar' && (
            <div id="tab-content-grammar" className="space-y-3">
              {analysis.grammarPatterns && analysis.grammarPatterns.length > 0 ? (
                <div className="space-y-2.5">
                  {analysis.grammarPatterns.map((gp, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border space-y-1.5 transition-colors"
                      style={{
                        backgroundColor: 'var(--color-surface-secondary)',
                        borderColor: 'var(--color-border)'
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                        <span
                          className="font-semibold text-xs sm:text-sm"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {gp.pattern}
                        </span>
                      </div>
                      <p
                        className="text-xs leading-relaxed"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {gp.explanation}
                      </p>
                      {gp.example && (
                        <p
                          className="text-[11px] italic pt-1 border-t"
                          style={{
                            color: 'var(--color-text-tertiary)',
                            borderColor: 'var(--color-border)'
                          }}
                        >
                          "{gp.example}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  No grammatical patterns extracted.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
