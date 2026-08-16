export type SourceType = 'text' | 'url' | 'pdf' | 'youtube' | 'audio';

export type AnalysisStatus = 'not_analyzed' | 'analyzing' | 'analyzed' | 'failed';

export type EnglishLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

// ---------------------------------------------------------------------------
// Source & Learning Objects Model
// ---------------------------------------------------------------------------

export interface VocabularyItem {
  word: string;
  meaning: string;
  example: string;
  difficulty?: string;
  importance?: string;
}

export interface PhraseItem {
  phrase: string;
  meaning: string;
  example: string;
  difficulty?: string;
}

export interface ComprehensionQuestion {
  question: string;
  answer: string;
  options?: string[];
  type?: string;
  explanation?: string;
}

export interface SpeakingPrompt {
  prompt: string;
  relatedConcept?: string;
  difficulty?: string;
  guidance?: string;
}

export interface GrammarPattern {
  pattern: string;
  example: string;
  explanation: string;
  relevance?: string;
}

export interface SourceAnalysis {
  summary: string;
  estimatedLevel: EnglishLevel;
  vocabulary: VocabularyItem[];
  phrases: PhraseItem[];
  comprehensionQuestions: ComprehensionQuestion[];
  speakingPrompts: SpeakingPrompt[];
  grammarPatterns: GrammarPattern[];
  recommendedFocus: string[];
  analyzedAt: number;
  modelUsed?: string;
}

export interface Learner {
  id: string;
  createdAt: number;
  updatedAt: number;
  profile: UserProfile;
  schemaVersion: number;
}

export interface ActiveSessionRecord {
  sessionId: string;
  learnerId: string;
  sourceId?: string;
  sourceTitle?: string;
  sessionState: SessionState;
  lastSavedAt: number;
}

export interface Source {
  id: string;
  learnerId?: string;
  type: SourceType;
  title: string;
  content: string;
  language: string;
  createdAt: number;
  updatedAt: number;
  analysisStatus: AnalysisStatus;
  analysis?: SourceAnalysis;
  userNotes?: string;
  wordCount: number;
  tags?: string[];
}

// ---------------------------------------------------------------------------
// Session Plan Model (Pedagogical Learning Unit & Journey Architectures)
// ---------------------------------------------------------------------------

export type ObjectiveType = 'vocabulary' | 'grammar' | 'comprehension' | 'speaking' | 'multi_skill';
export type MasteryLevel = 'exploring' | 'developing' | 'mastered';
export type SessionStatus = 'in_progress' | 'completed' | 'abandoned';

export interface SessionObjective {
  id: string;
  type: ObjectiveType;
  title: string;
  description: string;
  targetItems: string[]; // e.g. key target vocabulary, grammar structures, collocations
  targetLevel?: EnglishLevel;
}

export type PedagogicalStage =
  | 'starting_point'
  | 'notice_input'
  | 'guided_practice'
  | 'active_retrieval'
  | 'production'
  | 'checkpoint';

export type ActivityType = 'vocabulary' | 'comprehension' | 'speaking' | 'grammar' | 'review';

export interface SessionPlanActivity {
  type: ActivityType;
  count: number;
  description: string;
}

export type ExerciseType =
  | 'vocabulary_retrieval'
  | 'implicit_grammar'
  | 'listening_comprehension'
  | 'speaking_shadowing'
  | 'explicit_grammar_tip'
  | 'contextual_notice'
  | 'checkpoint_verify';

// ---------------------------------------------------------------------------
// Phase 5 Evaluation, Feedback & Performance Evidence Data Models
// ---------------------------------------------------------------------------

export type EvaluationStatus = 'strong' | 'acceptable' | 'developing' | 'needs_support' | 'evaluation_unavailable';

export type FeedbackType = 'positive' | 'correction' | 'hint' | 'encouragement';

export interface EvaluationFeedback {
  type: FeedbackType;
  message: string;
  suggestedCorrection?: string;
  explanation?: string;
  retryPrompt?: string;
}

export interface PerformanceEvidence {
  targetAssetTerm?: string;
  targetAssetType?: AssetType;
  taskCompleted: boolean;
  targetVocabularyUsed?: boolean;
  targetMeaningCorrect?: boolean;
  grammarStatus?: 'acceptable' | 'minor_issue' | 'major_issue';
  grammarIssues?: string[];
  meaningPreserved?: boolean;
  naturalness?: 'natural' | 'acceptable' | 'unnatural';
  clarity?: 'clear' | 'partially_clear' | 'unclear';
  unassistedSuccess: boolean;
  attemptsCount: number;
  hintsUsedCount: number;
  recoveredAfterFeedback: boolean;
  finalQuality: EvaluationStatus;

  // Phase 5.1 Real Speaking Evidence properties
  recordingCaptured?: boolean;
  transcriptionAvailable?: boolean;
  transcript?: string;
  targetContentCoverage?: number;
  evaluationAvailable?: boolean;
  recordingDurationMs?: number;
}

export interface EvaluationResult {
  evaluationId: string;
  activityId: string;
  exerciseId: string;
  response: string;
  status: EvaluationStatus;
  isCorrect: boolean;
  score: number; // 0.0 to 1.0
  taskCompleted: boolean;
  feedback: EvaluationFeedback;
  retryRecommended: boolean;
  evaluatedAt: number;
  evaluationStrategy: string;
  evidence: PerformanceEvidence;
}

export interface ActivityAttempt {
  attemptNumber: number;
  response: string;
  evaluation: EvaluationResult;
  timestamp: number;
}

export interface ActivityResult {
  activityId: string;
  exerciseId: string;
  attempts: ActivityAttempt[];
  finalEvaluation: EvaluationResult;
  hintsUsed: number;
  completed: boolean;
  timeSpentSeconds: number;
  evidence: PerformanceEvidence;
}

export type AssetStateStatus = 'new' | 'developing' | 'strong';
export type AssetType = 'vocabulary' | 'phrase' | 'grammar_pattern' | 'comprehension';

export interface AssetState {
  id: string;
  term: string;
  assetType: AssetType;
  status: AssetStateStatus;
  exposureCount: number;
  successfulAttempts: number;
  failedAttempts: number;
  consecutiveSuccesses: number;
  consecutiveErrors?: number;
  assistedAttempts: number;
  lastPracticedAt: number;
  lastPerformance: 'correct' | 'incorrect' | 'assisted';
  confidence: number; // 0.0 to 1.0
  sourcesEncountered: string[];
}

export type SkillType = 'vocabulary' | 'grammar' | 'comprehension' | 'speaking';

export interface SkillState {
  skill: SkillType;
  recentPerformance: 'strong' | 'developing' | 'exploring';
  totalAttempts: number;
  correctAttempts: number;
  successRate: number; // 0-100%
  trend: 'improving' | 'steady' | 'struggling';
  lastPracticedAt: number;
  updatedAt: number;
}

export interface LearningState {
  learnerId: string;
  assetStates: Record<string, AssetState>; // keyed by normalized term
  skillStates: Record<SkillType, SkillState>;
  totalSessionsCompleted: number;
  lastSessionAt?: number;
  updatedAt: number;
}

export interface AssetStateUpdateResult {
  term: string;
  assetType: AssetType;
  previousStatus: AssetStateStatus;
  newStatus: AssetStateStatus;
  performance: 'correct' | 'incorrect' | 'assisted';
  consecutiveSuccesses: number;
  exposureCount: number;
}

export interface Exercise {
  id: string;
  type: ExerciseType;
  instruction: string;
  prompt: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  audioText?: string;
  highlightText?: string;
  grammarInsight?: string;
  targetAssetTerm?: string;
  targetAssetType?: AssetType;
  isReviewItem?: boolean;
}

export interface SessionActivity {
  id: string;
  stage: PedagogicalStage;
  stageLabel: string;
  pedagogicalIntent: string;
  objectiveRef?: string;
  exercise: Exercise;
  isReviewItem?: boolean;
  targetAssetTerm?: string;
  selectionReason?: string; // Transparent explainability for adaptive planning decisions
}

export interface SessionPlan {
  id: string;
  learnerId?: string;
  sourceId?: string; // Optional: supports both source-based and standalone AI lessons
  sourceTitle?: string;
  durationMinutes: number; // e.g. 3, 5, 10, 15, 20 minutes
  objective: SessionObjective;
  startingPointContext: string;
  activities: SessionActivity[];
  targetOutcomes: string[];
  createdAt: number;
  legacyActivities?: SessionPlanActivity[];
}

// ---------------------------------------------------------------------------
// Learner Profile & Multilingual Onboarding Data Models
// ---------------------------------------------------------------------------

export type InterfaceLanguage = 'en' | 'fa';
export type LearningLanguage = 'en';
export type SupportLanguage = 'en' | 'fa';

export type LevelSource = 'self_assessed' | 'placement_test';

export type DifficultyPreference = 'easy' | 'balanced' | 'challenging';

export type LanguageSupportPreference =
  | 'mostly_english'
  | 'occasional_translation'
  | 'native_language_explanations'
  | 'translate_when_stuck';

export type GrammarPreference =
  | 'implicit'
  | 'repeated_mistakes'
  | 'on_demand'
  | 'regular';

export interface UserProfile {
  interfaceLanguage: InterfaceLanguage;
  learningLanguage: LearningLanguage;
  supportLanguage: SupportLanguage;
  level: EnglishLevel | 'unknown';
  levelSource: LevelSource;
  goals: string[]; // Structured IDs
  challenges: string[]; // Structured IDs
  interests: string[]; // Structured IDs
  customInterests: string[]; // Freeform custom interest strings
  skillPriorities: string[]; // Structured IDs
  contentPreferences: string[]; // Structured IDs
  difficultyPreference: DifficultyPreference;
  languageSupportPreference: LanguageSupportPreference;
  grammarPreference: GrammarPreference;
  onboardingCompleted: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface OnboardingDraft {
  step: number;
  level: EnglishLevel | 'unknown' | null;
  goals: string[];
  challenges: string[];
  interests: string[];
  customInterests: string[];
  skillPriorities: string[];
  contentPreferences: string[];
  difficultyPreference: DifficultyPreference | null;
  languageSupportPreference: LanguageSupportPreference | null;
  grammarPreference: GrammarPreference | null;
}

export interface SessionConfig {
  sourceId?: string;
  durationMinutes: number; // 3, 5, 10, 15, 20
  userLevel?: EnglishLevel;
}

export interface SessionResultItem {
  activityId: string;
  exerciseId: string;
  stage: PedagogicalStage;
  stageLabel: string;
  pedagogicalIntent: string;
  exercise: Exercise;
  userAnswer: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  grammarRequested: boolean;
  targetAssetTerm?: string;
  isReviewItem?: boolean;
  activityResult?: ActivityResult;
  evidence?: PerformanceEvidence;
}

export interface ObjectiveAchievementAssessment {
  level: MasteryLevel; // 'exploring' | 'developing' | 'mastered'
  scorePercent: number;
  summary: string;
  strongAreas: string[];
  focusAreas: string[];
  recommendedNextStep: string;
}

export interface StagePerformanceMetrics {
  stage: PedagogicalStage;
  label: string;
  total: number;
  completed: number;
  correct: number;
  timeSpentSeconds: number;
}

export interface SessionState {
  plan: SessionPlan;
  config: SessionConfig;
  learnerId?: string;
  currentActivityIndex: number;
  startTime: number;
  endTime?: number;
  status: SessionStatus;
  answers: Record<string, string>;
  scores: Record<string, boolean>;
  grammarRequested: Record<string, boolean>;
  timeSpentPerActivity: Record<string, number>;
  objectiveAchievement?: ObjectiveAchievementAssessment;
  activityResults?: Record<string, ActivityResult>;
  currentAttempts?: Record<string, ActivityAttempt[]>;
  hintsUsedPerActivity?: Record<string, number>;
  // Compatibility fields
  exercises: Exercise[];
  currentIndex: number;
  timeSpentPerExercise: Record<string, number>;
}

export interface SessionSummary {
  id: string;
  learnerId?: string;
  sourceId?: string;
  sourceTitle: string;
  durationMinutes: number;
  actualDurationSeconds: number;
  objective: SessionObjective;
  objectiveAchievement: ObjectiveAchievementAssessment;
  stageMetrics: StagePerformanceMetrics[];
  totalExercises: number;
  correctExercises: number;
  unassistedCorrectCount?: number;
  recoveredCount?: number;
  completedAt: number;
  items: SessionResultItem[];
  learningStateUpdates?: AssetStateUpdateResult[];
}

// ---------------------------------------------------------------------------
// AI Provider & Source Analysis Output Interfaces
// ---------------------------------------------------------------------------

export interface SourceAnalysisInput {
  title: string;
  content: string;
  userLevel?: EnglishLevel;
  userProfile?: UserProfile | null;
}

export type SourceAnalysisResult = SourceAnalysis;

export interface OllamaConfig {
  baseUrl: string;
  model: string;
}

// ---------------------------------------------------------------------------
// Next Learning Decision Domain Model (Phase 7)
// ---------------------------------------------------------------------------

export type NextLearningDecisionType =
  | 'RESUME_SESSION'
  | 'REVIEW_DEVELOPING'
  | 'CONTINUE_SOURCE'
  | 'START_NEW_SESSION'
  | 'ADD_SOURCE';

export interface NextLearningDecision {
  type: NextLearningDecisionType;
  title: string;
  subtitle: string;
  reason: string;
  badge: string;
  primaryActionLabel: string;
  secondaryActionLabel?: string;
  recommendedSource?: Source;
  targetItems?: string[];
  activeSession?: ActiveSessionRecord;
  recommendedDurationMinutes: number;
  availableDurations: number[];
  priorityRank: number;
}
