import {
  Source,
  Exercise,
  ExerciseType,
  SessionConfig,
  SessionPlan,
  SessionActivity,
  SessionObjective,
  SessionState,
  SessionSummary,
  SessionResultItem,
  PedagogicalStage,
  MasteryLevel,
  ObjectiveAchievementAssessment,
  StagePerformanceMetrics,
  UserProfile,
  EnglishLevel,
  LearningState
} from '../types';
import { AIService } from './ai';
import { LearningStateManager } from './learningState';
import { LocalRepository } from './store';

export interface DurationMeta {
  duration: number;
  label: string;
  badge: string;
  exerciseCount: number;
  description: string;
  stages: { stage: PedagogicalStage; label: string; intent: string }[];
  focusBreakdown: string[];
}

export class SessionEngine {
  public static readonly AVAILABLE_DURATIONS: DurationMeta[] = [
    {
      duration: 3,
      label: 'Micro Drill',
      badge: 'Rapid Cycle',
      exerciseCount: 2,
      description: 'Quick active cycle focusing on high-impact lexical notice and retrieval.',
      stages: [
        { stage: 'notice_input', label: 'Context Notice', intent: 'Encounter key concept in authentic sentence context' },
        { stage: 'active_retrieval', label: 'Implicit Flow', intent: 'Active recall and syntactic flow calibration' }
      ],
      focusBreakdown: ['1x Core Lexical Notice & Retrieval', '1x Implicit Sentence Reconstruction']
    },
    {
      duration: 5,
      label: 'Focused Learning Unit',
      badge: 'Balanced Journey',
      exerciseCount: 4,
      description: 'Complete, self-contained learning unit from notice to active production.',
      stages: [
        { stage: 'notice_input', label: 'Lexical Notice', intent: 'Target vocabulary identification in natural text' },
        { stage: 'guided_practice', label: 'Aural Decoding', intent: 'Phonemic listening cloze in sentence stream' },
        { stage: 'active_retrieval', label: 'Syntax Harmony', intent: 'Implicit structural error detection and correction' },
        { stage: 'production', label: 'Shadowing Cadence', intent: 'Active spoken articulation and speech rhythm' }
      ],
      focusBreakdown: ['1x Vocabulary Retrieval', '1x Aural Decoding', '1x Implicit Syntax Drill', '1x Shadowing & Cadence']
    },
    {
      duration: 10,
      label: 'Deep Learning Unit',
      badge: 'High Yield Journey',
      exerciseCount: 6,
      description: 'Pedagogical arc with structured scaffolding, retrieval practice, and synthesis.',
      stages: [
        { stage: 'notice_input', label: 'Contextual Framing', intent: 'Deep attention to target term and usage context' },
        { stage: 'guided_practice', label: 'Lexical Mapping', intent: 'Collocation mapping and meaning verification' },
        { stage: 'active_retrieval', label: 'Grammar Calibration', intent: 'Implicit subject-verb and prepositional harmony' },
        { stage: 'active_retrieval', label: 'Listening Cloze', intent: 'Connected speech perception without visual cues' },
        { stage: 'production', label: 'Speech Shadowing', intent: 'Articulatory motor training and breath pacing' },
        { stage: 'checkpoint', label: 'Mastery Checkpoint', intent: 'Synthesis verification of target objectives' }
      ],
      focusBreakdown: ['2x Lexical Retrieval & Collocations', '2x Implicit Grammar Parsing', '1x Audio Cloze', '1x Spoken Shadowing']
    },
    {
      duration: 15,
      label: 'Immersive Learning Cycle',
      badge: 'Mastery Journey',
      exerciseCount: 8,
      description: 'Multi-stage immersion covering deep comprehension, listening, and expressive synthesis.',
      stages: [
        { stage: 'notice_input', label: 'Lexical Notice 1', intent: 'Anchor term recognition and phrase patterns' },
        { stage: 'notice_input', label: 'Lexical Notice 2', intent: 'Secondary concept mapping in sentence context' },
        { stage: 'guided_practice', label: 'Listening Decoding', intent: 'Fast speech parsing and unstressed vowel recognition' },
        { stage: 'guided_practice', label: 'Syntax Scaffolding', intent: 'Clause connection and structural harmony' },
        { stage: 'active_retrieval', label: 'Unassisted Recall', intent: 'High-friction active retrieval from memory' },
        { stage: 'active_retrieval', label: 'Flow Refinement', intent: 'Implicit correction of tense and agreement mismatches' },
        { stage: 'production', label: 'Shadowing Cadence', intent: 'Expressive oral production matching thought groups' },
        { stage: 'checkpoint', label: 'Transfer Checkpoint', intent: 'Endpoint evaluation of target unit objectives' }
      ],
      focusBreakdown: ['2x Lexical Precision', '2x Implicit Grammar Parsing', '2x Listening Decoding', '2x Speech Shadowing']
    },
    {
      duration: 20,
      label: 'Extensive Learning Unit',
      badge: 'Deep Flow Journey',
      exerciseCount: 10,
      description: 'Comprehensive, holistic unit covering reading depth, phonetics, and active production.',
      stages: [
        { stage: 'notice_input', label: 'Discourse Framing', intent: 'Thematic overview and anchor terminology' },
        { stage: 'notice_input', label: 'Lexical Precision', intent: 'Nuance discrimination of target terms' },
        { stage: 'guided_practice', label: 'Collocation Mapping', intent: 'Natural multi-word combinations' },
        { stage: 'guided_practice', label: 'Aural Parsing', intent: 'Phonemic listening under natural pacing' },
        { stage: 'active_retrieval', label: 'Active Retrieval 1', intent: 'Contextual retrieval without hints' },
        { stage: 'active_retrieval', label: 'Syntax Calibration', intent: 'Grammatical cohesion and clause transitions' },
        { stage: 'active_retrieval', label: 'Listening Cloze 2', intent: 'Advanced audio decoding and orthography' },
        { stage: 'production', label: 'Spoken Shadowing 1', intent: 'Connected speech intonation and linking' },
        { stage: 'production', label: 'Spoken Shadowing 2', intent: 'Rhythmic thought groups and spoken clarity' },
        { stage: 'checkpoint', label: 'Endpoint Mastery', intent: 'Comprehensive assessment of session objectives' }
      ],
      focusBreakdown: ['3x Contextual Lexicon', '3x Flow & Structure Refinement', '2x Aural Perception', '2x Spoken Articulation']
    }
  ];

  public static getMetaForDuration(minutes: number): DurationMeta {
    return (
      this.AVAILABLE_DURATIONS.find(d => d.duration === minutes) || {
        duration: minutes,
        label: `${minutes} Min Learning Unit`,
        badge: 'Custom Journey',
        exerciseCount: Math.max(2, Math.round(minutes * 0.5)),
        description: 'Dynamically structured learning journey for your allotted timeframe.',
        stages: [
          { stage: 'notice_input', label: 'Input Notice', intent: 'Notice target structures' },
          { stage: 'active_retrieval', label: 'Active Retrieval', intent: 'Retrieve and calibrate patterns' }
        ],
        focusBreakdown: ['Multi-skill pedagogical journey tailored to your text']
      }
    );
  }

  public static calculateExerciseCount(minutes: number): number {
    const meta = this.getMetaForDuration(minutes);
    return meta.exerciseCount;
  }

  /**
   * Constructs a complete, self-contained SessionPlan with Starting Point,
   * Pedagogical Objective, Step-by-Step Activities, and Target Outcomes.
   * Adapts dynamically based on the learner's LearningState, goals, skill priorities, and previous performance.
   */
  public static async createSessionPlan(
    source: Source | null,
    durationMinutes: number,
    userProfile?: UserProfile | null,
    learningState?: LearningState | null
  ): Promise<SessionPlan> {
    const meta = this.getMetaForDuration(durationMinutes);
    const effectiveLevel: EnglishLevel =
      (userProfile?.level && userProfile.level !== 'unknown' ? userProfile.level : source?.analysis?.estimatedLevel) ||
      'B1';

    const activeLearningState = learningState || LearningStateManager.getLearningState();

    // 1. Analyze & Categorize Assets against Learning State
    let reviewWords: string[] = [];
    let newWords: string[] = [];
    let strongWords: string[] = [];

    if (source) {
      const categorized = LearningStateManager.categorizeSourceAssets(source, activeLearningState);
      reviewWords = categorized.developing;
      newWords = categorized.newItems;
      strongWords = categorized.strong;
    }

    // Determine review vs new allocation based on session duration
    const maxReviewCount = durationMinutes <= 3
      ? (reviewWords.length > 0 ? 1 : 0)
      : durationMinutes <= 5
      ? Math.min(2, reviewWords.length)
      : Math.min(3, reviewWords.length);

    const selectedReviewWords = reviewWords.slice(0, maxReviewCount);
    const availableNewSlots = Math.max(0, meta.exerciseCount - selectedReviewWords.length);
    const selectedNewWords = newWords.slice(0, availableNewSlots);
    const targetVocab = [...selectedReviewWords, ...selectedNewWords];

    // 2. Goal Alignment & Skill Priority Calibration
    const userGoals = userProfile?.goals || [];
    const isWorkGoal = userGoals.includes('work') || userGoals.includes('career') || userGoals.includes('business');
    const isAcademicGoal = userGoals.includes('academic') || userGoals.includes('study') || userGoals.includes('exam');
    const isTravelGoal = userGoals.includes('travel') || userGoals.includes('relocation');
    const isConversationGoal = userGoals.includes('conversation') || userGoals.includes('fluency');

    const skillPriorities = userProfile?.skillPriorities || [];
    const isSpeakingPriority = skillPriorities.includes('speaking');
    const isGrammarPriority = skillPriorities.includes('grammar');
    const isVocabPriority = skillPriorities.includes('vocabulary');
    const isComprehensionPriority = skillPriorities.includes('comprehension');

    // 3. Formulate Adaptive Session Objective
    const analysis = source?.analysis;
    const targetGrammar = analysis?.grammarPatterns?.[0]?.pattern || 'Natural Syntactic Harmony & Concord';
    const sourceTitle = source?.title || 'Authentic English Text';

    let objectiveTitle = '';
    let objectiveDesc = '';
    let goalContextSuffix = '';

    if (isWorkGoal) {
      goalContextSuffix = ' for confident workplace and professional communication.';
    } else if (isAcademicGoal) {
      goalContextSuffix = ' for structured academic reasoning and analytical clarity.';
    } else if (isTravelGoal) {
      goalContextSuffix = ' for practical situational agility and spontaneous interactions.';
    } else if (isConversationGoal) {
      goalContextSuffix = ' for fluid daily conversational expression.';
    }

    if (selectedReviewWords.length > 0) {
      if (selectedNewWords.length > 0) {
        objectiveTitle = `Reinforce "${selectedReviewWords.join(', ')}" & master new terms ("${selectedNewWords.slice(0, 2).join(', ')}")`;
        objectiveDesc = `Adaptive ${durationMinutes}-minute unit calibrated to your progress: Consolidate developing concepts while acquiring new phrasing from "${sourceTitle}"${goalContextSuffix}`;
      } else {
        objectiveTitle = `Targeted Reinforcement: Solidify "${selectedReviewWords.join(', ')}"`;
        objectiveDesc = `Review-focused ${durationMinutes}-minute unit: Strengthen retrieval speed and contextual precision on developing concepts${goalContextSuffix}`;
      }
    } else if (strongWords.length >= 3 && newWords.length === 0) {
      objectiveTitle = `Mastery & Expressive Cadence from "${sourceTitle}"`;
      objectiveDesc = `Advanced maintenance unit: Deep active recall and connected speech shadowing for previously consolidated material${goalContextSuffix}`;
    } else if (targetVocab.length > 0) {
      objectiveTitle = `Internalize "${targetVocab.slice(0, 3).join(', ')}" and calibrate natural sentence flow`;
      objectiveDesc = `Structured ${durationMinutes}-minute learning journey designed to anchor target vocabulary, calibrate implicit grammatical intuition, and practice active speech production${goalContextSuffix}`;
    } else {
      objectiveTitle = source
        ? `Master foundational comprehension and active production from "${sourceTitle}"`
        : `Master foundational comprehension, implicit grammar, and active spoken production`;
      objectiveDesc = `Complete a structured ${durationMinutes}-minute learning journey designed to anchor contextual patterns and practice active speech production${goalContextSuffix}`;
    }

    const primaryType = isSpeakingPriority
      ? 'speaking'
      : isGrammarPriority
      ? 'grammar'
      : isVocabPriority
      ? 'vocabulary'
      : 'multi_skill';

    const objective: SessionObjective = {
      id: `obj_${Date.now()}`,
      type: primaryType,
      title: objectiveTitle,
      description: objectiveDesc,
      targetItems: [...targetVocab, targetGrammar],
      targetLevel: effectiveLevel
    };

    // 4. Starting Point Context
    let startingPointContext = '';
    if (source) {
      const adaptiveNote = selectedReviewWords.length > 0
        ? ` Includes ${selectedReviewWords.length} review item${selectedReviewWords.length > 1 ? 's' : ''} based on your recent learning progress.`
        : ' Calibrated for exploratory acquisition.';
      const priorityNote = isSpeakingPriority
        ? ' Prioritizing oral articulation & speech shadowing cadence.'
        : isGrammarPriority
        ? ' Prioritizing implicit syntactic concord and error detection.'
        : isVocabPriority
        ? ' Prioritizing active lexical recall and collocation mapping.'
        : '';
      startingPointContext = `Starting from "${source.title}" (${source.wordCount} words, Level ${effectiveLevel}). The engine prepared a ${meta.exerciseCount}-step pedagogical journey moving from contextual noticing to unassisted active retrieval and spoken production.${adaptiveNote}${priorityNote}`;
    } else {
      startingPointContext = `Starting an adaptive standalone learning session calibrated at Level ${effectiveLevel}.`;
    }

    // 5. Generate exercises via AI or Heuristic Fallback
    let exercises: Exercise[] = [];
    if (source) {
      exercises = await AIService.generateExercises(source, meta.exerciseCount, effectiveLevel);
    } else {
      exercises = this.generateStandaloneExercises(meta.exerciseCount, effectiveLevel);
    }

    // 6. Dynamic Scaffolding & Activity Annotation with Explainability
    const activities: SessionActivity[] = exercises.map((exercise, idx) => {
      const isEndpoint = idx === exercises.length - 1 && meta.exerciseCount >= 3;
      const stageConfig = isEndpoint
        ? { stage: 'checkpoint' as PedagogicalStage, label: 'Mastery Checkpoint', intent: 'Synthesize and verify session learning objective' }
        : (meta.stages[idx] || meta.stages[meta.stages.length - 1]);

      // Assign target asset terms to exercise
      let assignedTerm: string | undefined = undefined;
      let isReview = false;

      if (idx < selectedReviewWords.length) {
        assignedTerm = selectedReviewWords[idx];
        isReview = true;
      } else if (idx - selectedReviewWords.length < selectedNewWords.length) {
        assignedTerm = selectedNewWords[idx - selectedReviewWords.length];
        isReview = false;
      }

      if (assignedTerm) {
        exercise.targetAssetTerm = assignedTerm;
        exercise.isReviewItem = isReview;
      }

      // Check scaffolding recommendation for review items
      let scaffoldingLevel: 'none' | 'contextual_support' | 'guided_options' = 'none';
      if (assignedTerm) {
        scaffoldingLevel = LearningStateManager.getScaffoldingRecommendation(assignedTerm, activeLearningState);
        // Only inject guided multiple-choice options for exercise types designed for options
        if (
          scaffoldingLevel === 'guided_options' &&
          (exercise.type === 'vocabulary_retrieval' || exercise.type === 'contextual_notice') &&
          (!exercise.options || exercise.options.length === 0)
        ) {
          // Provide scaffolded multiple choice options for repeated error recovery
          const correct = exercise.correctAnswer || assignedTerm;
          exercise.options = [
            correct,
            `Alternative form with different inflection`,
            `Opposite semantic antonym`,
            `Contextually incorrect distraction`
          ].sort(() => 0.5 - Math.random());
        }
      }

      const stageLabel = isReview
        ? `${stageConfig.label} (Review)`
        : stageConfig.label;

      const pedagogicalIntent = isReview
        ? `Targeted Review: Reinforce developing memory of "${assignedTerm}" through active retrieval`
        : stageConfig.intent;

      // Selection Reason for transparent pedagogical explainability (Prompt Section 41)
      let selectionReason = '';
      if (isEndpoint) {
        selectionReason = `Checkpoint Endpoint: Evaluates mastery of the session primary objective ("${objective.title}")`;
      } else if (isReview) {
        const asset = assignedTerm ? LearningStateManager.getAssetState(assignedTerm, activeLearningState) : undefined;
        const failedCount = asset?.failedAttempts || 0;
        const errNote = failedCount > 0 ? ` with ${failedCount} past error${failedCount > 1 ? 's' : ''}` : '';
        selectionReason = `Adaptive Review: Reinforces developing asset "${assignedTerm}"${errNote} to consolidate neural retention`;
      } else if (assignedTerm) {
        selectionReason = `New Asset Acquisition: Extracted anchor concept "${assignedTerm}" from source material to expand active vocabulary`;
      } else if (isSpeakingPriority) {
        selectionReason = `Skill Priority (Speaking): Oral motor conditioning and cadence alignment`;
      } else if (isGrammarPriority) {
        selectionReason = `Skill Priority (Grammar): Implicit syntactic concord calibration`;
      } else {
        selectionReason = `Pedagogical Arc: ${stageConfig.label} stage designed to transition from noticing to active retention`;
      }

      return {
        id: `act_${idx}_${Date.now()}`,
        stage: stageConfig.stage,
        stageLabel,
        pedagogicalIntent,
        objectiveRef: objective.id,
        exercise,
        isReviewItem: isReview,
        targetAssetTerm: assignedTerm || exercise.targetAssetTerm,
        selectionReason
      };
    });

    // Ensure objective.targetItems strictly reflects the assets actually utilized in this session
    const activityAssetTerms = Array.from(
      new Set(
        activities
          .map(a => a.targetAssetTerm || a.exercise.targetAssetTerm)
          .filter((t): t is string => Boolean(t && t.trim().length > 0))
      )
    );
    if (activityAssetTerms.length > 0) {
      objective.targetItems = activityAssetTerms;
    }

    // 7. Target Outcomes
    const targetOutcomes = [
      selectedReviewWords.length > 0
        ? `Consolidate ${selectedReviewWords.length} developing lexical item${selectedReviewWords.length > 1 ? 's' : ''} ("${selectedReviewWords.join(', ')}") toward permanent mastery`
        : `Anchor key lexical items in long-term memory via contextual retrieval`,
      `Calibrate neural sensitivity to implicit English sentence flow and agreements`,
      `Engage vocal-motor pathways through speech shadowing of authentic sentence rhythms`
    ];

    if (isWorkGoal) {
      targetOutcomes.push('Refine professional register and workplace expression confidence');
    } else if (isAcademicGoal) {
      targetOutcomes.push('Strengthen academic discourse structure and analytical cohesion');
    }

    const currentLearnerId = LocalRepository.getLearner()?.id;

    return {
      id: `plan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      learnerId: currentLearnerId,
      sourceId: source?.id,
      sourceTitle: source?.title,
      durationMinutes,
      objective,
      startingPointContext,
      activities,
      targetOutcomes,
      createdAt: Date.now()
    };
  }

  /**
   * Fallback for standalone sessions (when source is null)
   */
  private static generateStandaloneExercises(count: number, level: EnglishLevel): Exercise[] {
    const standaloneBank: Array<{
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
      targetAssetType?: import('../types').AssetType;
    }> = [
      {
        type: 'vocabulary_retrieval',
        instruction: 'Vocabulary Retrieval & Context Mapping',
        prompt: 'In the sentence below, identify the primary meaning and nuance of the term "endurance":\n\n"Deep focus accelerates linguistic pattern recognition and strengthens cognitive endurance."',
        options: [
          'The capacity to sustain prolonged effort and attention',
          'A sudden loss of concentration under pressure',
          'A temporary feeling of fatigue or boredom',
          'The ability to memorize isolated words quickly'
        ],
        correctAnswer: 'The capacity to sustain prolonged effort and attention',
        explanation: '"Endurance" refers to the ability to withstand hardship or prolonged cognitive effort.',
        highlightText: 'endurance',
        grammarInsight: 'Notice how "cognitive endurance" functions as a compound noun phrase.',
        targetAssetTerm: 'endurance',
        targetAssetType: 'vocabulary'
      },
      {
        type: 'implicit_grammar',
        instruction: 'Implicit Grammar & Flow Calibration',
        prompt: 'The following sentence contains a subject-verb agreement mismatch. Restore its natural, fluent version:\n\n"Active retrieval produce significantly more durable neural memory traces than passive review."',
        correctAnswer: 'Active retrieval produces significantly more durable neural memory traces than passive review.',
        explanation: 'Singular abstract subjects (like "Active retrieval") take third-person singular verbs ("produces").',
        grammarInsight: 'Third-person singular inflection "-s" applies to non-count abstract noun subjects.',
        targetAssetTerm: 'Subject-Verb Concord',
        targetAssetType: 'grammar_pattern'
      },
      {
        type: 'listening_comprehension',
        instruction: 'Aural Decoding & Phonemic Cloze',
        prompt: 'Listen to the audio segment, then fill in the missing word in the transcription below:\n\n"Implicit syntactic structures are absorbed most effectively through repeated _______ context."',
        audioText: 'Implicit syntactic structures are absorbed most effectively through repeated meaningful context.',
        correctAnswer: 'meaningful',
        explanation: 'Contextual immersion enables subconscious acquisition of grammatical patterns.',
        highlightText: 'meaningful',
        grammarInsight: 'Adjectives like "meaningful" modify the head noun "context".',
        targetAssetTerm: 'meaningful',
        targetAssetType: 'vocabulary'
      },
      {
        type: 'speaking_shadowing',
        instruction: 'Active Production & Shadowing Cadence',
        prompt: 'Listen carefully to the segment, then read it aloud smoothly, matching the phrasing, rhythmic pauses, and natural intonation:\n\n"Consistent deliberate immersion transforms passive knowledge into spontaneous spoken fluency."',
        audioText: 'Consistent deliberate immersion transforms passive knowledge into spontaneous spoken fluency.',
        correctAnswer: 'shadowing_completed',
        explanation: 'Shadowing trains speech motor coordination and bridges comprehension with active articulation.',
        grammarInsight: 'Notice the thought groups: [Consistent deliberate immersion] [transforms passive knowledge] [into spontaneous spoken fluency].',
        targetAssetTerm: 'spontaneous spoken fluency',
        targetAssetType: 'phrase'
      },
      {
        type: 'vocabulary_retrieval',
        instruction: 'Vocabulary Retrieval & Context Mapping',
        prompt: 'Identify the nuance of the term "cohesion" in communicative discourse:\n\n"Clear transitional markers establish logical cohesion between complex arguments."',
        options: [
          'The grammatical and lexical linking that holds a text together',
          'A grammatical error that confuses the listener',
          'An informal tone used in casual conversation',
          'A rapid rate of speech without pauses'
        ],
        correctAnswer: 'The grammatical and lexical linking that holds a text together',
        explanation: '"Cohesion" refers to the organizational unity and connective tissue of discourse.',
        highlightText: 'cohesion',
        grammarInsight: 'Transitional markers like "consequently" and "furthermore" provide discourse cohesion.',
        targetAssetTerm: 'cohesion',
        targetAssetType: 'vocabulary'
      },
      {
        type: 'implicit_grammar',
        instruction: 'Implicit Grammar & Flow Calibration',
        prompt: 'The following sentence contains a prepositional error. Restore its natural, fluent version:\n\n"Fluent communicators adapt their register depending on the context in which they are speaking in."',
        correctAnswer: 'Fluent communicators adapt their register depending on the context in which they are speaking.',
        explanation: 'Avoid duplicating prepositions when fronting with "in which".',
        grammarInsight: 'Relative clauses with preposition fronting ("in which they are speaking") do not repeat the preposition at the end.',
        targetAssetTerm: 'Preposition Fronting',
        targetAssetType: 'grammar_pattern'
      },
      {
        type: 'listening_comprehension',
        instruction: 'Aural Decoding & Phonemic Cloze',
        prompt: 'Listen to the audio segment, then fill in the missing key word in the transcription below:\n\n"Accurate phonological awareness allows learners to distinguish subtle _______ in vowel length."',
        audioText: 'Accurate phonological awareness allows learners to distinguish subtle nuances in vowel length.',
        correctAnswer: 'nuances',
        explanation: '"Nuances" denotes subtle distinctions or fine variations in sound or meaning.',
        highlightText: 'nuances',
        grammarInsight: 'The plural noun "nuances" acts as the direct object of "distinguish".',
        targetAssetTerm: 'nuances',
        targetAssetType: 'vocabulary'
      },
      {
        type: 'speaking_shadowing',
        instruction: 'Active Production & Shadowing Cadence',
        prompt: 'Listen carefully to the segment, then read it aloud smoothly, matching the phrasing and rhythm:\n\n"When navigating unfamiliar discussions, asking clarifying questions demonstrates executive maturity."',
        audioText: 'When navigating unfamiliar discussions, asking clarifying questions demonstrates executive maturity.',
        correctAnswer: 'shadowing_completed',
        explanation: 'Practicing complex introductory dependent clauses calibrates natural sentence intonation.',
        grammarInsight: 'Introductory participial clauses ("When navigating...") take a slight rising pause before the main subject.',
        targetAssetTerm: 'clarifying questions',
        targetAssetType: 'phrase'
      },
      {
        type: 'vocabulary_retrieval',
        instruction: 'Vocabulary Retrieval & Context Mapping',
        prompt: 'What is the precise contextual meaning of "articulate" in professional settings:\n\n"Leaders must articulate their strategic vision with clarity and conviction."',
        options: [
          'Express an idea clearly and effectively in speech or writing',
          'Hesitate frequently when speaking to an audience',
          'Memorize a prepared script word for word',
          'Speak loudly to dominate a conversation'
        ],
        correctAnswer: 'Express an idea clearly and effectively in speech or writing',
        explanation: '"Articulate" as a verb means to express fluently, distinctly, and coherently.',
        highlightText: 'articulate',
        grammarInsight: 'The modal auxiliary "must" is followed by base verb "articulate".',
        targetAssetTerm: 'articulate',
        targetAssetType: 'vocabulary'
      },
      {
        type: 'implicit_grammar',
        instruction: 'Implicit Grammar & Flow Calibration',
        prompt: 'Correct the subtle tense and aspect error in this sentence:\n\n"Since several decades, researchers studied how immersion impacts neural plasticity."',
        correctAnswer: 'For several decades, researchers have studied how immersion impacts neural plasticity.',
        explanation: 'Duration with ongoing relevance uses "For" + present perfect ("have studied").',
        grammarInsight: '"For [duration]" pairs with present perfect when an action began in the past and continues to the present.',
        targetAssetTerm: 'Present Perfect Aspect',
        targetAssetType: 'grammar_pattern'
      },
      {
        type: 'listening_comprehension',
        instruction: 'Aural Decoding & Phonemic Cloze',
        prompt: 'Listen to the audio segment, then fill in the missing word:\n\n"Active recall builds stronger cognitive _______ than passive recognition."',
        audioText: 'Active recall builds stronger cognitive connections than passive recognition.',
        correctAnswer: 'connections',
        explanation: 'Acoustic decoding reinforces orthographic representations in memory.',
        highlightText: 'connections',
        grammarInsight: 'Comparative structures: "stronger [noun] than [noun]".',
        targetAssetTerm: 'connections',
        targetAssetType: 'vocabulary'
      },
      {
        type: 'speaking_shadowing',
        instruction: 'Active Production & Shadowing Cadence',
        prompt: 'Shadow this closing synthesis sentence with confident cadence and rhythm:\n\n"Mastering language is not about memorizing rules, but about developing intuitive confidence through continuous deliberate practice."',
        audioText: 'Mastering language is not about memorizing rules, but about developing intuitive confidence through continuous deliberate practice.',
        correctAnswer: 'shadowing_completed',
        explanation: 'Parallel contrastive phrasing ("not about X, but about Y") creates powerful communicative flow.',
        grammarInsight: 'Parallel correlative structures maintain the same grammatical form across both clauses ("about memorizing... about developing...").',
        targetAssetTerm: 'intuitive confidence',
        targetAssetType: 'phrase'
      }
    ];

    const exercises: Exercise[] = [];
    for (let i = 0; i < count; i++) {
      const template = standaloneBank[i % standaloneBank.length];
      exercises.push({
        id: `ex_std_${i}_${Date.now()}`,
        type: template.type,
        instruction: template.instruction,
        prompt: template.prompt,
        options: template.options ? [...template.options] : undefined,
        correctAnswer: template.correctAnswer,
        explanation: template.explanation,
        audioText: template.audioText,
        highlightText: template.highlightText,
        grammarInsight: template.grammarInsight,
        targetAssetTerm: template.targetAssetTerm,
        targetAssetType: template.targetAssetType
      });
    }

    return exercises;
  }

  /**
   * Helper to build a session directly from config (compatibility)
   */
  public static async buildSession(config: SessionConfig, source: Source): Promise<Exercise[]> {
    const count = this.calculateExerciseCount(config.durationMinutes);
    return await AIService.generateExercises(source, count, config.userLevel);
  }

  /**
   * Evaluates SessionState and computes ObjectiveAchievementAssessment and StageMetrics.
   */
  public static evaluateSession(state: SessionState): {
    achievement: ObjectiveAchievementAssessment;
    stageMetrics: StagePerformanceMetrics[];
  } {
    const total = state.plan.activities.length;
    const correctCount = Object.values(state.scores).filter(Boolean).length;
    const scorePercent = total > 0 ? Math.round((correctCount / total) * 100) : 100;

    // Stage metrics computation
    const stageMap: Record<PedagogicalStage, { total: number; completed: number; correct: number; time: number; label: string }> = {
      starting_point: { total: 0, completed: 0, correct: 0, time: 0, label: 'Orientation' },
      notice_input: { total: 0, completed: 0, correct: 0, time: 0, label: 'Lexical Noticing' },
      guided_practice: { total: 0, completed: 0, correct: 0, time: 0, label: 'Guided Practice' },
      active_retrieval: { total: 0, completed: 0, correct: 0, time: 0, label: 'Active Retrieval' },
      production: { total: 0, completed: 0, correct: 0, time: 0, label: 'Spoken Production' },
      checkpoint: { total: 0, completed: 0, correct: 0, time: 0, label: 'Mastery Checkpoint' }
    };

    state.plan.activities.forEach((act) => {
      const ex = act.exercise;
      const isDone = state.answers[ex.id] !== undefined;
      const isCorrect = state.scores[ex.id] ?? false;
      const timeSpent = state.timeSpentPerExercise[ex.id] || state.timeSpentPerActivity[act.id] || 0;

      if (stageMap[act.stage]) {
        stageMap[act.stage].total += 1;
        if (isDone) stageMap[act.stage].completed += 1;
        if (isCorrect) stageMap[act.stage].correct += 1;
        stageMap[act.stage].time += timeSpent;
      }
    });

    const stageMetrics: StagePerformanceMetrics[] = Object.entries(stageMap)
      .filter(([_, data]) => data.total > 0)
      .map(([stageKey, data]) => ({
        stage: stageKey as PedagogicalStage,
        label: data.label,
        total: data.total,
        completed: data.completed,
        correct: data.correct,
        timeSpentSeconds: data.time
      }));

    // Mastery level assessment
    let level: MasteryLevel = 'developing';
    let summary = '';
    const strongAreas: string[] = [];
    const focusAreas: string[] = [];

    if (scorePercent >= 80) {
      level = 'mastered';
      summary = `Objective achieved with strong mastery (${scorePercent}%). Target vocabulary associations and implicit grammatical structures were recalled accurately with fluid cadence.`;
      strongAreas.push('High precision in active retrieval under contextual pressure');
      strongAreas.push('Consistent sensitivity to natural subject-verb and prepositional harmony');
      strongAreas.push('Active oral engagement during shadowing production');
    } else if (scorePercent >= 50) {
      level = 'developing';
      summary = `Objective partially consolidated (${scorePercent}%). Target concepts were noticed and identified, with emerging confidence during active retrieval.`;
      strongAreas.push('Contextual noticing and recognition of core anchor terms');
      strongAreas.push('Willingness to produce spoken speech and explore new patterns');
      focusAreas.push('Reinforce active recall of target terms without multiple-choice scaffolding');
      focusAreas.push('Calibrate subtle grammatical agreements in complex clauses');
    } else {
      level = 'exploring';
      summary = `Initial exploration completed (${scorePercent}%). The brain has registered new auditory and lexical patterns; additional short cycles will cement retention.`;
      strongAreas.push('Initial exposure to authentic sentence melody and key vocabulary');
      focusAreas.push('Repeat short 3-5 minute focused cycles on this material');
      focusAreas.push('Use the explicit grammar toggle when encountering unfamiliar structures');
    }

    const recommendedNextStep =
      level === 'mastered'
        ? 'Practice a new passage or advance to a longer immersive session.'
        : level === 'developing'
        ? 'Run a quick 3-minute micro-drill on this text to lock in newly noticed patterns.'
        : 'Revisit the extracted learning assets on the source page, then try a 5-minute session.';

    const achievement: ObjectiveAchievementAssessment = {
      level,
      scorePercent,
      summary,
      strongAreas,
      focusAreas,
      recommendedNextStep
    };

    return { achievement, stageMetrics };
  }

  /**
   * Helper to create a complete SessionSummary from finished SessionState.
   */
  public static createSummary(state: SessionState): SessionSummary {
    const { achievement, stageMetrics } = this.evaluateSession(state);
    const durationSeconds = state.endTime
      ? Math.max(1, Math.round((state.endTime - state.startTime) / 1000))
      : 0;

    const items: SessionResultItem[] = state.plan.activities.map((act) => {
      const ex = act.exercise;
      const actResult = state.activityResults?.[act.id];
      const evidence = actResult?.evidence;

      return {
        activityId: act.id,
        exerciseId: ex.id,
        stage: act.stage,
        stageLabel: act.stageLabel,
        pedagogicalIntent: act.pedagogicalIntent,
        exercise: ex,
        userAnswer: state.answers[ex.id] || '(No response)',
        isCorrect: state.scores[ex.id] ?? false,
        timeSpentSeconds: state.timeSpentPerExercise[ex.id] || state.timeSpentPerActivity[act.id] || 0,
        grammarRequested: state.grammarRequested[ex.id] ?? false,
        targetAssetTerm: act.targetAssetTerm || ex.targetAssetTerm,
        isReviewItem: act.isReviewItem ?? ex.isReviewItem,
        activityResult: actResult,
        evidence: evidence
      };
    });

    const unassistedCorrectCount = items.filter(
      (item) => item.evidence?.unassistedSuccess || (item.isCorrect && !item.grammarRequested && !item.evidence?.recoveredAfterFeedback)
    ).length;

    const recoveredCount = items.filter(
      (item) => item.evidence?.recoveredAfterFeedback
    ).length;

    const currentLearnerId = state.learnerId || state.plan?.learnerId || LocalRepository.getLearner()?.id;

    const summary: SessionSummary = {
      id: `sess_${Date.now()}`,
      learnerId: currentLearnerId,
      sourceId: state.plan.sourceId,
      sourceTitle: state.plan.sourceTitle || 'English Practice Material',
      durationMinutes: state.config.durationMinutes,
      actualDurationSeconds: durationSeconds,
      objective: state.plan.objective,
      objectiveAchievement: achievement,
      stageMetrics,
      totalExercises: state.plan.activities.length,
      correctExercises: Object.values(state.scores).filter(Boolean).length,
      unassistedCorrectCount,
      recoveredCount,
      completedAt: Date.now(),
      items
    };

    // Update the Learning State and record asset state changes
    try {
      const { changes } = LearningStateManager.recordSessionResult(summary);
      summary.learningStateUpdates = changes;
    } catch (e) {
      console.error('Failed to update learning state:', e);
    }

    return summary;
  }
}
