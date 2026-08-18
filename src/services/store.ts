import {
  Source,
  SessionSummary,
  UserProfile,
  InterfaceLanguage,
  OnboardingDraft,
  AnalysisStatus,
  SourceAnalysis,
  LearningState,
  SkillType,
  SkillState,
  Learner,
  SessionState,
  ActiveSessionRecord,
  ErrorCategory,
  ErrorRecord,
  ErrorMemoryState,
  LearningHistorySummary,
  LearnerMetadata,
  LearnerModel,
  LearningEvent
} from '../types';

export const CURRENT_SCHEMA_VERSION = 3;

const STORAGE_KEY_SCHEMA_VERSION = 'adaptive_english_schema_version_v1';
const STORAGE_KEY_LEARNER = 'adaptive_english_learner_v1';
const STORAGE_KEY_ACTIVE_SESSION = 'adaptive_english_active_session_v1';
const STORAGE_KEY_SOURCES = 'adaptive_english_sources_v1';
const STORAGE_KEY_SESSIONS = 'adaptive_english_sessions_v1';
const STORAGE_KEY_USER_PROFILE = 'adaptive_english_user_profile_v1';
const STORAGE_KEY_LANGUAGE = 'adaptive_english_lang_v1';
const STORAGE_KEY_ONBOARDING_DRAFT = 'adaptive_english_onboarding_draft_v1';
const STORAGE_KEY_LEARNING_STATE = 'adaptive_english_learning_state_v1';
const STORAGE_KEY_LEARNER_MODEL = 'adaptive_english_learner_model_v1';
const STORAGE_KEY_ERROR_MEMORY = 'adaptive_english_error_memory_v1';
const STORAGE_KEY_LEARNING_EVENTS = 'adaptive_english_learning_events_v1';

class MemoryStorage {
  private store: Map<string, string> = new Map();
  public getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  public setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  public removeItem(key: string): void {
    this.store.delete(key);
  }
  public clear(): void {
    this.store.clear();
  }
}

const memoryStorageFallback = new MemoryStorage();

function getStorage(): {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear?: () => void;
} {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      return window.localStorage;
    }
    if (typeof globalThis !== 'undefined' && typeof (globalThis as any).localStorage !== 'undefined') {
      return (globalThis as any).localStorage;
    }
  } catch {
    // Access denied or restricted
  }
  return memoryStorageFallback;
}

export class LocalRepository {
  private static isInitialized = false;

  // ---------------------------------------------------------------------------
  // Utility & Helper Methods
  // ---------------------------------------------------------------------------

  public static generateStableId(prefix = 'lrn'): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    }
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
  }

  /**
   * Safe JSON parsing that guards against malformed/corrupted data without crashing.
   * If corruption is detected, saves a timestamped backup before returning the fallback.
   */
  private static safeGetJson<T>(key: string, fallback: T): T {
    try {
      const raw = getStorage().getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch (e) {
      console.warn(`[LocalRepository] Corrupted JSON detected for key "${key}". Preserving backup...`, e);
      try {
        const raw = getStorage().getItem(key);
        if (raw) {
          getStorage().setItem(`${key}_corrupt_bak_${Date.now()}`, raw);
        }
      } catch {
        // Ignore backup failure in restricted environments
      }
      return fallback;
    }
  }

  /**
   * Initializes and executes idempotent migrations for existing installations.
   */
  public static initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      let learner = this.safeGetJson<Learner | null>(STORAGE_KEY_LEARNER, null);
      const existingProfile = this.safeGetJson<UserProfile | null>(STORAGE_KEY_USER_PROFILE, null);

      // Migration: Existing profile exists, but no Learner entity yet
      if (!learner && existingProfile) {
        const newLearnerId = this.generateStableId('lrn');
        const now = Date.now();
        learner = {
          id: newLearnerId,
          createdAt: existingProfile.createdAt || now,
          updatedAt: existingProfile.updatedAt || now,
          profile: existingProfile,
          schemaVersion: CURRENT_SCHEMA_VERSION
        };
        getStorage().setItem(STORAGE_KEY_LEARNER, JSON.stringify(learner));

        // Migrate Sources: associate existing sources with this learnerId
        const sources = this.getSources();
        if (sources.length > 0) {
          const updatedSources = sources.map(s => ({
            ...s,
            learnerId: s.learnerId || newLearnerId
          }));
          getStorage().setItem(STORAGE_KEY_SOURCES, JSON.stringify(updatedSources));
        }

        // Migrate Sessions: associate existing session summaries with this learnerId
        const sessions = this.getSessionHistory();
        if (sessions.length > 0) {
          const updatedSessions = sessions.map(s => ({
            ...s,
            learnerId: s.learnerId || newLearnerId
          }));
          getStorage().setItem(STORAGE_KEY_SESSIONS, JSON.stringify(updatedSessions));
        }

        // Migrate Learning State: replace 'local_learner' with learnerId
        const learningState = this.getLearningState();
        if (learningState) {
          learningState.learnerId = newLearnerId;
          getStorage().setItem(STORAGE_KEY_LEARNING_STATE, JSON.stringify(learningState));
        }

        getStorage().setItem(STORAGE_KEY_SCHEMA_VERSION, String(CURRENT_SCHEMA_VERSION));
      } else if (learner) {
        // Synchronize schema version
        getStorage().setItem(STORAGE_KEY_SCHEMA_VERSION, String(CURRENT_SCHEMA_VERSION));
      }

      // Schema 3 Migration: Ensure LearnerModel and ErrorMemory exist
      const existingModel = this.safeGetJson<LearnerModel | null>(STORAGE_KEY_LEARNER_MODEL, null);
      if (!existingModel && (learner || existingProfile)) {
        const activeLearnerId = learner?.id || this.generateStableId('lrn');
        const activeProfile = learner?.profile || existingProfile!;
        const learningState = this.getLearningState(activeLearnerId);
        const errorMemory = this.getErrorMemory(activeLearnerId);
        const historySummary = this.getLearningHistorySummary(activeLearnerId);
        const now = Date.now();

        const model: LearnerModel = {
          id: activeLearnerId,
          profile: activeProfile,
          skillStates: learningState.skillStates,
          assetStates: learningState.assetStates,
          errorMemory,
          learningHistory: historySummary,
          metadata: {
            schemaVersion: CURRENT_SCHEMA_VERSION,
            createdAt: learner?.createdAt || activeProfile.createdAt || now,
            updatedAt: now,
            lastActiveAt: now
          },
          schemaVersion: CURRENT_SCHEMA_VERSION,
          createdAt: learner?.createdAt || activeProfile.createdAt || now,
          updatedAt: now
        };
        getStorage().setItem(STORAGE_KEY_LEARNER_MODEL, JSON.stringify(model));
      }
    } catch (e) {
      console.error('[LocalRepository] Initialization error:', e);
    }
  }

  // ---------------------------------------------------------------------------
  // Learner Entity Lifecycle
  // ---------------------------------------------------------------------------

  public static getLearner(): Learner | null {
    this.initialize();
    return this.safeGetJson<Learner | null>(STORAGE_KEY_LEARNER, null);
  }

  public static createLearner(profile: UserProfile): Learner {
    const learnerId = this.generateStableId('lrn');
    const now = Date.now();
    const newLearner: Learner = {
      id: learnerId,
      createdAt: now,
      updatedAt: now,
      profile: {
        ...profile,
        onboardingCompleted: true,
        updatedAt: now
      },
      schemaVersion: CURRENT_SCHEMA_VERSION
    };

    try {
      getStorage().setItem(STORAGE_KEY_LEARNER, JSON.stringify(newLearner));
      getStorage().setItem(STORAGE_KEY_USER_PROFILE, JSON.stringify(newLearner.profile));
      getStorage().setItem(STORAGE_KEY_LANGUAGE, newLearner.profile.interfaceLanguage);
      getStorage().setItem(STORAGE_KEY_SCHEMA_VERSION, String(CURRENT_SCHEMA_VERSION));
    } catch (e) {
      console.error('[LocalRepository] Failed to save new learner:', e);
    }

    return newLearner;
  }

  public static updateLearnerProfile(profileData: Partial<UserProfile>): Learner | null {
    const currentLearner = this.getLearner();
    const now = Date.now();

    if (!currentLearner) {
      // If no learner exists, save profile and create learner
      const savedProfile = this.saveUserProfile(profileData);
      return this.createLearner(savedProfile);
    }

    const updatedProfile: UserProfile = {
      ...currentLearner.profile,
      ...profileData,
      updatedAt: now
    };

    const updatedLearner: Learner = {
      ...currentLearner,
      profile: updatedProfile,
      updatedAt: now
    };

    try {
      getStorage().setItem(STORAGE_KEY_LEARNER, JSON.stringify(updatedLearner));
      getStorage().setItem(STORAGE_KEY_USER_PROFILE, JSON.stringify(updatedProfile));
      getStorage().setItem(STORAGE_KEY_LANGUAGE, updatedProfile.interfaceLanguage);
    } catch (e) {
      console.error('[LocalRepository] Failed to update learner:', e);
    }

    return updatedLearner;
  }

  // ---------------------------------------------------------------------------
  // User Profile Methods (Maintained for Backward Compatibility)
  // ---------------------------------------------------------------------------

  public static getUserProfile(): UserProfile | null {
    const learner = this.getLearner();
    if (learner?.profile) {
      return learner.profile;
    }
    return this.safeGetJson<UserProfile | null>(STORAGE_KEY_USER_PROFILE, null);
  }

  public static saveUserProfile(profileData: Partial<UserProfile>): UserProfile {
    const existing = this.getUserProfile();
    const now = Date.now();
    const currentLang = profileData.interfaceLanguage || existing?.interfaceLanguage || this.getInterfaceLanguage() || 'en';

    const updated: UserProfile = {
      interfaceLanguage: currentLang,
      learningLanguage: 'en',
      supportLanguage: profileData.supportLanguage ?? existing?.supportLanguage ?? (currentLang === 'fa' ? 'fa' : 'en'),
      level: profileData.level ?? existing?.level ?? 'unknown',
      levelSource: profileData.levelSource ?? existing?.levelSource ?? 'self_assessed',
      goals: profileData.goals ?? existing?.goals ?? [],
      challenges: profileData.challenges ?? existing?.challenges ?? [],
      interests: profileData.interests ?? existing?.interests ?? [],
      customInterests: profileData.customInterests ?? existing?.customInterests ?? [],
      skillPriorities: profileData.skillPriorities ?? existing?.skillPriorities ?? [],
      contentPreferences: profileData.contentPreferences ?? existing?.contentPreferences ?? [],
      difficultyPreference: profileData.difficultyPreference ?? existing?.difficultyPreference ?? 'balanced',
      languageSupportPreference: profileData.languageSupportPreference ?? existing?.languageSupportPreference ?? (currentLang === 'fa' ? 'occasional_translation' : 'mostly_english'),
      grammarPreference: profileData.grammarPreference ?? existing?.grammarPreference ?? 'implicit',
      onboardingCompleted: profileData.onboardingCompleted ?? existing?.onboardingCompleted ?? false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };

    const currentLearner = this.getLearner();
    if (currentLearner) {
      const updatedLearner: Learner = {
        ...currentLearner,
        profile: updated,
        updatedAt: now
      };
      try {
        getStorage().setItem(STORAGE_KEY_LEARNER, JSON.stringify(updatedLearner));
      } catch (e) {
        console.error('[LocalRepository] Failed to sync updated profile to learner:', e);
      }
    } else {
      const newLearner: Learner = {
        id: this.generateStableId('lrn'),
        createdAt: now,
        updatedAt: now,
        profile: updated,
        schemaVersion: CURRENT_SCHEMA_VERSION
      };
      try {
        getStorage().setItem(STORAGE_KEY_LEARNER, JSON.stringify(newLearner));
      } catch (e) {
        console.error('[LocalRepository] Failed to create initial learner from profile:', e);
      }
    }

    try {
      getStorage().setItem(STORAGE_KEY_USER_PROFILE, JSON.stringify(updated));
      getStorage().setItem(STORAGE_KEY_LANGUAGE, updated.interfaceLanguage);
    } catch (e) {
      console.error('[LocalRepository] Failed to save user profile to storage:', e);
    }
    return updated;
  }

  // ---------------------------------------------------------------------------
  // Sources Persistence (Associated with Learner)
  // ---------------------------------------------------------------------------

  public static getSources(learnerId?: string): Source[] {
    try {
      const currentLearnerId = learnerId || this.getLearner()?.id;
      const parsed = this.safeGetJson<any[]>(STORAGE_KEY_SOURCES, []);

      if (Array.isArray(parsed)) {
        const normalizedList: Source[] = parsed.map((s: any) => {
          const content = typeof s.content === 'string' ? s.content : '';
          const wordCount = s.wordCount || content.split(/\s+/).filter(Boolean).length;
          const analysis: SourceAnalysis | undefined = s.analysis || s.lastAnalysis || undefined;
          const analysisStatus: AnalysisStatus = s.analysisStatus || (analysis ? 'analyzed' : 'not_analyzed');

          const normalized: Source = {
            id: String(s.id || `src_${Date.now()}`),
            learnerId: s.learnerId || currentLearnerId,
            type: s.type || 'text',
            title: String(s.title || 'Untitled Material'),
            content,
            language: s.language || 'en',
            createdAt: typeof s.createdAt === 'number' ? s.createdAt : Date.now(),
            updatedAt: typeof s.updatedAt === 'number' ? s.updatedAt : Date.now(),
            analysisStatus,
            analysis,
            userNotes: s.userNotes,
            wordCount,
            tags: Array.isArray(s.tags) ? s.tags : []
          };
          return normalized;
        });

        // Filter by learnerId if available, while safely returning unassociated items to prevent data loss
        if (currentLearnerId) {
          return normalizedList.filter(s => !s.learnerId || s.learnerId === currentLearnerId);
        }
        return normalizedList;
      }
      return [];
    } catch {
      return [];
    }
  }

  public static createSource(
    params: {
      title?: string;
      content: string;
      type?: Source['type'];
      tags?: string[];
      userNotes?: string;
      initialStatus?: AnalysisStatus;
    },
    learnerId?: string
  ): Source {
    const currentLearnerId = learnerId || this.getLearner()?.id;
    const allSources = this.safeGetJson<Source[]>(STORAGE_KEY_SOURCES, []);
    const cleanContent = params.content.trim();
    const cleanTitle = (params.title || '').trim();

    const title = cleanTitle.length > 0
      ? cleanTitle
      : (cleanContent.split('\n')[0].slice(0, 40).trim() || 'Untitled Text');

    const now = Date.now();
    const newSource: Source = {
      id: `src_${now}_${Math.random().toString(36).substring(2, 7)}`,
      learnerId: currentLearnerId,
      type: params.type || 'text',
      title,
      content: cleanContent,
      language: 'en',
      createdAt: now,
      updatedAt: now,
      analysisStatus: params.initialStatus || 'not_analyzed',
      wordCount: cleanContent.split(/\s+/).filter(Boolean).length,
      tags: params.tags && params.tags.length > 0 ? params.tags : ['Text'],
      userNotes: params.userNotes
    };

    const updated = [newSource, ...allSources];
    try {
      getStorage().setItem(STORAGE_KEY_SOURCES, JSON.stringify(updated));
    } catch (e) {
      console.error('[LocalRepository] Failed to save source to storage:', e);
    }
    return newSource;
  }

  public static saveSource(
    title: string,
    content: string,
    type: Source['type'] = 'text',
    tags: string[] = []
  ): Source {
    return this.createSource({ title, content, type, tags });
  }

  public static updateSource(id: string, updates: Partial<Source>): Source | null {
    const sources = this.safeGetJson<Source[]>(STORAGE_KEY_SOURCES, []);
    const index = sources.findIndex(s => s.id === id);
    if (index === -1) return null;

    const current = sources[index];
    const newContent = updates.content !== undefined ? updates.content.trim() : current.content;
    const now = Date.now();

    const updatedSource: Source = {
      ...current,
      ...updates,
      content: newContent,
      wordCount: newContent.split(/\s+/).filter(Boolean).length,
      updatedAt: now
    };

    sources[index] = updatedSource;
    try {
      getStorage().setItem(STORAGE_KEY_SOURCES, JSON.stringify(sources));
    } catch (e) {
      console.error('[LocalRepository] Failed to update source:', e);
    }
    return updatedSource;
  }

  public static setSourceAnalysisStatus(id: string, status: AnalysisStatus): Source | null {
    return this.updateSource(id, { analysisStatus: status });
  }

  public static saveSourceAnalysis(sourceId: string, analysis: SourceAnalysis): Source | null {
    return this.updateSource(sourceId, {
      analysis,
      analysisStatus: 'analyzed'
    });
  }

  public static deleteSource(id: string): boolean {
    const sources = this.safeGetJson<Source[]>(STORAGE_KEY_SOURCES, []);
    const filtered = sources.filter(s => s.id !== id);
    try {
      getStorage().setItem(STORAGE_KEY_SOURCES, JSON.stringify(filtered));
      return true;
    } catch {
      return false;
    }
  }

  public static getSourceById(id: string): Source | undefined {
    return this.getSources().find(s => s.id === id);
  }

  // ---------------------------------------------------------------------------
  // Session Summary & History Persistence
  // ---------------------------------------------------------------------------

  public static saveSessionSummary(summary: SessionSummary): void {
    try {
      const learnerId = summary.learnerId || this.getLearner()?.id;
      const taggedSummary: SessionSummary = {
        ...summary,
        learnerId
      };

      const history = this.getSessionHistory();
      const updated = [taggedSummary, ...history].slice(0, 50); // keep last 50
      getStorage().setItem(STORAGE_KEY_SESSIONS, JSON.stringify(updated));
    } catch (e) {
      console.error('[LocalRepository] Failed to save session history:', e);
    }
  }

  public static getSessionHistory(learnerId?: string): SessionSummary[] {
    try {
      const currentLearnerId = learnerId || this.getLearner()?.id;
      const history = this.safeGetJson<SessionSummary[]>(STORAGE_KEY_SESSIONS, []);

      if (currentLearnerId && Array.isArray(history)) {
        return history.filter(s => !s.learnerId || s.learnerId === currentLearnerId);
      }
      return Array.isArray(history) ? history : [];
    } catch {
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // Active (In-Progress / Interrupted) Session Persistence
  // ---------------------------------------------------------------------------

  public static getActiveSession(learnerId?: string): ActiveSessionRecord | null {
    try {
      const currentLearnerId = learnerId || this.getLearner()?.id;
      const record = this.safeGetJson<ActiveSessionRecord | null>(STORAGE_KEY_ACTIVE_SESSION, null);
      if (!record) return null;

      // Match against current learner
      if (currentLearnerId && record.learnerId && record.learnerId !== currentLearnerId) {
        return null;
      }
      return record;
    } catch {
      return null;
    }
  }

  public static saveActiveSession(state: SessionState, learnerId?: string): void {
    try {
      const currentLearnerId = learnerId || state.learnerId || this.getLearner()?.id || 'learner_default';
      const record: ActiveSessionRecord = {
        sessionId: state.plan?.id || `sess_${Date.now()}`,
        learnerId: currentLearnerId,
        sourceId: state.plan?.sourceId,
        sourceTitle: state.plan?.sourceTitle,
        sessionState: {
          ...state,
          learnerId: currentLearnerId
        },
        lastSavedAt: Date.now()
      };

      getStorage().setItem(STORAGE_KEY_ACTIVE_SESSION, JSON.stringify(record));
    } catch (e) {
      console.error('[LocalRepository] Failed to save active session:', e);
    }
  }

  public static clearActiveSession(): void {
    try {
      getStorage().removeItem(STORAGE_KEY_ACTIVE_SESSION);
    } catch (e) {
      console.error('[LocalRepository] Failed to clear active session:', e);
    }
  }

  // ---------------------------------------------------------------------------
  // Interface Language & Onboarding Draft Persistence
  // ---------------------------------------------------------------------------

  public static getInterfaceLanguage(): InterfaceLanguage | null {
    try {
      const saved = getStorage().getItem(STORAGE_KEY_LANGUAGE) as InterfaceLanguage | null;
      if (saved === 'en' || saved === 'fa') {
        return saved;
      }
      return null;
    } catch {
      return null;
    }
  }

  public static setInterfaceLanguage(lang: InterfaceLanguage): void {
    try {
      getStorage().setItem(STORAGE_KEY_LANGUAGE, lang);
    } catch (e) {
      console.error('[LocalRepository] Failed to save language to storage:', e);
    }
  }

  public static getOnboardingDraft(): OnboardingDraft | null {
    return this.safeGetJson<OnboardingDraft | null>(STORAGE_KEY_ONBOARDING_DRAFT, null);
  }

  public static saveOnboardingDraft(draft: OnboardingDraft): void {
    try {
      getStorage().setItem(STORAGE_KEY_ONBOARDING_DRAFT, JSON.stringify(draft));
    } catch (e) {
      console.error('[LocalRepository] Failed to save onboarding draft:', e);
    }
  }

  public static clearOnboardingDraft(): void {
    try {
      getStorage().removeItem(STORAGE_KEY_ONBOARDING_DRAFT);
    } catch (e) {
      console.error('[LocalRepository] Failed to clear onboarding draft:', e);
    }
  }

  // ---------------------------------------------------------------------------
  // Learning State Persistence (Adaptive Progression & Decay Model)
  // ---------------------------------------------------------------------------

  public static getLearningState(learnerId?: string): LearningState {
    const currentLearnerId = learnerId || this.getLearner()?.id || 'learner_default';

    const defaultSkillStates: Record<SkillType, SkillState> = {
      vocabulary: {
        skill: 'vocabulary',
        recentPerformance: 'exploring',
        totalAttempts: 0,
        correctAttempts: 0,
        successRate: 0,
        trend: 'steady',
        lastPracticedAt: 0,
        updatedAt: Date.now()
      },
      grammar: {
        skill: 'grammar',
        recentPerformance: 'exploring',
        totalAttempts: 0,
        correctAttempts: 0,
        successRate: 0,
        trend: 'steady',
        lastPracticedAt: 0,
        updatedAt: Date.now()
      },
      comprehension: {
        skill: 'comprehension',
        recentPerformance: 'exploring',
        totalAttempts: 0,
        correctAttempts: 0,
        successRate: 0,
        trend: 'steady',
        lastPracticedAt: 0,
        updatedAt: Date.now()
      },
      speaking: {
        skill: 'speaking',
        recentPerformance: 'exploring',
        totalAttempts: 0,
        correctAttempts: 0,
        successRate: 0,
        trend: 'steady',
        lastPracticedAt: 0,
        updatedAt: Date.now()
      }
    };

    const defaultState: LearningState = {
      learnerId: currentLearnerId,
      assetStates: {},
      skillStates: defaultSkillStates,
      totalSessionsCompleted: 0,
      updatedAt: Date.now()
    };

    try {
      const parsed = this.safeGetJson<any>(STORAGE_KEY_LEARNING_STATE, null);
      if (!parsed) return defaultState;
      return {
        learnerId: parsed.learnerId && parsed.learnerId !== 'local_learner' ? parsed.learnerId : currentLearnerId,
        assetStates: parsed.assetStates || {},
        skillStates: { ...defaultSkillStates, ...(parsed.skillStates || {}) },
        totalSessionsCompleted: typeof parsed.totalSessionsCompleted === 'number' ? parsed.totalSessionsCompleted : 0,
        lastSessionAt: parsed.lastSessionAt,
        updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now()
      };
    } catch {
      return defaultState;
    }
  }

  public static saveLearningState(state: LearningState): void {
    try {
      const currentLearnerId = state.learnerId && state.learnerId !== 'local_learner'
        ? state.learnerId
        : (this.getLearner()?.id || 'learner_default');

      const updatedState: LearningState = {
        ...state,
        learnerId: currentLearnerId
      };
      getStorage().setItem(STORAGE_KEY_LEARNING_STATE, JSON.stringify(updatedState));
    } catch (e) {
      console.error('[LocalRepository] Failed to save learning state:', e);
    }
  }

  public static resetLearningState(): void {
    try {
      getStorage().removeItem(STORAGE_KEY_LEARNING_STATE);
    } catch (e) {
      console.error('[LocalRepository] Failed to reset learning state:', e);
    }
  }

  // ---------------------------------------------------------------------------
  // Error Memory Persistence (Phase 2 Learner Foundation)
  // ---------------------------------------------------------------------------

  public static getErrorMemory(learnerId?: string): ErrorMemoryState {
    const currentLearnerId = learnerId || this.getLearner()?.id || 'learner_default';
    const defaultMemory: ErrorMemoryState = {
      learnerId: currentLearnerId,
      records: [],
      categoryCounts: {
        unknown: 0,
        lexical: 0,
        grammatical: 0,
        comprehension: 0,
        speaking: 0,
        listening: 0
      },
      updatedAt: Date.now()
    };

    try {
      const parsed = this.safeGetJson<any>(STORAGE_KEY_ERROR_MEMORY, null);
      if (!parsed) return defaultMemory;

      const records: ErrorRecord[] = Array.isArray(parsed.records) ? parsed.records : [];
      const categoryCounts: Record<ErrorCategory, number> = {
        unknown: 0,
        lexical: 0,
        grammatical: 0,
        comprehension: 0,
        speaking: 0,
        listening: 0,
        ...(parsed.categoryCounts || {})
      };

      return {
        learnerId: parsed.learnerId && parsed.learnerId !== 'local_learner' ? parsed.learnerId : currentLearnerId,
        records,
        categoryCounts,
        lastErrorAt: typeof parsed.lastErrorAt === 'number' ? parsed.lastErrorAt : undefined,
        updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now()
      };
    } catch {
      return defaultMemory;
    }
  }

  public static saveErrorMemory(errorMemory: ErrorMemoryState): void {
    try {
      const currentLearnerId = errorMemory.learnerId && errorMemory.learnerId !== 'local_learner'
        ? errorMemory.learnerId
        : (this.getLearner()?.id || 'learner_default');

      // Cap records at latest 200 to prevent unbounded growth in localStorage
      const cappedRecords = (errorMemory.records || []).slice(0, 200);

      const categoryCounts: Record<ErrorCategory, number> = {
        unknown: 0,
        lexical: 0,
        grammatical: 0,
        comprehension: 0,
        speaking: 0,
        listening: 0
      };

      cappedRecords.forEach(r => {
        const cat = r.errorCategory || 'unknown';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });

      const updated: ErrorMemoryState = {
        ...errorMemory,
        learnerId: currentLearnerId,
        records: cappedRecords,
        categoryCounts,
        updatedAt: Date.now()
      };

      getStorage().setItem(STORAGE_KEY_ERROR_MEMORY, JSON.stringify(updated));
    } catch (e) {
      console.error('[LocalRepository] Failed to save error memory:', e);
    }
  }

  public static recordError(
    errorData: Omit<ErrorRecord, 'id' | 'timestamp' | 'learnerId'> & {
      id?: string;
      timestamp?: number;
      learnerId?: string;
    }
  ): ErrorRecord {
    const learnerId = errorData.learnerId || this.getLearner()?.id || 'learner_default';
    const now = errorData.timestamp || Date.now();
    const errorRecord: ErrorRecord = {
      id: errorData.id || this.generateStableId('err'),
      timestamp: now,
      learnerId,
      assetId: errorData.assetId,
      assetTerm: errorData.assetTerm,
      assetType: errorData.assetType,
      sessionId: errorData.sessionId,
      sourceId: errorData.sourceId,
      activityId: errorData.activityId,
      exerciseId: errorData.exerciseId,
      exerciseType: errorData.exerciseType,
      errorCategory: errorData.errorCategory || 'unknown',
      learnerResponse: errorData.learnerResponse,
      expectedAnswer: errorData.expectedAnswer,
      feedbackMessage: errorData.feedbackMessage,
      unassisted: errorData.unassisted,
      attemptsCount: errorData.attemptsCount
    };

    try {
      const memory = this.getErrorMemory(learnerId);
      const records = [errorRecord, ...memory.records].slice(0, 200);
      const categoryCounts = { ...memory.categoryCounts };
      const cat = errorRecord.errorCategory || 'unknown';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

      const updatedMemory: ErrorMemoryState = {
        learnerId,
        records,
        categoryCounts,
        lastErrorAt: now,
        updatedAt: now
      };

      this.saveErrorMemory(updatedMemory);
    } catch (e) {
      console.error('[LocalRepository] Failed to record error in error memory:', e);
    }

    return errorRecord;
  }

  // ---------------------------------------------------------------------------
  // Learning History Summary Calculation
  // ---------------------------------------------------------------------------

  public static getLearningHistorySummary(learnerId?: string): LearningHistorySummary {
    const currentLearnerId = learnerId || this.getLearner()?.id;
    const sessions = this.getSessionHistory(currentLearnerId);

    let totalTimeSpentSeconds = 0;
    let lastSessionAt: number | undefined;
    const recentSessionIds: string[] = [];

    const practicedDates = new Set<string>();

    sessions.forEach(s => {
      totalTimeSpentSeconds += s.actualDurationSeconds || (s.durationMinutes * 60);
      if (!lastSessionAt || s.completedAt > lastSessionAt) {
        lastSessionAt = s.completedAt;
      }
      if (s.id) {
        recentSessionIds.push(s.id);
      }
      if (s.completedAt) {
        const dateStr = new Date(s.completedAt).toISOString().split('T')[0];
        practicedDates.add(dateStr);
      }
    });

    let streakDays = 0;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const checkDate = practicedDates.has(today) ? today : (practicedDates.has(yesterday) ? yesterday : null);

    if (checkDate) {
      let currentDateObj = new Date(checkDate);
      while (practicedDates.has(currentDateObj.toISOString().split('T')[0])) {
        streakDays++;
        currentDateObj = new Date(currentDateObj.getTime() - 86400000);
      }
    }

    const lastPracticedDate = lastSessionAt
      ? new Date(lastSessionAt).toISOString().split('T')[0]
      : undefined;

    return {
      totalSessionsCompleted: sessions.length,
      totalTimeSpentSeconds,
      lastSessionAt,
      streakDays,
      lastPracticedDate,
      recentSessionIds: recentSessionIds.slice(0, 10)
    };
  }

  // ---------------------------------------------------------------------------
  // Learner Model Composition & Persistence (Phase 2 Central Learner Model)
  // ---------------------------------------------------------------------------

  public static getLearnerModel(learnerId?: string): LearnerModel | null {
    this.initialize();
    const learner = this.getLearner();
    const currentLearnerId = learnerId || learner?.id;
    if (!learner && !currentLearnerId) return null;

    const profile = learner?.profile || this.getUserProfile();
    if (!profile) return null;

    const id = currentLearnerId || learner?.id || this.generateStableId('lrn');
    const learningState = this.getLearningState(id);
    const errorMemory = this.getErrorMemory(id);
    const historySummary = this.getLearningHistorySummary(id);
    const now = Date.now();

    const storedModel = this.safeGetJson<LearnerModel | null>(STORAGE_KEY_LEARNER_MODEL, null);
    if (storedModel && storedModel.id === id) {
      return {
        ...storedModel,
        profile: { ...storedModel.profile, ...profile },
        skillStates: learningState.skillStates,
        assetStates: learningState.assetStates,
        errorMemory,
        learningHistory: historySummary,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        updatedAt: now
      };
    }

    const newModel: LearnerModel = {
      id,
      profile,
      skillStates: learningState.skillStates,
      assetStates: learningState.assetStates,
      errorMemory,
      learningHistory: historySummary,
      metadata: {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        createdAt: learner?.createdAt || profile.createdAt || now,
        updatedAt: now,
        lastActiveAt: now
      },
      schemaVersion: CURRENT_SCHEMA_VERSION,
      createdAt: learner?.createdAt || profile.createdAt || now,
      updatedAt: now
    };

    return newModel;
  }

  public static saveLearnerModel(model: LearnerModel): void {
    try {
      const now = Date.now();
      const updatedModel: LearnerModel = {
        ...model,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        updatedAt: now,
        metadata: {
          ...model.metadata,
          schemaVersion: CURRENT_SCHEMA_VERSION,
          updatedAt: now,
          lastActiveAt: now
        }
      };

      getStorage().setItem(STORAGE_KEY_LEARNER_MODEL, JSON.stringify(updatedModel));

      // Backward-compatible sync with existing stores
      if (updatedModel.profile) {
        getStorage().setItem(STORAGE_KEY_USER_PROFILE, JSON.stringify(updatedModel.profile));
        getStorage().setItem(STORAGE_KEY_LANGUAGE, updatedModel.profile.interfaceLanguage);
        const learner: Learner = {
          id: updatedModel.id,
          createdAt: updatedModel.createdAt,
          updatedAt: now,
          profile: updatedModel.profile,
          schemaVersion: CURRENT_SCHEMA_VERSION
        };
        getStorage().setItem(STORAGE_KEY_LEARNER, JSON.stringify(learner));
      }

      if (updatedModel.assetStates && updatedModel.skillStates) {
        const learningState: LearningState = {
          learnerId: updatedModel.id,
          assetStates: updatedModel.assetStates,
          skillStates: updatedModel.skillStates,
          totalSessionsCompleted: updatedModel.learningHistory?.totalSessionsCompleted || 0,
          lastSessionAt: updatedModel.learningHistory?.lastSessionAt,
          updatedAt: now
        };
        getStorage().setItem(STORAGE_KEY_LEARNING_STATE, JSON.stringify(learningState));
      }

      if (updatedModel.errorMemory) {
        this.saveErrorMemory(updatedModel.errorMemory);
      }
    } catch (e) {
      console.error('[LocalRepository] Failed to save learner model:', e);
    }
  }

  // ---------------------------------------------------------------------------
  // Learning Events Persistence (Phase 2 Event Foundation)
  // ---------------------------------------------------------------------------

  public static getLearningEvents(learnerId?: string, limit = 100): LearningEvent[] {
    try {
      const currentLearnerId = learnerId || this.getLearner()?.id;
      const allEvents = this.safeGetJson<LearningEvent[]>(STORAGE_KEY_LEARNING_EVENTS, []);
      if (!Array.isArray(allEvents)) return [];

      let filtered = allEvents;
      if (currentLearnerId) {
        filtered = allEvents.filter(e => !e.learnerId || e.learnerId === currentLearnerId);
      }

      return filtered.slice(0, limit);
    } catch {
      return [];
    }
  }

  public static recordLearningEvent(event: LearningEvent): void {
    try {
      const allEvents = this.safeGetJson<LearningEvent[]>(STORAGE_KEY_LEARNING_EVENTS, []);
      const updated = [event, ...allEvents].slice(0, 300);
      getStorage().setItem(STORAGE_KEY_LEARNING_EVENTS, JSON.stringify(updated));
    } catch (e) {
      console.error('[LocalRepository] Failed to record learning event:', e);
    }
  }

  public static recordLearningEvents(events: LearningEvent[]): void {
    if (!events || events.length === 0) return;
    try {
      const allEvents = this.safeGetJson<LearningEvent[]>(STORAGE_KEY_LEARNING_EVENTS, []);
      const updated = [...events, ...allEvents].slice(0, 300);
      getStorage().setItem(STORAGE_KEY_LEARNING_EVENTS, JSON.stringify(updated));
    } catch (e) {
      console.error('[LocalRepository] Failed to record learning events:', e);
    }
  }

  // ---------------------------------------------------------------------------
  // Complete Reset of All Learner Data
  // ---------------------------------------------------------------------------

  public static resetAllLearnerData(): void {
    try {
      getStorage().removeItem(STORAGE_KEY_LEARNER);
      getStorage().removeItem(STORAGE_KEY_USER_PROFILE);
      getStorage().removeItem(STORAGE_KEY_SOURCES);
      getStorage().removeItem(STORAGE_KEY_SESSIONS);
      getStorage().removeItem(STORAGE_KEY_LEARNING_STATE);
      getStorage().removeItem(STORAGE_KEY_LEARNER_MODEL);
      getStorage().removeItem(STORAGE_KEY_ERROR_MEMORY);
      getStorage().removeItem(STORAGE_KEY_LEARNING_EVENTS);
      getStorage().removeItem(STORAGE_KEY_ACTIVE_SESSION);
      getStorage().removeItem(STORAGE_KEY_ONBOARDING_DRAFT);
      getStorage().removeItem(STORAGE_KEY_LANGUAGE);
      this.isInitialized = false;
    } catch (e) {
      console.error('[LocalRepository] Failed to reset all learner data:', e);
    }
  }

  /**
   * @deprecated Use resetAllLearnerData() to prevent orphaned ghost data
   */
  public static resetUserProfile(): void {
    this.resetAllLearnerData();
  }
}

