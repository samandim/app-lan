import {
  LearningState,
  AssetState,
  SkillState,
  SkillType,
  AssetType,
  AssetStateStatus,
  AssetStateUpdateResult,
  SessionSummary,
  SessionResultItem,
  Source
} from '../types';
import { LocalRepository } from './store';

export class LearningStateManager {
  public static normalizeTerm(term: string): string {
    return term
      .toLowerCase()
      .trim()
      .replace(/^[^\w\s]+|[^\w\s]+$/g, '');
  }

  public static getInitialSkillStates(): Record<SkillType, SkillState> {
    const now = Date.now();
    return {
      vocabulary: {
        skill: 'vocabulary',
        recentPerformance: 'exploring',
        totalAttempts: 0,
        correctAttempts: 0,
        successRate: 0,
        trend: 'steady',
        lastPracticedAt: 0,
        updatedAt: now
      },
      grammar: {
        skill: 'grammar',
        recentPerformance: 'exploring',
        totalAttempts: 0,
        correctAttempts: 0,
        successRate: 0,
        trend: 'steady',
        lastPracticedAt: 0,
        updatedAt: now
      },
      comprehension: {
        skill: 'comprehension',
        recentPerformance: 'exploring',
        totalAttempts: 0,
        correctAttempts: 0,
        successRate: 0,
        trend: 'steady',
        lastPracticedAt: 0,
        updatedAt: now
      },
      speaking: {
        skill: 'speaking',
        recentPerformance: 'exploring',
        totalAttempts: 0,
        correctAttempts: 0,
        successRate: 0,
        trend: 'steady',
        lastPracticedAt: 0,
        updatedAt: now
      }
    };
  }

  public static getInitialLearningState(learnerId?: string): LearningState {
    const currentLearnerId = learnerId || LocalRepository.getLearner()?.id || 'learner_default';
    return {
      learnerId: currentLearnerId,
      assetStates: {},
      skillStates: this.getInitialSkillStates(),
      totalSessionsCompleted: 0,
      updatedAt: Date.now()
    };
  }

  public static getLearningState(learnerId?: string): LearningState {
    return LocalRepository.getLearningState(learnerId);
  }

  public static saveLearningState(state: LearningState): void {
    LocalRepository.saveLearningState(state);
  }

  public static resetLearningState(): void {
    LocalRepository.resetLearningState();
  }

  public static getAssetState(term: string, stateOverride?: LearningState | null): AssetState | undefined {
    const key = this.normalizeTerm(term);
    const state = stateOverride || this.getLearningState();
    return state.assetStates[key];
  }

  /**
   * Identifies developing or weak assets that are high-priority candidates for review.
   */
  public static getDevelopingAssets(stateOverride?: LearningState | null): AssetState[] {
    const state = stateOverride || this.getLearningState();
    return Object.values(state.assetStates).filter(
      a => a.status === 'developing' || a.lastPerformance === 'incorrect' || (a.status === 'new' && a.exposureCount > 0)
    );
  }

  /**
   * Identifies strong assets for maintenance or passive exposure.
   */
  public static getStrongAssets(stateOverride?: LearningState | null): AssetState[] {
    const state = stateOverride || this.getLearningState();
    return Object.values(state.assetStates).filter(a => a.status === 'strong');
  }

  /**
   * Analyzes a source's vocabulary and phrases against existing Learning State,
   * categorizing them into developing (review), new (unpracticed), and strong.
   */
  public static categorizeSourceAssets(source: Source, stateOverride?: LearningState | null): {
    developing: string[];
    newItems: string[];
    strong: string[];
  } {
    const state = stateOverride || this.getLearningState();
    const developing: string[] = [];
    const newItems: string[] = [];
    const strong: string[] = [];

    const sourceWords: string[] = [];
    if (source.analysis?.vocabulary) {
      source.analysis.vocabulary.forEach(v => sourceWords.push(v.word));
    }
    if (sourceWords.length === 0 && source.content) {
      const stopWords = new Set(['the', 'and', 'with', 'from', 'this', 'that', 'have', 'were', 'been']);
      const extracted = source.content
        .replace(/[^a-zA-Z\s]/g, ' ')
        .split(/\s+/)
        .map(w => w.toLowerCase().trim())
        .filter(w => w.length >= 4 && !stopWords.has(w));
      sourceWords.push(...Array.from(new Set(extracted)).slice(0, 8));
    }

    sourceWords.forEach(word => {
      const key = this.normalizeTerm(word);
      const asset = state.assetStates[key];
      if (!asset || asset.exposureCount === 0 || asset.status === 'new') {
        newItems.push(word);
      } else if (asset.status === 'strong') {
        strong.push(word);
      } else {
        developing.push(word);
      }
    });

    return { developing, newItems, strong };
  }

  /**
   * Recommends scaffolding level for an asset based on historical failure density.
   */
  public static getScaffoldingRecommendation(term: string, stateOverride?: LearningState | null): 'none' | 'contextual_support' | 'guided_options' {
    const asset = this.getAssetState(term, stateOverride);
    if (!asset) return 'none';
    if ((asset.consecutiveErrors || 0) >= 2 || asset.failedAttempts >= 3) {
      return 'guided_options';
    }
    if ((asset.consecutiveErrors || 0) >= 1 || (asset.failedAttempts >= 1 && asset.consecutiveSuccesses === 0)) {
      return 'contextual_support';
    }
    return 'none';
  }

  /**
   * Deterministically processes a completed session summary and updates the Learning State.
   * Produces an audit list of AssetStateUpdateResult changes.
   */
  public static recordSessionResult(summary: SessionSummary): {
    updatedState: LearningState;
    changes: AssetStateUpdateResult[];
  } {
    const state = this.getLearningState();
    const now = Date.now();
    const changes: AssetStateUpdateResult[] = [];

    // Track skill performances in this session
    const sessionSkillMetrics: Record<SkillType, { attempts: number; correct: number }> = {
      vocabulary: { attempts: 0, correct: 0 },
      grammar: { attempts: 0, correct: 0 },
      comprehension: { attempts: 0, correct: 0 },
      speaking: { attempts: 0, correct: 0 }
    };

    summary.items.forEach((item: SessionResultItem) => {
      const ex = item.exercise;

      // Determine Skill Type
      let skill: SkillType = 'vocabulary';
      if (ex.type === 'implicit_grammar' || ex.type === 'explicit_grammar_tip') {
        skill = 'grammar';
      } else if (ex.type === 'listening_comprehension' || ex.type === 'checkpoint_verify') {
        skill = 'comprehension';
      } else if (ex.type === 'speaking_shadowing') {
        skill = 'speaking';
      } else {
        skill = 'vocabulary';
      }

      sessionSkillMetrics[skill].attempts += 1;
      if (item.isCorrect) {
        sessionSkillMetrics[skill].correct += 1;
      }

      // Determine Target Asset Term
      let targetTerm = item.targetAssetTerm || ex.targetAssetTerm || ex.highlightText;
      let assetType: AssetType = item.exercise.targetAssetType || (skill === 'grammar' ? 'grammar_pattern' : 'vocabulary');

      if (!targetTerm && ex.type === 'vocabulary_retrieval') {
        // Extract quoted target from prompt if any
        const match = ex.prompt.match(/"([^"]+)"/);
        if (match && match[1] && match[1].length < 30) {
          targetTerm = match[1];
        }
      }

      if (!targetTerm && ex.correctAnswer && ex.correctAnswer.length < 30) {
        targetTerm = ex.correctAnswer;
      }

      if (!targetTerm) {
        // If still none, skip asset-level tracking for this exercise
        return;
      }

      const key = this.normalizeTerm(targetTerm);
      if (!key || key.length === 0) return;

      const existing: AssetState = state.assetStates[key] || {
        id: key,
        term: targetTerm,
        assetType,
        status: 'new',
        exposureCount: 0,
        successfulAttempts: 0,
        failedAttempts: 0,
        consecutiveSuccesses: 0,
        consecutiveErrors: 0,
        assistedAttempts: 0,
        lastPracticedAt: 0,
        lastPerformance: 'correct',
        confidence: 0,
        sourcesEncountered: []
      };

      const previousStatus = existing.status;

      // Classify performance leveraging rich PerformanceEvidence from Phase 5
      const unassisted = item.evidence?.unassistedSuccess ?? (item.isCorrect && !item.grammarRequested);
      const recovered = item.evidence?.recoveredAfterFeedback ?? false;
      const hintsUsed = (item.evidence?.hintsUsedCount ?? 0) > 0 || item.grammarRequested;

      let performance: 'correct' | 'incorrect' | 'assisted' = 'correct';
      if (!item.isCorrect) {
        performance = 'incorrect';
      } else if (recovered || hintsUsed || !unassisted) {
        performance = 'assisted';
      } else {
        performance = 'correct';
      }

      // Apply deterministic counter rules
      const newExposure = existing.exposureCount + 1;
      let newSuccessful = existing.successfulAttempts;
      let newFailed = existing.failedAttempts;
      let newAssisted = existing.assistedAttempts;
      let newConsecutiveSuccesses = existing.consecutiveSuccesses;
      let newConsecutiveErrors = existing.consecutiveErrors || 0;

      if (performance === 'correct') {
        newSuccessful += 1;
        newConsecutiveSuccesses += 1;
        newConsecutiveErrors = 0;
      } else if (performance === 'assisted') {
        newSuccessful += 1;
        newAssisted += 1;
        // Assisted recovery preserves momentum without artificial jump
        newConsecutiveSuccesses = Math.max(1, newConsecutiveSuccesses);
        newConsecutiveErrors = 0;
      } else {
        newFailed += 1;
        newConsecutiveSuccesses = 0;
        newConsecutiveErrors += 1;
      }

      // Calculate new status deterministically
      // Mastery calibration: Requires >= 3 exposures, >= 3 consecutive unassisted successes, and >= 75% success rate
      let newStatus: AssetStateStatus = 'developing';
      const successRate = newSuccessful / Math.max(1, newExposure);

      if (
        newExposure >= 3 &&
        newConsecutiveSuccesses >= 3 &&
        successRate >= 0.75 &&
        performance === 'correct'
      ) {
        newStatus = 'strong';
      } else if (previousStatus === 'strong' && performance !== 'incorrect' && successRate >= 0.7) {
        newStatus = 'strong'; // Maintain strong status under assisted practice
      } else if (newExposure >= 1) {
        newStatus = 'developing';
      } else {
        newStatus = 'new';
      }

      // Calibrated Confidence score (0.0 to 1.0)
      const confidence = Math.min(
        1.0,
        Math.max(
          0.1,
          Number((successRate * 0.65 + (newConsecutiveSuccesses >= 3 ? 0.35 : newConsecutiveSuccesses * 0.1)).toFixed(2))
        )
      );

      const sources = new Set(existing.sourcesEncountered);
      if (summary.sourceId) {
        sources.add(summary.sourceId);
      }

      const updatedAsset: AssetState = {
        ...existing,
        term: targetTerm,
        assetType,
        status: newStatus,
        exposureCount: newExposure,
        successfulAttempts: newSuccessful,
        failedAttempts: newFailed,
        assistedAttempts: newAssisted,
        consecutiveSuccesses: newConsecutiveSuccesses,
        consecutiveErrors: newConsecutiveErrors,
        lastPracticedAt: now,
        lastPerformance: performance,
        confidence,
        sourcesEncountered: Array.from(sources)
      };

      state.assetStates[key] = updatedAsset;

      changes.push({
        term: targetTerm,
        assetType,
        previousStatus,
        newStatus,
        performance,
        consecutiveSuccesses: newConsecutiveSuccesses,
        exposureCount: newExposure
      });
    });

    // Update Skill States deterministically
    (Object.keys(sessionSkillMetrics) as SkillType[]).forEach((skill) => {
      const sessionM = sessionSkillMetrics[skill];
      const existingSkill = state.skillStates[skill] || this.getInitialSkillStates()[skill];

      if (sessionM.attempts > 0) {
        const totalAttempts = existingSkill.totalAttempts + sessionM.attempts;
        const correctAttempts = existingSkill.correctAttempts + sessionM.correct;
        const overallRate = Math.round((correctAttempts / totalAttempts) * 100);
        const sessionRate = Math.round((sessionM.correct / sessionM.attempts) * 100);

        let trend: 'improving' | 'steady' | 'struggling' = existingSkill.trend;
        if (sessionRate > (existingSkill.successRate || 50) + 10) {
          trend = 'improving';
        } else if (sessionRate < (existingSkill.successRate || 50) - 15) {
          trend = 'struggling';
        } else {
          trend = 'steady';
        }

        let recentPerformance: 'strong' | 'developing' | 'exploring' = 'developing';
        if (overallRate >= 80) {
          recentPerformance = 'strong';
        } else if (overallRate >= 50) {
          recentPerformance = 'developing';
        } else {
          recentPerformance = 'exploring';
        }

        state.skillStates[skill] = {
          skill,
          recentPerformance,
          totalAttempts,
          correctAttempts,
          successRate: overallRate,
          trend,
          lastPracticedAt: now,
          updatedAt: now
        };
      }
    });

    state.totalSessionsCompleted += 1;
    state.lastSessionAt = now;
    state.updatedAt = now;

    this.saveLearningState(state);

    return { updatedState: state, changes };
  }
}
