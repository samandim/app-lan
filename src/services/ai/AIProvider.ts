import {
  SourceAnalysisInput,
  SourceAnalysisResult,
  Source,
  Exercise,
  ExerciseType,
  EnglishLevel,
  UserProfile,
  EvaluationStatus,
  FeedbackType,
  AssetType
} from '../../types';

export interface EvaluationContext {
  exerciseType: ExerciseType;
  prompt: string;
  instruction: string;
  expectedAnswer?: string;
  targetAssetTerm?: string;
  targetAssetType?: AssetType;
  userLevel?: EnglishLevel;
  userProfile?: UserProfile | null;
  previousAttempts?: { attemptNumber: number; response: string }[];
  hintProvided?: boolean;
  objectiveContext?: string;
}

export interface AIEvaluationResponse {
  status: EvaluationStatus;
  taskCompleted: boolean;
  isCorrect: boolean;
  targetVocabularyUsed?: boolean;
  targetMeaningCorrect?: boolean;
  grammarStatus?: 'acceptable' | 'minor_issue' | 'major_issue';
  grammarIssues?: string[];
  meaningPreserved?: boolean;
  naturalness?: 'natural' | 'acceptable' | 'unnatural';
  clarity?: 'clear' | 'partially_clear' | 'unclear';
  feedback: {
    type: FeedbackType;
    message: string;
    suggestedCorrection?: string;
    explanation?: string;
    retryPrompt?: string;
  };
  retryRecommended: boolean;
}

/**
 * Common abstraction for all AI Providers in the application.
 * The application core depends exclusively on this interface rather than
 * concrete implementations like Ollama directly.
 */
export interface AIProvider {
  /** Identifier name of the provider (e.g. 'ollama', 'heuristic-fallback') */
  readonly name: string;

  /**
   * Performs deep contextual analysis of a learning source material.
   * Extracts topics, vocabulary, expressions, grammar patterns, comprehension questions, and speaking prompts.
   */
  analyzeSource(input: SourceAnalysisInput): Promise<SourceAnalysisResult>;

  /**
   * Generates time-adaptive learning drills from a source.
   */
  generateExercises(source: Source, count: number, userLevel?: EnglishLevel): Promise<Exercise[]>;

  /**
   * Evaluates an open-ended learner response (free text production, grammar correction, or speaking transcript proxy).
   * Generates educational feedback and retry recommendations.
   */
  evaluateResponse?(context: EvaluationContext, response: string): Promise<AIEvaluationResponse>;

  /**
   * Optional health check to verify endpoint connectivity and retrieve available local models.
   */
  checkHealth?(): Promise<{ ok: boolean; message: string; availableModels?: string[] }>;
}

