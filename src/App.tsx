import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Source,
  SessionConfig,
  SessionState,
  SessionSummary,
  UserProfile,
  InterfaceLanguage,
  Learner,
  ActiveSessionRecord,
  NextLearningDecision
} from './types';
import { LocalRepository } from './services/store';
import { SessionEngine } from './services/sessionEngine';
import { LearningStateManager } from './services/learningState';
import { NextLearningDecisionEngine } from './services/decisionEngine';
import { useLanguage } from './i18n/LanguageContext';
import { Navigation } from './components/Navigation';
import { HomeScreen } from './components/HomeScreen';
import { AddSourceScreen } from './components/AddSourceScreen';
import { SourceDetailsScreen } from './components/SourceDetailsScreen';
import { ChooseTimeScreen } from './components/ChooseTimeScreen';
import { LearningSessionScreen } from './components/LearningSessionScreen';
import { SessionResultsScreen } from './components/SessionResultsScreen';
import { OnboardingScreen } from './components/OnboardingScreen';
import { LanguageSelectScreen } from './components/LanguageSelectScreen';
import { OllamaSettingsModal } from './components/OllamaSettingsModal';
import { CalibrationQAModal } from './components/CalibrationQAModal';

export type ScreenType =
  | 'language-select'
  | 'onboarding'
  | 'home'
  | 'add-source'
  | 'source-details'
  | 'choose-time'
  | 'session'
  | 'results';

export type AppInitStatus = 'initializing' | 'ready' | 'error';

export default function App() {
  const { setLanguage, isRTL } = useLanguage();

  // Explicit startup hydration & learner lifecycle state
  const [initStatus, setInitStatus] = useState<AppInitStatus>('initializing');
  const [learner, setLearner] = useState<Learner | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');

  const [sources, setSources] = useState<Source[]>([]);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isCalibrationQAOpen, setIsCalibrationQAOpen] = useState<boolean>(false);

  // Active & In-Progress Session states
  const [activeSessionRecord, setActiveSessionRecord] = useState<ActiveSessionRecord | null>(null);
  const [, setSessionConfig] = useState<SessionConfig | null>(null);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [sessionHistory, setSessionHistory] = useState<SessionSummary[]>([]);
  const [isBuildingSession, setIsBuildingSession] = useState<boolean>(false);

  // Comprehensive Local-First Startup Hydration
  useEffect(() => {
    try {
      // 1. Initialize repository and execute idempotent migrations
      LocalRepository.initialize();

      // 2. Hydrate persistent Learner & Profile
      const currentLearner = LocalRepository.getLearner();
      const profile = currentLearner?.profile || LocalRepository.getUserProfile();
      const savedLang = LocalRepository.getInterfaceLanguage() || profile?.interfaceLanguage;

      if (savedLang) {
        setLanguage(savedLang);
      }

      setLearner(currentLearner);
      setUserProfile(profile);

      // 3. Hydrate Learner's Sources & History
      const learnerId = currentLearner?.id;
      const loadedSources = LocalRepository.getSources(learnerId);
      setSources(loadedSources);

      const history = LocalRepository.getSessionHistory(learnerId);
      setSessionHistory(history);

      // 4. Hydrate Active In-Progress Session
      const activeRecord = LocalRepository.getActiveSession(learnerId);
      setActiveSessionRecord(activeRecord);

      // 5. Deterministic initial screen routing
      if (!savedLang && (!profile || !profile.onboardingCompleted)) {
        setCurrentScreen('language-select');
      } else if (!profile || !profile.onboardingCompleted) {
        setCurrentScreen('onboarding');
      } else {
        setCurrentScreen('home');
      }

      setInitStatus('ready');
    } catch (e) {
      console.error('[App] Startup hydration error:', e);
      setInitStatus('error');
    }
  }, [setLanguage]);

  const refreshSources = useCallback(() => {
    const updated = LocalRepository.getSources(learner?.id);
    setSources(updated);
    if (selectedSource) {
      const refreshedSelected = updated.find(s => s.id === selectedSource.id) || null;
      setSelectedSource(refreshedSelected);
    }
  }, [learner?.id, selectedSource]);

  const refreshAdaptiveAndHistory = useCallback(() => {
    const history = LocalRepository.getSessionHistory(learner?.id);
    setSessionHistory(history);
    const active = LocalRepository.getActiveSession(learner?.id);
    setActiveSessionRecord(active);
  }, [learner?.id]);

  // Dedicated application-level Next Learning Decision
  const nextDecision: NextLearningDecision = useMemo(() => {
    return NextLearningDecisionEngine.decide({
      learner,
      userProfile,
      sources,
      activeSession: activeSessionRecord,
      learningState: LocalRepository.getLearningState(learner?.id),
      sessionHistory
    });
  }, [learner, userProfile, sources, activeSessionRecord, sessionHistory]);

  // Clean navigation handlers
  const handleGoHome = () => {
    setCurrentScreen('home');
    setSelectedSource(null);
    setSessionConfig(null);
    setSessionState(null);
    refreshSources();
    refreshAdaptiveAndHistory();
  };

  const handleLanguageSelected = (selectedLang: InterfaceLanguage) => {
    setLanguage(selectedLang);
    LocalRepository.setInterfaceLanguage(selectedLang);
    const profile = LocalRepository.getUserProfile();
    if (!profile || !profile.onboardingCompleted) {
      setCurrentScreen('onboarding');
    } else {
      handleGoHome();
    }
  };

  const handleCompleteOnboarding = (profile: UserProfile) => {
    const existingLearner = LocalRepository.getLearner();
    let savedLearner: Learner;

    if (existingLearner) {
      savedLearner = LocalRepository.updateLearnerProfile(profile) || existingLearner;
    } else {
      savedLearner = LocalRepository.createLearner(profile);
    }

    setLearner(savedLearner);
    setUserProfile(savedLearner.profile);
    LocalRepository.clearOnboardingDraft();
    handleGoHome();
  };

  const handleResetLearner = () => {
    LocalRepository.resetAllLearnerData();
    setLearner(null);
    setUserProfile(null);
    setSources([]);
    setSelectedSource(null);
    setSessionState(null);
    setActiveSessionRecord(null);
    setSessionHistory([]);
    setCurrentScreen('language-select');
  };

  const handleSelectSource = (source: Source) => {
    setSelectedSource(source);
    setCurrentScreen('source-details');
  };

  const handleStartPractice = () => {
    if (selectedSource) {
      setCurrentScreen('choose-time');
    }
  };

  const handleDeleteSource = (id: string) => {
    LocalRepository.deleteSource(id);
    refreshSources();
    handleGoHome();
  };

  const handleSourceUpdated = (updated: Source) => {
    setSelectedSource(updated);
    refreshSources();
  };

  // Resume active interrupted session
  const handleResumeActiveSession = () => {
    if (!activeSessionRecord) return;
    const restoredState = activeSessionRecord.sessionState;
    setSessionState(restoredState);

    if (restoredState.plan?.sourceId) {
      const matched = sources.find(s => s.id === restoredState.plan.sourceId) || LocalRepository.getSourceById(restoredState.plan.sourceId);
      if (matched) {
        setSelectedSource(matched);
      }
    }
    setCurrentScreen('session');
  };

  // Discard active interrupted session
  const handleDiscardActiveSession = () => {
    LocalRepository.clearActiveSession();
    setActiveSessionRecord(null);
  };

  const handleConfirmDuration = async (durationMinutes: number, targetSource?: Source | null) => {
    const sourceToUse = targetSource !== undefined ? targetSource : selectedSource;
    setIsBuildingSession(true);

    const config: SessionConfig = {
      sourceId: sourceToUse?.id,
      durationMinutes,
      userLevel: (userProfile?.level && userProfile.level !== 'unknown' ? userProfile.level : sourceToUse?.analysis?.estimatedLevel) || 'B1'
    };
    setSessionConfig(config);

    try {
      // Build full Pedagogical Learning Unit SessionPlan
      const plan = await SessionEngine.createSessionPlan(sourceToUse, durationMinutes, userProfile);
      const currentLearnerId = learner?.id || LocalRepository.getLearner()?.id;

      const newSessionState: SessionState = {
        plan,
        config,
        learnerId: currentLearnerId,
        currentActivityIndex: 0,
        startTime: Date.now(),
        status: 'in_progress',
        answers: {},
        scores: {},
        grammarRequested: {},
        timeSpentPerActivity: {},
        exercises: plan.activities.map(a => a.exercise),
        currentIndex: 0,
        timeSpentPerExercise: {}
      };

      setSessionState(newSessionState);
      if (sourceToUse) {
        setSelectedSource(sourceToUse);
      }

      // Auto-save active session state immediately
      LocalRepository.saveActiveSession(newSessionState, currentLearnerId);
      setActiveSessionRecord(LocalRepository.getActiveSession(currentLearnerId));

      setCurrentScreen('session');
    } catch (err) {
      console.error('Failed to build session plan:', err);
    } finally {
      setIsBuildingSession(false);
    }
  };

  // Dedicated execution of next learning decision
  const handleExecuteDecision = (decision: NextLearningDecision, chosenDurationMinutes: number) => {
    switch (decision.type) {
      case 'RESUME_SESSION':
        handleResumeActiveSession();
        break;

      case 'ADD_SOURCE':
        setCurrentScreen('add-source');
        break;

      case 'REVIEW_DEVELOPING':
      case 'CONTINUE_SOURCE':
      case 'START_NEW_SESSION':
        if (decision.recommendedSource) {
          handleConfirmDuration(chosenDurationMinutes, decision.recommendedSource);
        } else if (sources.length > 0) {
          handleConfirmDuration(chosenDurationMinutes, sources[0]);
        } else {
          setCurrentScreen('add-source');
        }
        break;

      default:
        break;
    }
  };

  const handleSessionFinish = (finalState: SessionState) => {
    // 1. Clear active session record immediately upon completion
    LocalRepository.clearActiveSession();
    setActiveSessionRecord(null);
    setSessionState(finalState);

    // 2. Save completed pedagogical session summary to local history
    const summary = SessionEngine.createSummary(finalState);
    LocalRepository.saveSessionSummary(summary);

    // 3. Refresh learning state and history
    refreshAdaptiveAndHistory();

    setCurrentScreen('results');
  };

  const handlePracticeAgain = () => {
    if (selectedSource) {
      setCurrentScreen('choose-time');
    } else {
      handleGoHome();
    }
  };

  // Rendering Loading Screen during initial startup
  if (initStatus === 'initializing') {
    return (
      <div
        className="min-h-screen flex items-center justify-center font-sans antialiased"
        style={{
          backgroundColor: 'var(--color-background)',
          color: 'var(--color-text-primary)'
        }}
      >
        <div className="text-center space-y-3">
          <div
            className="w-9 h-9 border-2 rounded-full animate-spin mx-auto"
            style={{
              borderColor: 'var(--color-accent)',
              borderTopColor: 'transparent'
            }}
          />
          <p
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Loading your learning environment...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      id="app-root"
      className="min-h-screen flex flex-col font-sans antialiased transition-colors duration-200"
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        backgroundColor: 'var(--color-background)',
        color: 'var(--color-text-primary)'
      }}
    >
      {/* Header Navigation */}
      {currentScreen !== 'language-select' && (
        <Navigation
          currentScreen={currentScreen}
          onGoHome={handleGoHome}
          onAddSource={() => setCurrentScreen('add-source')}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenCalibrationQA={() => setIsCalibrationQAOpen(true)}
          sourcesCount={sources.length}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 flex flex-col justify-start">
        {/* Loading overlay if session generation is computing */}
        {isBuildingSession && (
          <div className="text-center py-16 space-y-3">
            <div
              className="w-8 h-8 border-2 rounded-full animate-spin mx-auto"
              style={{
                borderColor: 'var(--color-accent)',
                borderTopColor: 'transparent'
              }}
            />
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Adapting exercises to your time window...
            </p>
          </div>
        )}

        {!isBuildingSession && currentScreen === 'language-select' && (
          <LanguageSelectScreen onContinue={handleLanguageSelected} />
        )}

        {!isBuildingSession && currentScreen === 'onboarding' && (
          <OnboardingScreen
            initialProfile={userProfile}
            onComplete={handleCompleteOnboarding}
            onCancel={userProfile?.onboardingCompleted ? handleGoHome : undefined}
          />
        )}

        {!isBuildingSession && currentScreen === 'home' && (
          <HomeScreen
            sources={sources}
            nextDecision={nextDecision}
            sessionHistory={sessionHistory}
            onExecuteDecision={handleExecuteDecision}
            onDiscardActiveSession={handleDiscardActiveSession}
            onSelectSource={handleSelectSource}
            onAddSource={() => setCurrentScreen('add-source')}
          />
        )}

        {!isBuildingSession && currentScreen === 'add-source' && (
          <AddSourceScreen
            userProfile={userProfile}
            onSaved={(newSource) => {
              refreshSources();
              setSelectedSource(newSource);
              setCurrentScreen('source-details');
            }}
            onCancel={handleGoHome}
          />
        )}

        {!isBuildingSession && currentScreen === 'source-details' && selectedSource && (
          <SourceDetailsScreen
            source={selectedSource}
            userProfile={userProfile}
            onBack={handleGoHome}
            onStartPractice={handleStartPractice}
            onDeleteSource={handleDeleteSource}
            onSourceUpdated={handleSourceUpdated}
          />
        )}

        {!isBuildingSession && currentScreen === 'choose-time' && selectedSource && (
          <ChooseTimeScreen
            source={selectedSource}
            onBack={() => setCurrentScreen('source-details')}
            onConfirm={(dur) => handleConfirmDuration(dur, selectedSource)}
          />
        )}

        {!isBuildingSession && currentScreen === 'session' && sessionState && (
          <LearningSessionScreen
            source={selectedSource || {
              id: sessionState.plan.sourceId || 'custom_source',
              title: sessionState.plan.sourceTitle || 'English Practice',
              type: 'text',
              content: sessionState.plan.startingPointContext || '',
              language: 'en',
              createdAt: Date.now(),
              updatedAt: Date.now(),
              analysisStatus: 'analyzed',
              wordCount: 50
            }}
            state={sessionState}
            setState={setSessionState}
            onFinish={handleSessionFinish}
            onQuit={handleGoHome}
          />
        )}

        {!isBuildingSession && currentScreen === 'results' && sessionState && (
          <SessionResultsScreen
            state={sessionState}
            source={selectedSource || {
              id: sessionState.plan.sourceId || 'custom_source',
              title: sessionState.plan.sourceTitle || 'English Practice',
              type: 'text',
              content: sessionState.plan.startingPointContext || '',
              language: 'en',
              createdAt: Date.now(),
              updatedAt: Date.now(),
              analysisStatus: 'analyzed',
              wordCount: 50
            }}
            onFinish={handleGoHome}
            onPracticeAgain={handlePracticeAgain}
          />
        )}
      </main>

      {/* Ollama Local AI & Learner Settings Modal */}
      <OllamaSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userProfile={userProfile}
        onOpenOnboarding={() => {
          setIsSettingsOpen(false);
          setCurrentScreen('onboarding');
        }}
        onResetProfile={handleResetLearner}
      />

      {/* Adaptive Learning Calibration & QA Modal */}
      <CalibrationQAModal
        isOpen={isCalibrationQAOpen}
        onClose={() => setIsCalibrationQAOpen(false)}
      />

      {/* Subtle, Calm Footer */}
      <footer
        className="border-t py-6 text-center text-xs transition-colors"
        style={{
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-tertiary)'
        }}
      >
        <p>Local-First Adaptive English Prototype • No Cloud Dependency</p>
      </footer>
    </div>
  );
}
