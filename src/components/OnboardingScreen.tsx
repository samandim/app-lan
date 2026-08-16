import React, { useState, useEffect } from 'react';
import {
  UserProfile,
  EnglishLevel,
  DifficultyPreference,
  LanguageSupportPreference,
  GrammarPreference,
  InterfaceLanguage
} from '../types';
import { LocalRepository } from '../services/store';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Compass,
  Zap,
  HelpCircle,
  X,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OnboardingScreenProps {
  initialProfile?: UserProfile | null;
  onComplete: (profile: UserProfile) => void;
  onCancel?: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  initialProfile,
  onComplete,
  onCancel
}) => {
  const { language, isRTL, t } = useLanguage();
  const isEditing = initialProfile?.onboardingCompleted === true;
  const draft = !isEditing ? LocalRepository.getOnboardingDraft() : null;

  // Step indicator: 1 = Your English, 2 = Make It Personal, 3 = Teaching Style, 4 = Ready
  const [step, setStep] = useState<number>(() => {
    if (isEditing) return 1;
    return draft?.step ?? 1;
  });

  // -------------------------------------------------------------------------
  // STEP 1 STATE: Level, Goals, Challenges (NO FAKE DEFAULTS)
  // -------------------------------------------------------------------------
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(() => {
    if (isEditing) return initialProfile?.level ?? null;
    return draft?.level ?? null;
  });
  const [showPlacementModal, setShowPlacementModal] = useState<boolean>(false);

  const [selectedGoals, setSelectedGoals] = useState<string[]>(() => {
    if (isEditing) return initialProfile?.goals ?? [];
    return draft?.goals ?? [];
  });

  const [selectedChallenges, setSelectedChallenges] = useState<string[]>(() => {
    if (isEditing) return initialProfile?.challenges ?? [];
    return draft?.challenges ?? [];
  });
  const [challengeLimitReached, setChallengeLimitReached] = useState<boolean>(false);

  // -------------------------------------------------------------------------
  // STEP 2 STATE: Interests, Skills, Content Preferences (NO FAKE DEFAULTS)
  // -------------------------------------------------------------------------
  const [selectedInterests, setSelectedInterests] = useState<string[]>(() => {
    if (isEditing) return initialProfile?.interests ?? [];
    return draft?.interests ?? [];
  });
  const [customInterests, setCustomInterests] = useState<string[]>(() => {
    if (isEditing) return initialProfile?.customInterests ?? [];
    return draft?.customInterests ?? [];
  });
  const [customInput, setCustomInput] = useState<string>('');
  const [customInputError, setCustomInputError] = useState<string | null>(null);
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);

  const [selectedSkills, setSelectedSkills] = useState<string[]>(() => {
    if (isEditing) return initialProfile?.skillPriorities ?? [];
    return draft?.skillPriorities ?? [];
  });

  const [selectedContent, setSelectedContent] = useState<string[]>(() => {
    if (isEditing) return initialProfile?.contentPreferences ?? [];
    return draft?.contentPreferences ?? [];
  });

  // -------------------------------------------------------------------------
  // STEP 3 STATE: Difficulty, Language Support, Grammar (NO FAKE DEFAULTS)
  // -------------------------------------------------------------------------
  const [difficulty, setDifficulty] = useState<DifficultyPreference | null>(() => {
    if (isEditing) return initialProfile?.difficultyPreference ?? null;
    return draft?.difficultyPreference ?? null;
  });

  const [languageSupport, setLanguageSupport] = useState<LanguageSupportPreference | null>(() => {
    if (isEditing) return initialProfile?.languageSupportPreference ?? null;
    return draft?.languageSupportPreference ?? null;
  });

  const [grammarPreference, setGrammarPreference] = useState<GrammarPreference | null>(() => {
    if (isEditing) return initialProfile?.grammarPreference ?? null;
    return draft?.grammarPreference ?? null;
  });

  // Persist draft whenever answers change (so refresh doesn't lose progress)
  useEffect(() => {
    if (!isEditing) {
      LocalRepository.saveOnboardingDraft({
        step,
        level: (selectedLevelId as EnglishLevel | 'unknown' | null) || null,
        goals: selectedGoals,
        challenges: selectedChallenges,
        interests: selectedInterests,
        customInterests,
        skillPriorities: selectedSkills,
        contentPreferences: selectedContent,
        difficultyPreference: difficulty,
        languageSupportPreference: languageSupport,
        grammarPreference
      });
    }
  }, [
    isEditing,
    step,
    selectedLevelId,
    selectedGoals,
    selectedChallenges,
    selectedInterests,
    customInterests,
    selectedSkills,
    selectedContent,
    difficulty,
    languageSupport,
    grammarPreference
  ]);

  // -------------------------------------------------------------------------
  // DATA DEFINITIONS (Structured IDs mapped to translation keys)
  // -------------------------------------------------------------------------

  const LEVELS = [
    { id: 'A1', key: 'beginner', badge: 'A1' },
    { id: 'A2', key: 'elementary', badge: 'A2' },
    { id: 'B1', key: 'intermediate', badge: 'B1' },
    { id: 'B2', key: 'upper_intermediate', badge: 'B2' },
    { id: 'C1', key: 'advanced', badge: 'C1' },
    { id: 'unknown', key: 'unknown', badge: '?' }
  ];

  const GOAL_IDS = [
    'work',
    'study',
    'travel',
    'communication',
    'living_abroad',
    'content',
    'reading',
    'exams',
    'personal_growth',
    'other'
  ];

  const CHALLENGE_IDS = [
    'speaking_struggle',
    'unnatural_words',
    'reading_better_than_speaking',
    'native_comprehension',
    'sound_natural',
    'career_need',
    'vocabulary_struggle',
    'grammar_struggle',
    'not_sure_yet'
  ];

  const INTEREST_IDS = [
    'technology',
    'ai',
    'programming',
    'business',
    'finance',
    'gaming',
    'movies_tv',
    'music',
    'sports',
    'fitness',
    'science',
    'psychology',
    'history',
    'travel',
    'books',
    'news',
    'cars',
    'food',
    'fashion'
  ];

  const SKILL_IDS = [
    'listening',
    'speaking',
    'vocabulary',
    'reading',
    'writing',
    'grammar'
  ];

  const CONTENT_IDS = [
    'youtube',
    'movies_tv',
    'podcasts',
    'books',
    'articles',
    'conversations',
    'news',
    'social_media',
    'academic'
  ];

  const DIFFICULTY_OPTIONS: DifficultyPreference[] = [
    'easy',
    'balanced',
    'challenging'
  ];

  const LANGUAGE_SUPPORT_OPTIONS: LanguageSupportPreference[] = [
    'mostly_english',
    'occasional_translation',
    'native_language_explanations',
    'translate_when_stuck'
  ];

  const GRAMMAR_OPTIONS: GrammarPreference[] = [
    'implicit',
    'repeated_mistakes',
    'on_demand',
    'regular'
  ];

  const MAX_CHALLENGES = 3;

  // -------------------------------------------------------------------------
  // TOGGLE HANDLERS (With deselection & limit safety)
  // -------------------------------------------------------------------------

  const toggleGoal = (id: string) => {
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const toggleChallenge = (id: string) => {
    setSelectedChallenges((prev) => {
      if (prev.includes(id)) {
        setChallengeLimitReached(false);
        return prev.filter((c) => c !== id);
      }
      if (prev.length >= MAX_CHALLENGES) {
        setChallengeLimitReached(true);
        return prev;
      }
      setChallengeLimitReached(false);
      return [...prev, id];
    });
  };

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleAddCustomInterest = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customInput.trim();
    if (!trimmed) {
      setCustomInputError(t('onboarding.validation.customInterestEmpty'));
      return;
    }
    const isDuplicate =
      customInterests.some((ci) => ci.toLowerCase() === trimmed.toLowerCase()) ||
      INTEREST_IDS.some(
        (id) =>
          id.toLowerCase() === trimmed.toLowerCase() ||
          t(`onboarding.step2.interests.${id}`).toLowerCase() === trimmed.toLowerCase()
      );

    if (isDuplicate) {
      setCustomInputError(t('onboarding.validation.customInterestDuplicate'));
      return;
    }

    setCustomInterests((prev) => [...prev, trimmed]);
    setCustomInput('');
    setCustomInputError(null);
    setShowCustomInput(false);
  };

  const removeCustomInterest = (item: string) => {
    setCustomInterests((prev) => prev.filter((i) => i !== item));
  };

  const toggleSkill = (id: string) => {
    setSelectedSkills((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const toggleContent = (id: string) => {
    setSelectedContent((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  // -------------------------------------------------------------------------
  // VALIDATION & NAVIGATION (Lightweight required fields)
  // -------------------------------------------------------------------------

  const isStep1Valid = selectedLevelId !== null && selectedGoals.length > 0;
  const isStep2Valid = true; // Step 2 is fully optional
  const isStep3Valid = true; // Step 3 is fully optional

  const getStep1ValidationMessage = () => {
    if (!selectedLevelId && selectedGoals.length === 0) {
      return t('onboarding.validation.bothRequired');
    }
    if (!selectedLevelId) {
      return t('onboarding.validation.levelRequired');
    }
    if (selectedGoals.length === 0) {
      return t('onboarding.validation.goalRequired');
    }
    return null;
  };

  const handleNext = () => {
    if (step === 1 && isStep1Valid) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (step === 2 && isStep2Valid) {
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (step === 3 && isStep3Valid) {
      setStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (onCancel) {
      onCancel();
    }
  };

  const handleFinish = () => {
    const level: EnglishLevel | 'unknown' =
      selectedLevelId === 'unknown' || !selectedLevelId ? 'unknown' : (selectedLevelId as EnglishLevel);

    const fallbackDifficulty: DifficultyPreference = difficulty ?? 'balanced';
    const fallbackSupport: LanguageSupportPreference =
      languageSupport ?? (language === 'fa' ? 'occasional_translation' : 'mostly_english');
    const fallbackGrammar: GrammarPreference = grammarPreference ?? 'implicit';

    const saved = LocalRepository.saveUserProfile({
      interfaceLanguage: (language as InterfaceLanguage) || 'en',
      learningLanguage: 'en',
      supportLanguage: language === 'fa' ? 'fa' : 'en',
      level,
      levelSource: selectedLevelId === 'unknown' ? 'placement_test' : 'self_assessed',
      goals: selectedGoals,
      challenges: selectedChallenges,
      interests: selectedInterests,
      customInterests,
      skillPriorities: selectedSkills,
      contentPreferences: selectedContent,
      difficultyPreference: fallbackDifficulty,
      languageSupportPreference: fallbackSupport,
      grammarPreference: fallbackGrammar,
      onboardingCompleted: true
    });

    LocalRepository.clearOnboardingDraft();
    onComplete(saved);
  };

  return (
    <div
      id="onboarding-flow"
      className="max-w-2xl mx-auto w-full py-4 sm:py-8 px-4 transition-colors"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Step Progress Tracker */}
      {step < 4 && (
        <div className="mb-8 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
            <span style={{ color: 'var(--color-accent)' }}>
              {t('common.step')} {step} {t('common.of')} 3
            </span>
            <span style={{ color: 'var(--color-text-tertiary)' }}>
              {step === 1 && t('onboarding.steps.step1')}
              {step === 2 && t('onboarding.steps.step2')}
              {step === 3 && t('onboarding.steps.step3')}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  backgroundColor:
                    s <= step ? 'var(--color-accent)' : 'var(--color-border)'
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: Your English (Level, Goals, Challenges)                            */}
      {/* ========================================================================= */}
      {step === 1 && (
        <motion.div
          key="step1"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="space-y-2">
            <h1
              className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {t('onboarding.step1.title')}
            </h1>
            <p
              className="text-xs sm:text-sm leading-relaxed"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('onboarding.step1.subtitle')}
            </p>
          </div>

          {/* Section 1: English Level (Single Select) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                className="text-xs font-semibold uppercase tracking-wider flex items-center space-x-1.5 rtl:space-x-reverse"
                style={{ color: 'var(--color-text-primary)' }}
              >
                <span>{t('onboarding.step1.levelQuestion')}</span>
                <span className="text-red-500 font-bold">*</span>
              </label>
              <span
                className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: 'var(--color-surface-secondary)',
                  color: 'var(--color-text-tertiary)'
                }}
              >
                {t('common.required')}
              </span>
            </div>

            <div
              role="radiogroup"
              aria-label={t('onboarding.step1.levelQuestion')}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
            >
              {LEVELS.map((lvl) => {
                const isSelected = selectedLevelId === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    id={`level-option-${lvl.id}`}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelectedLevelId(lvl.id)}
                    className="p-3.5 rounded-2xl border text-left rtl:text-right transition-all flex items-start justify-between group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    style={{
                      backgroundColor: isSelected
                        ? 'var(--color-accent-subtle)'
                        : 'var(--color-surface)',
                      borderColor: isSelected
                        ? 'var(--color-accent)'
                        : 'var(--color-border)'
                    }}
                  >
                    <div className="space-y-1 pr-2 rtl:pr-0 rtl:pl-2">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <span
                          className="font-mono text-xs font-bold px-1.5 py-0.5 rounded border"
                          style={{
                            backgroundColor: isSelected
                              ? 'var(--color-accent)'
                              : 'var(--color-surface-secondary)',
                            color: isSelected
                              ? '#ffffff'
                              : 'var(--color-text-secondary)',
                            borderColor: isSelected
                              ? 'var(--color-accent)'
                              : 'var(--color-border)'
                          }}
                        >
                          {lvl.badge}
                        </span>
                        <span
                          className="font-semibold text-xs sm:text-sm"
                          style={{
                            color: isSelected
                              ? 'var(--color-accent)'
                              : 'var(--color-text-primary)'
                          }}
                        >
                          {t(`onboarding.step1.levels.${lvl.key}.label`)}
                        </span>
                      </div>
                      <p
                        className="text-[11px] leading-relaxed"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {t(`onboarding.step1.levels.${lvl.key}.description`)}
                      </p>
                    </div>

                    <div
                      className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors"
                      style={{
                        backgroundColor: isSelected
                          ? 'var(--color-accent)'
                          : 'transparent',
                        borderColor: isSelected
                          ? 'var(--color-accent)'
                          : 'var(--color-border)'
                      }}
                    >
                      {isSelected && (
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Placement Check Prompt */}
            <div
              className="p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
              style={{
                backgroundColor: 'var(--color-surface-secondary)',
                borderColor: 'var(--color-border)'
              }}
            >
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Compass
                  className="w-4 h-4 shrink-0"
                  style={{ color: 'var(--color-accent)' }}
                />
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  {t('onboarding.step1.placementCheck.title')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedLevelId('unknown');
                  setShowPlacementModal(true);
                }}
                className="text-xs font-semibold underline text-left rtl:text-right shrink-0 cursor-pointer"
                style={{ color: 'var(--color-accent)' }}
              >
                {t('onboarding.step1.placementCheck.button')}
              </button>
            </div>
          </section>

          {/* Section 2: Goals (Multi-Select, Required) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                className="text-xs font-semibold uppercase tracking-wider flex items-center space-x-1.5 rtl:space-x-reverse"
                style={{ color: 'var(--color-text-primary)' }}
              >
                <span>{t('onboarding.step1.goalsQuestion')}</span>
                <span className="text-red-500 font-bold">*</span>
              </label>
              <span
                className="text-[11px] font-medium"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {selectedGoals.length > 0
                  ? `${selectedGoals.length} ${t('common.selected')}`
                  : t('common.selectMultiple')}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {GOAL_IDS.map((gId) => {
                const isSelected = selectedGoals.includes(gId);
                return (
                  <button
                    key={gId}
                    id={`goal-chip-${gId}`}
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    onClick={() => toggleGoal(gId)}
                    className="px-3.5 py-2 rounded-xl border text-xs font-medium transition-all flex items-center space-x-1.5 rtl:space-x-reverse cursor-pointer focus:outline-none focus-visible:ring-2"
                    style={{
                      backgroundColor: isSelected
                        ? 'var(--color-accent-subtle)'
                        : 'var(--color-surface)',
                      borderColor: isSelected
                        ? 'var(--color-accent)'
                        : 'var(--color-border)',
                      color: isSelected
                        ? 'var(--color-accent)'
                        : 'var(--color-text-primary)',
                      fontWeight: isSelected ? 600 : 500
                    }}
                  >
                    <div
                      className="w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors"
                      style={{
                        backgroundColor: isSelected
                          ? 'var(--color-accent)'
                          : 'transparent',
                        borderColor: isSelected
                          ? 'var(--color-accent)'
                          : 'var(--color-border)'
                      }}
                    >
                      {isSelected && (
                        <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                      )}
                    </div>
                    <span>{t(`onboarding.step1.goals.${gId}`)}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Section 3: Challenges (Multi-Select, Optional 1-3) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {t('onboarding.step1.challengesQuestion')}
              </label>
              <span
                className="text-[11px] font-medium"
                style={{
                  color:
                    selectedChallenges.length >= MAX_CHALLENGES
                      ? 'var(--color-accent)'
                      : 'var(--color-text-tertiary)'
                }}
              >
                {selectedChallenges.length > 0
                  ? `${selectedChallenges.length}/${MAX_CHALLENGES} ${t('common.selected')}`
                  : t('common.chooseUpToThree')}
              </span>
            </div>

            {challengeLimitReached && (
              <p
                className="text-[11px] font-medium flex items-center space-x-1 rtl:space-x-reverse"
                style={{ color: 'var(--color-accent)' }}
              >
                <AlertCircle className="w-3 h-3" />
                <span>{t('onboarding.validation.maxChallengesReached')}</span>
              </p>
            )}

            <div className="space-y-2">
              {CHALLENGE_IDS.map((cId) => {
                const isSelected = selectedChallenges.includes(cId);
                return (
                  <button
                    key={cId}
                    id={`challenge-option-${cId}`}
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    onClick={() => toggleChallenge(cId)}
                    className="w-full p-3 rounded-xl border text-left rtl:text-right transition-all flex items-center justify-between text-xs cursor-pointer focus:outline-none focus-visible:ring-2"
                    style={{
                      backgroundColor: isSelected
                        ? 'var(--color-accent-subtle)'
                        : 'var(--color-surface)',
                      borderColor: isSelected
                        ? 'var(--color-accent)'
                        : 'var(--color-border)',
                      color: isSelected
                        ? 'var(--color-text-primary)'
                        : 'var(--color-text-secondary)'
                    }}
                  >
                    <span className={isSelected ? 'font-medium' : ''}>
                      {t(`onboarding.step1.challenges.${cId}`)}
                    </span>
                    <div
                      className="w-4 h-4 rounded border flex items-center justify-center shrink-0 ml-2 rtl:ml-0 rtl:mr-2 transition-colors"
                      style={{
                        backgroundColor: isSelected
                          ? 'var(--color-accent)'
                          : 'transparent',
                        borderColor: isSelected
                          ? 'var(--color-accent)'
                          : 'var(--color-border)'
                      }}
                    >
                      {isSelected && (
                        <Check className="w-3 h-3 text-white stroke-[3]" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Placement modal fallback message */}
          {showPlacementModal && (
            <div
              className="p-4 rounded-2xl border space-y-2 text-xs"
              style={{
                backgroundColor: 'var(--color-accent-subtle)',
                borderColor: 'var(--color-accent)',
                color: 'var(--color-text-primary)'
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {t('onboarding.step1.placementCheck.title')}
                </span>
                <button
                  type="button"
                  onClick={() => setShowPlacementModal(false)}
                  className="p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                {t('onboarding.step1.placementCheck.explanation')}
              </p>
            </div>
          )}

          {/* Actions & Validation Hint */}
          <div className="pt-4 border-t space-y-2" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between">
              {onCancel ? (
                <button
                  id="onboarding-cancel-btn"
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2.5 rounded-xl border text-xs font-medium cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  {t('common.cancel')}
                </button>
              ) : (
                <div />
              )}

              <button
                id="onboarding-step1-next-btn"
                type="button"
                onClick={handleNext}
                disabled={!isStep1Valid}
                className="px-6 py-3 text-white text-xs sm:text-sm font-medium rounded-xl shadow-xs transition-all flex items-center space-x-2 rtl:space-x-reverse disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                <span>{t('common.continue')}</span>
                {isRTL ? (
                  <ArrowLeft className="w-4 h-4 mr-1" />
                ) : (
                  <ArrowRight className="w-4 h-4 ml-1" />
                )}
              </button>
            </div>

            {!isStep1Valid && (
              <p
                className="text-[11px] text-right rtl:text-left font-medium"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {getStep1ValidationMessage()}
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: Make It Personal (Interests, Skills, Content Preferences)         */}
      {/* ========================================================================= */}
      {step === 2 && (
        <motion.div
          key="step2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="space-y-2">
            <h1
              className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {t('onboarding.step2.title')}
            </h1>
            <p
              className="text-xs sm:text-sm leading-relaxed"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('onboarding.step2.subtitle')}
            </p>
          </div>

          {/* Section 1: Topics & Interests */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {t('onboarding.step2.interestsQuestion')}
              </label>
              <span
                className="text-[11px] font-medium"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {selectedInterests.length + customInterests.length > 0
                  ? `${selectedInterests.length + customInterests.length} ${t('common.selected')}`
                  : t('common.optional')}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {INTEREST_IDS.map((iId) => {
                const isSelected = selectedInterests.includes(iId);
                return (
                  <button
                    key={iId}
                    id={`interest-chip-${iId}`}
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    onClick={() => toggleInterest(iId)}
                    className="px-3 py-1.5 rounded-xl border text-xs font-medium transition-all flex items-center space-x-1.5 rtl:space-x-reverse cursor-pointer focus:outline-none focus-visible:ring-2"
                    style={{
                      backgroundColor: isSelected
                        ? 'var(--color-accent-subtle)'
                        : 'var(--color-surface)',
                      borderColor: isSelected
                        ? 'var(--color-accent)'
                        : 'var(--color-border)',
                      color: isSelected
                        ? 'var(--color-accent)'
                        : 'var(--color-text-primary)',
                      fontWeight: isSelected ? 600 : 500
                    }}
                  >
                    {isSelected && (
                      <Check className="w-3 h-3 text-current stroke-[3]" />
                    )}
                    <span>{t(`onboarding.step2.interests.${iId}`)}</span>
                  </button>
                );
              })}

              {/* Render User Custom Interests */}
              {customInterests.map((ci) => (
                <span
                  key={ci}
                  className="px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all inline-flex items-center space-x-1.5 rtl:space-x-reverse"
                  style={{
                    backgroundColor: 'var(--color-accent-subtle)',
                    borderColor: 'var(--color-accent)',
                    color: 'var(--color-accent)'
                  }}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>{ci}</span>
                  <button
                    type="button"
                    onClick={() => removeCustomInterest(ci)}
                    className="p-0.5 hover:opacity-75 cursor-pointer ml-1 rtl:ml-0 rtl:mr-1"
                    aria-label={`Remove ${ci}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Add Custom Interest Trigger */}
              {!showCustomInput ? (
                <button
                  type="button"
                  onClick={() => setShowCustomInput(true)}
                  className="px-3 py-1.5 rounded-xl border border-dashed text-xs font-medium transition-colors flex items-center space-x-1 rtl:space-x-reverse cursor-pointer"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-accent)',
                    backgroundColor: 'var(--color-surface)'
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('onboarding.step2.addCustomInterest')}</span>
                </button>
              ) : (
                <form
                  onSubmit={handleAddCustomInterest}
                  className="flex items-center space-x-1.5 rtl:space-x-reverse"
                >
                  <input
                    type="text"
                    value={customInput}
                    onChange={(e) => {
                      setCustomInput(e.target.value);
                      setCustomInputError(null);
                    }}
                    maxLength={40}
                    placeholder={t('onboarding.step2.customInterestPlaceholder')}
                    className="px-3 py-1.5 text-xs rounded-xl border focus:outline-none transition-colors"
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: customInputError
                        ? 'var(--color-error)'
                        : 'var(--color-accent)',
                      color: 'var(--color-text-primary)'
                    }}
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-white text-xs font-medium rounded-xl shadow-xs cursor-pointer"
                    style={{ backgroundColor: 'var(--color-accent)' }}
                  >
                    {t('onboarding.step2.addBtn')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomInput(false);
                      setCustomInput('');
                      setCustomInputError(null);
                    }}
                    className="p-1.5 rounded-lg border text-xs cursor-pointer"
                    style={{
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-secondary)'
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>

            {customInputError && (
              <p
                className="text-[11px] font-medium flex items-center space-x-1 rtl:space-x-reverse"
                style={{ color: 'var(--color-error)' }}
              >
                <AlertCircle className="w-3 h-3" />
                <span>{customInputError}</span>
              </p>
            )}
          </section>

          {/* Section 2: Skill Focus Priorities */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {t('onboarding.step2.skillsQuestion')}
              </label>
              <span
                className="text-[11px] font-medium"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {selectedSkills.length > 0
                  ? `${selectedSkills.length} ${t('common.selected')}`
                  : t('common.optional')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SKILL_IDS.map((sId) => {
                const isSelected = selectedSkills.includes(sId);
                return (
                  <button
                    key={sId}
                    id={`skill-option-${sId}`}
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    onClick={() => toggleSkill(sId)}
                    className="p-3.5 rounded-2xl border text-left rtl:text-right transition-all flex items-start justify-between cursor-pointer focus:outline-none focus-visible:ring-2"
                    style={{
                      backgroundColor: isSelected
                        ? 'var(--color-accent-subtle)'
                        : 'var(--color-surface)',
                      borderColor: isSelected
                        ? 'var(--color-accent)'
                        : 'var(--color-border)'
                    }}
                  >
                    <div className="space-y-0.5 pr-2 rtl:pr-0 rtl:pl-2">
                      <span
                        className="font-semibold text-xs sm:text-sm block"
                        style={{
                          color: isSelected
                            ? 'var(--color-accent)'
                            : 'var(--color-text-primary)'
                        }}
                      >
                        {t(`onboarding.step2.skills.${sId}.label`)}
                      </span>
                      <p
                        className="text-[11px] leading-relaxed"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {t(`onboarding.step2.skills.${sId}.description`)}
                      </p>
                    </div>

                    <div
                      className="w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors"
                      style={{
                        backgroundColor: isSelected
                          ? 'var(--color-accent)'
                          : 'transparent',
                        borderColor: isSelected
                          ? 'var(--color-accent)'
                          : 'var(--color-border)'
                      }}
                    >
                      {isSelected && (
                        <Check className="w-3 h-3 text-white stroke-[3]" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Section 3: Content Preferences */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {t('onboarding.step2.contentQuestion')}
              </label>
              <span
                className="text-[11px] font-medium"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {t('common.optional')}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {CONTENT_IDS.map((cId) => {
                const isSelected = selectedContent.includes(cId);
                return (
                  <button
                    key={cId}
                    id={`content-chip-${cId}`}
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    onClick={() => toggleContent(cId)}
                    className="px-3 py-1.5 rounded-xl border text-xs font-medium transition-all flex items-center space-x-1.5 rtl:space-x-reverse cursor-pointer focus:outline-none focus-visible:ring-2"
                    style={{
                      backgroundColor: isSelected
                        ? 'var(--color-accent-subtle)'
                        : 'var(--color-surface)',
                      borderColor: isSelected
                        ? 'var(--color-accent)'
                        : 'var(--color-border)',
                      color: isSelected
                        ? 'var(--color-accent)'
                        : 'var(--color-text-primary)',
                      fontWeight: isSelected ? 600 : 500
                    }}
                  >
                    <div
                      className="w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors"
                      style={{
                        backgroundColor: isSelected
                          ? 'var(--color-accent)'
                          : 'transparent',
                        borderColor: isSelected
                          ? 'var(--color-accent)'
                          : 'var(--color-border)'
                      }}
                    >
                      {isSelected && (
                        <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                      )}
                    </div>
                    <span>{t(`onboarding.step2.content.${cId}`)}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Navigation Controls */}
          <div
            className="pt-4 border-t flex items-center justify-between"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <button
              id="onboarding-step2-back-btn"
              type="button"
              onClick={handleBack}
              className="px-4 py-2.5 rounded-xl border text-xs font-medium flex items-center space-x-1.5 rtl:space-x-reverse cursor-pointer"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)'
              }}
            >
              {isRTL ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
              <span>{t('common.back')}</span>
            </button>

            <button
              id="onboarding-step2-next-btn"
              type="button"
              onClick={handleNext}
              disabled={!isStep2Valid}
              className="px-6 py-3 text-white text-xs sm:text-sm font-medium rounded-xl shadow-xs transition-all flex items-center space-x-2 rtl:space-x-reverse disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              <span>{t('common.continue')}</span>
              {isRTL ? <ArrowLeft className="w-4 h-4 mr-1" /> : <ArrowRight className="w-4 h-4 ml-1" />}
            </button>
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: Teaching Style & Support                                          */}
      {/* ========================================================================= */}
      {step === 3 && (
        <motion.div
          key="step3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="space-y-2">
            <h1
              className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {t('onboarding.step3.title')}
            </h1>
            <p
              className="text-xs sm:text-sm leading-relaxed"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('onboarding.step3.subtitle')}
            </p>
          </div>

          {/* Section 1: Difficulty Mode (Single Select) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {t('onboarding.step3.difficultyQuestion')}
              </label>
              <span
                className="text-[11px] font-medium"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {t('common.optional')}
              </span>
            </div>

            <div
              role="radiogroup"
              aria-label={t('onboarding.step3.difficultyQuestion')}
              className="space-y-2.5"
            >
              {DIFFICULTY_OPTIONS.map((opt) => {
                const isSelected = difficulty === opt;
                return (
                  <button
                    key={opt}
                    id={`difficulty-option-${opt}`}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setDifficulty(opt)}
                    className="w-full p-3.5 rounded-2xl border text-left rtl:text-right transition-all flex items-start justify-between cursor-pointer focus:outline-none focus-visible:ring-2"
                    style={{
                      backgroundColor: isSelected
                        ? 'var(--color-accent-subtle)'
                        : 'var(--color-surface)',
                      borderColor: isSelected
                        ? 'var(--color-accent)'
                        : 'var(--color-border)'
                    }}
                  >
                    <div className="space-y-0.5 pr-2 rtl:pr-0 rtl:pl-2">
                      <span
                        className="font-semibold text-xs sm:text-sm block"
                        style={{
                          color: isSelected
                            ? 'var(--color-accent)'
                            : 'var(--color-text-primary)'
                        }}
                      >
                        {t(`onboarding.step3.difficulty.${opt}.title`)}
                      </span>
                      <p
                        className="text-[11px] leading-relaxed"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {t(`onboarding.step3.difficulty.${opt}.subtitle`)}
                      </p>
                    </div>

                    <div
                      className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors"
                      style={{
                        backgroundColor: isSelected
                          ? 'var(--color-accent)'
                          : 'transparent',
                        borderColor: isSelected
                          ? 'var(--color-accent)'
                          : 'var(--color-border)'
                      }}
                    >
                      {isSelected && (
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Section 2: Native Language Support Mode (Single Select) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {t('onboarding.step3.languageSupportQuestion')}
              </label>
              <span
                className="text-[11px] font-medium"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {t('common.optional')}
              </span>
            </div>

            <div
              role="radiogroup"
              aria-label={t('onboarding.step3.languageSupportQuestion')}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
            >
              {LANGUAGE_SUPPORT_OPTIONS.map((sup) => {
                const isSelected = languageSupport === sup;
                return (
                  <button
                    key={sup}
                    id={`support-option-${sup}`}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setLanguageSupport(sup)}
                    className="p-3 rounded-xl border text-left rtl:text-right transition-all flex items-center justify-between text-xs cursor-pointer focus:outline-none focus-visible:ring-2"
                    style={{
                      backgroundColor: isSelected
                        ? 'var(--color-accent-subtle)'
                        : 'var(--color-surface)',
                      borderColor: isSelected
                        ? 'var(--color-accent)'
                        : 'var(--color-border)',
                      color: isSelected
                        ? 'var(--color-accent)'
                        : 'var(--color-text-primary)',
                      fontWeight: isSelected ? 600 : 500
                    }}
                  >
                    <span>{t(`onboarding.step3.languageSupport.${sup}`)}</span>
                    <div
                      className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-2 rtl:ml-0 rtl:mr-2 transition-colors"
                      style={{
                        backgroundColor: isSelected
                          ? 'var(--color-accent)'
                          : 'transparent',
                        borderColor: isSelected
                          ? 'var(--color-accent)'
                          : 'var(--color-border)'
                      }}
                    >
                      {isSelected && (
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Section 3: Grammar Handling Preference (Single Select) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {t('onboarding.step3.grammarQuestion')}
              </label>
              <span
                className="text-[11px] font-medium"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {t('common.optional')}
              </span>
            </div>

            <div
              role="radiogroup"
              aria-label={t('onboarding.step3.grammarQuestion')}
              className="space-y-2.5"
            >
              {GRAMMAR_OPTIONS.map((gOpt) => {
                const isSelected = grammarPreference === gOpt;
                return (
                  <button
                    key={gOpt}
                    id={`grammar-option-${gOpt}`}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setGrammarPreference(gOpt)}
                    className="w-full p-3.5 rounded-2xl border text-left rtl:text-right transition-all flex items-start justify-between cursor-pointer focus:outline-none focus-visible:ring-2"
                    style={{
                      backgroundColor: isSelected
                        ? 'var(--color-accent-subtle)'
                        : 'var(--color-surface)',
                      borderColor: isSelected
                        ? 'var(--color-accent)'
                        : 'var(--color-border)'
                    }}
                  >
                    <div className="space-y-0.5 pr-2 rtl:pr-0 rtl:pl-2">
                      <span
                        className="font-semibold text-xs sm:text-sm block"
                        style={{
                          color: isSelected
                            ? 'var(--color-accent)'
                            : 'var(--color-text-primary)'
                        }}
                      >
                        {t(`onboarding.step3.grammar.${gOpt}.title`)}
                      </span>
                      <p
                        className="text-[11px] leading-relaxed"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {t(`onboarding.step3.grammar.${gOpt}.description`)}
                      </p>
                    </div>

                    <div
                      className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors"
                      style={{
                        backgroundColor: isSelected
                          ? 'var(--color-accent)'
                          : 'transparent',
                        borderColor: isSelected
                          ? 'var(--color-accent)'
                          : 'var(--color-border)'
                      }}
                    >
                      {isSelected && (
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Navigation Controls */}
          <div
            className="pt-4 border-t flex items-center justify-between"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <button
              id="onboarding-step3-back-btn"
              type="button"
              onClick={handleBack}
              className="px-4 py-2.5 rounded-xl border text-xs font-medium flex items-center space-x-1.5 rtl:space-x-reverse cursor-pointer"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)'
              }}
            >
              {isRTL ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
              <span>{t('common.back')}</span>
            </button>

            <button
              id="onboarding-step3-next-btn"
              type="button"
              onClick={handleNext}
              className="px-6 py-3 text-white text-xs sm:text-sm font-medium rounded-xl shadow-xs transition-all flex items-center space-x-2 rtl:space-x-reverse cursor-pointer"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              <span>{t('common.continue')}</span>
              {isRTL ? <ArrowLeft className="w-4 h-4 mr-1" /> : <ArrowRight className="w-4 h-4 ml-1" />}
            </button>
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: Ready Confirmation & Profile Summary                              */}
      {/* ========================================================================= */}
      {step === 4 && (
        <motion.div
          key="step4"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-8 text-center"
        >
          {/* Badge & Title */}
          <div className="space-y-4 max-w-lg mx-auto">
            <div
              className="w-14 h-14 rounded-3xl mx-auto flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              <Sparkles className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h1
                className="text-3xl sm:text-4xl font-semibold tracking-tight"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {t('onboarding.final.title')}
              </h1>
              <p
                className="text-sm sm:text-base font-medium"
                style={{ color: 'var(--color-accent)' }}
              >
                {t('onboarding.final.lead')}
              </p>
              <p
                className="text-xs sm:text-sm leading-relaxed"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {t('onboarding.final.description')}
              </p>
            </div>
          </div>

          {/* Profile Overview Card (Visualizing Actual Choices) */}
          <div
            id="onboarding-summary-card"
            className="p-5 rounded-2xl border text-left rtl:text-right space-y-3.5 text-xs max-w-lg mx-auto"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: 'var(--color-border)' }}>
              <span className="font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-primary)' }}>
                {t('onboarding.final.profileSummary')}
              </span>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-[11px] font-semibold underline cursor-pointer"
                style={{ color: 'var(--color-accent)' }}
              >
                {t('onboarding.final.adjustPreferences')}
              </button>
            </div>

            {/* Level */}
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--color-text-secondary)' }}>
                {t('onboarding.final.levelLabel')}:
              </span>
              <span
                className="font-semibold font-mono px-2 py-0.5 rounded border text-[11px]"
                style={{
                  backgroundColor: 'var(--color-accent-subtle)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-accent)'
                }}
              >
                {selectedLevelId === 'unknown' || !selectedLevelId
                  ? t('onboarding.step1.levels.unknown.label')
                  : selectedLevelId.toUpperCase()}
              </span>
            </div>

            {/* Goals */}
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--color-text-secondary)' }}>
                {t('onboarding.final.goalsLabel')}:
              </span>
              <span className="font-medium text-right rtl:text-left line-clamp-1 max-w-[220px]" style={{ color: 'var(--color-text-primary)' }}>
                {selectedGoals.length > 0
                  ? selectedGoals.map((g) => t(`onboarding.step1.goals.${g}`)).join(', ')
                  : t('onboarding.notSpecified')}
              </span>
            </div>

            {/* Skills */}
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--color-text-secondary)' }}>
                {t('onboarding.final.skillsLabel')}:
              </span>
              <span className="font-medium text-right rtl:text-left line-clamp-1 max-w-[220px]" style={{ color: 'var(--color-text-primary)' }}>
                {selectedSkills.length > 0
                  ? selectedSkills
                      .map((s) => t(`onboarding.step2.skills.${s}.label`))
                      .join(', ')
                  : t('onboarding.notSpecified')}
              </span>
            </div>

            {/* Difficulty */}
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--color-text-secondary)' }}>
                {t('onboarding.final.difficultyLabel')}:
              </span>
              <span className="font-medium capitalize" style={{ color: 'var(--color-text-primary)' }}>
                {difficulty
                  ? t(`onboarding.step3.difficulty.${difficulty}.title`).split('—')[0].trim()
                  : t('onboarding.notSpecified')}
              </span>
            </div>

            {/* Active Interests */}
            {(selectedInterests.length > 0 || customInterests.length > 0) && (
              <div>
                <span className="block mb-1.5 text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                  {t('onboarding.final.interestsLabel')}:
                </span>
                <div className="flex flex-wrap gap-1">
                  {selectedInterests.map((interest) => (
                    <span
                      key={interest}
                      className="px-2 py-0.5 rounded-md border text-[10px]"
                      style={{
                        backgroundColor: 'var(--color-surface-secondary)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-secondary)'
                      }}
                    >
                      {t(`onboarding.step2.interests.${interest}`)}
                    </span>
                  ))}
                  {customInterests.map((ci) => (
                    <span
                      key={ci}
                      className="px-2 py-0.5 rounded-md border text-[10px]"
                      style={{
                        backgroundColor: 'var(--color-surface-secondary)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-secondary)'
                      }}
                    >
                      {ci}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Complete CTA */}
          <div className="pt-2 max-w-lg mx-auto">
            <button
              id="onboarding-complete-btn"
              type="button"
              onClick={handleFinish}
              className="w-full py-4 px-8 text-white font-semibold rounded-2xl shadow-sm hover:shadow transition-all inline-flex items-center justify-center space-x-2.5 rtl:space-x-reverse text-base cursor-pointer"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              <span>{t('onboarding.final.startLearningBtn')}</span>
              {isRTL ? <ArrowLeft className="w-5 h-5 mr-1" /> : <ArrowRight className="w-5 h-5 ml-1" />}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
