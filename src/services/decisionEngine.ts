import {
  Learner,
  UserProfile,
  Source,
  ActiveSessionRecord,
  LearningState,
  SessionSummary,
  NextLearningDecision,
  AssetState
} from '../types';
import { LearningStateManager } from './learningState';
import { LocalRepository } from './store';

export interface DecisionContext {
  learner?: Learner | null;
  userProfile?: UserProfile | null;
  sources?: Source[];
  activeSession?: ActiveSessionRecord | null;
  learningState?: LearningState;
  sessionHistory?: SessionSummary[];
  preferredDuration?: number;
}

export class NextLearningDecisionEngine {
  /**
   * Evaluates current learner state, active sessions, developing assets,
   * sources, and history to produce a deterministic next learning decision.
   */
  public static decide(context?: DecisionContext): NextLearningDecision {
    const learner = context?.learner !== undefined ? context.learner : LocalRepository.getLearner();
    const userProfile = context?.userProfile !== undefined ? context.userProfile : (learner?.profile || LocalRepository.getUserProfile());
    const learnerId = learner?.id;
    const sources = context?.sources !== undefined ? context.sources : LocalRepository.getSources(learnerId);
    const activeSession = context?.activeSession !== undefined
      ? context.activeSession
      : LocalRepository.getActiveSession(learnerId);
    const learningState = context?.learningState !== undefined
      ? context.learningState
      : LocalRepository.getLearningState(learnerId);
    const sessionHistory = context?.sessionHistory !== undefined
      ? context.sessionHistory
      : LocalRepository.getSessionHistory(learnerId);

    const availableDurations = [3, 5, 10, 15, 20];
    const defaultDuration = context?.preferredDuration || 5;

    // -------------------------------------------------------------------------
    // PRIORITY 1: Active Interrupted Session
    // -------------------------------------------------------------------------
    if (activeSession && activeSession.sessionState && activeSession.sessionState.status === 'in_progress') {
      const plan = activeSession.sessionState.plan;
      const currentIdx = (activeSession.sessionState.currentActivityIndex ?? activeSession.sessionState.currentIndex ?? 0) + 1;
      const totalActivities = plan?.activities?.length || activeSession.sessionState.exercises?.length || 1;

      return {
        type: 'RESUME_SESSION',
        priorityRank: 1,
        title: plan?.sourceTitle || activeSession.sourceTitle || 'Unfinished Session',
        subtitle: `Activity ${currentIdx} of ${totalActivities} • ${plan?.objective?.title || 'In-Progress Practice'}`,
        reason: 'You have an unfinished practice session. Pick up right where you left off without losing continuity.',
        badge: 'In Progress',
        primaryActionLabel: 'Resume Session',
        secondaryActionLabel: 'Discard',
        recommendedSource: sources.find(s => s.id === activeSession.sourceId),
        activeSession,
        recommendedDurationMinutes: plan?.durationMinutes || 5,
        availableDurations
      };
    }

    // -------------------------------------------------------------------------
    // PRIORITY 2: Meaningful Developing Learning Assets
    // -------------------------------------------------------------------------
    const developingAssets = this.getPrioritizedDevelopingAssets(learningState);
    if (developingAssets.length > 0) {
      const topTargetTerms = developingAssets.slice(0, 4).map(a => a.term);

      // Find the source that contains the most of these developing items
      let matchedSource: Source | undefined;
      let maxMatchCount = 0;

      for (const src of sources) {
        const cat = LearningStateManager.categorizeSourceAssets(src);
        const matchCount = cat.developing.filter(d => topTargetTerms.includes(d.toLowerCase())).length;
        if (matchCount > maxMatchCount) {
          maxMatchCount = matchCount;
          matchedSource = src;
        }
      }

      // If no source specifically contains them, pick the most recent source
      if (!matchedSource && sources.length > 0) {
        matchedSource = sources[0];
      }

      const highlightedTerms = topTargetTerms.slice(0, 2).map(t => `"${t}"`).join(' & ');
      const termsList = topTargetTerms.slice(0, 3).join(', ');

      return {
        type: 'REVIEW_DEVELOPING',
        priorityRank: 2,
        title: topTargetTerms.length === 1
          ? `Reinforce "${topTargetTerms[0]}"`
          : `Reinforce ${highlightedTerms}`,
        subtitle: `${developingAssets.length} developing ${developingAssets.length === 1 ? 'item' : 'items'} ready for spaced reinforcement`,
        reason: `Targeted review: Solidify ${termsList} through contextual recall and spoken production.`,
        badge: 'Review Recommended',
        primaryActionLabel: 'Practice Review Items',
        secondaryActionLabel: 'Choose Duration',
        recommendedSource: matchedSource,
        targetItems: topTargetTerms,
        recommendedDurationMinutes: 5,
        availableDurations
      };
    }

    // -------------------------------------------------------------------------
    // PRIORITY 3: Continue Unfinished or Recently Active Source
    // -------------------------------------------------------------------------
    if (sources.length > 0 && sessionHistory.length > 0) {
      const recentSession = sessionHistory[0];
      const recentSourceId = recentSession?.sourceId;
      const recentSource = sources.find(s => s.id === recentSourceId);

      if (recentSource) {
        const cat = LearningStateManager.categorizeSourceAssets(recentSource);
        if (cat.newItems.length > 0 || cat.developing.length > 0) {
          const newTermsPreview = cat.newItems.slice(0, 2).map(t => `"${t}"`).join(', ');
          return {
            type: 'CONTINUE_SOURCE',
            priorityRank: 3,
            title: `Continue "${recentSource.title}"`,
            subtitle: cat.newItems.length > 0
              ? `${cat.newItems.length} new words available for acquisition`
              : 'Consolidate expressive cadence and mastery',
            reason: cat.newItems.length > 0
              ? `Continue exploring "${recentSource.title}" to acquire ${newTermsPreview}.`
              : `Continue from your recent reading to strengthen retention.`,
            badge: 'Continue Material',
            primaryActionLabel: 'Continue Learning',
            secondaryActionLabel: 'Choose Duration',
            recommendedSource: recentSource,
            targetItems: cat.newItems.slice(0, 3),
            recommendedDurationMinutes: recentSession.durationMinutes || defaultDuration,
            availableDurations
          };
        }
      }
    }

    // -------------------------------------------------------------------------
    // PRIORITY 4: Start New Practice Session with Best Matching Source
    // -------------------------------------------------------------------------
    if (sources.length > 0) {
      const recommendedSource = this.selectBestSourceForLearner(sources, userProfile, sessionHistory);
      const cat = LearningStateManager.categorizeSourceAssets(recommendedSource);

      return {
        type: 'START_NEW_SESSION',
        priorityRank: 4,
        title: `Practice from "${recommendedSource.title}"`,
        subtitle: `${recommendedSource.wordCount} words • ${recommendedSource.analysis?.estimatedLevel || userProfile?.level || 'B1'}`,
        reason: 'Start a focused multi-skill practice session adapted to your available time window.',
        badge: 'Recommended',
        primaryActionLabel: 'Start Practice Session',
        secondaryActionLabel: 'Choose Duration',
        recommendedSource,
        targetItems: cat.newItems.slice(0, 3),
        recommendedDurationMinutes: defaultDuration,
        availableDurations
      };
    }

    // -------------------------------------------------------------------------
    // PRIORITY 5: No Sources Available -> Prompt Adding Source
    // -------------------------------------------------------------------------
    return {
      type: 'ADD_SOURCE',
      priorityRank: 5,
      title: 'Add Your First Reading Material',
      subtitle: 'Paste any article, email, excerpt, or notes you are currently reading',
      reason: 'The adaptive engine generates customized practice directly from texts you want to understand.',
      badge: 'First Step',
      primaryActionLabel: 'Add Custom Source',
      recommendedDurationMinutes: 5,
      availableDurations
    };
  }

  /**
   * Filters and prioritizes developing assets by urgency (failures, consecutive errors, decay).
   */
  public static getPrioritizedDevelopingAssets(state: LearningState): AssetState[] {
    const assets = Object.values(state.assetStates || {});
    const developing = assets.filter(a => {
      if (a.status === 'developing') return true;
      if (a.lastPerformance === 'incorrect') return true;
      if ((a.consecutiveErrors || 0) > 0) return true;
      if (a.status === 'new' && a.exposureCount > 0 && a.successfulAttempts === 0) return true;
      return false;
    });

    return developing.sort((a, b) => {
      const errorScoreA = (a.consecutiveErrors || 0) * 2 + (a.failedAttempts || 0);
      const errorScoreB = (b.consecutiveErrors || 0) * 2 + (b.failedAttempts || 0);
      if (errorScoreB !== errorScoreA) {
        return errorScoreB - errorScoreA;
      }
      return (a.lastPracticedAt || 0) - (b.lastPracticedAt || 0);
    });
  }

  /**
   * Selects the best source matching learner level, goals, or freshness.
   */
  private static selectBestSourceForLearner(
    sources: Source[],
    profile: UserProfile | null,
    history: SessionSummary[]
  ): Source {
    if (sources.length === 1) return sources[0];

    const practicedSourceIds = new Set(history.map(h => h.sourceId).filter(Boolean));

    // Prefer unpracticed sources first
    const unpracticed = sources.filter(s => !practicedSourceIds.has(s.id));
    if (unpracticed.length > 0) {
      if (profile?.interests && profile.interests.length > 0) {
        const matched = unpracticed.find(s => {
          const text = `${s.title} ${s.content} ${(s.tags || []).join(' ')}`.toLowerCase();
          return profile.interests.some(interest => text.includes(interest.toLowerCase()));
        });
        if (matched) return matched;
      }
      return unpracticed[0];
    }

    // Otherwise find the least recently practiced source
    for (let i = history.length - 1; i >= 0; i--) {
      const srcId = history[i].sourceId;
      const found = sources.find(s => s.id === srcId);
      if (found) return found;
    }

    return sources[0];
  }
}
