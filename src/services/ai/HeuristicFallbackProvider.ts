import { AIProvider, EvaluationContext, AIEvaluationResponse } from './AIProvider';
import {
  SourceAnalysisInput,
  SourceAnalysisResult,
  Source,
  Exercise,
  ExerciseType,
  EnglishLevel,
  EvaluationStatus,
  FeedbackType
} from '../../types';

/**
 * HeuristicFallbackProvider
 *
 * Local rule-based parser that executes entirely in-memory without external network calls.
 * Serves as an immediate fallback or offline parser when the local LLM runtime (Ollama)
 * is unreachable or still starting up.
 */
export class HeuristicFallbackProvider implements AIProvider {
  public readonly name = 'heuristic-fallback';

  public async analyzeSource(input: SourceAnalysisInput): Promise<SourceAnalysisResult> {
    const { title, content, userProfile } = input;
    const effectiveLevel: EnglishLevel = (userProfile?.level && userProfile.level !== 'unknown' ? userProfile.level : input.userLevel) || 'B1';
    const isPersianSupport = userProfile?.supportLanguage === 'fa';

    // Sentence extraction
    const rawSentences = content
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length >= 15 && /[a-zA-Z]/.test(s));

    const sentences = rawSentences.length > 0
      ? rawSentences
      : [
          'Deep concentration reinforces neural pathways and accelerates language mastery.',
          'Implicit grammar acquisition occurs through regular immersion in authentic text.'
        ];

    // Word extraction & stop words filter
    const stopWords = new Set([
      'about', 'above', 'after', 'again', 'against', 'all', 'and', 'any', 'are', 'aren\'t', 'because',
      'been', 'before', 'being', 'below', 'between', 'both', 'but', 'cannot', 'could', 'couldn\'t',
      'did', 'didn\'t', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during', 'each', 'few', 'for',
      'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'her',
      'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'into',
      'is', 'isn\'t', 'its', 'itself', 'let\'s', 'more', 'most', 'mustn\'t', 'myself', 'nor', 'not',
      'off', 'once', 'only', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
      'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'shouldn\'t', 'some',
      'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs', 'them', 'themselves', 'then',
      'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this',
      'those', 'through', 'too', 'under', 'until', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll',
      'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where',
      'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t',
      'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours',
      'yourself', 'yourselves'
    ]);

    const words = content
      .replace(/[^a-zA-Z\s-]/g, ' ')
      .split(/\s+/)
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length >= 4 && !stopWords.has(w) && !/^\d+$/.test(w));

    const uniqueWords = Array.from(new Set(words));
    const wordPool = uniqueWords.length > 0 ? uniqueWords : ['concentration', 'retrieval', 'acquisition', 'fluency'];

    // 1. Summary
    const firstSentence = sentences[0] || 'This material covers foundational English vocabulary and syntactic structures.';
    const summary = title
      ? `${title}: ${firstSentence}`
      : firstSentence;

    // 2. Vocabulary Items
    const vocabulary = wordPool.slice(0, 5).map((term, index) => {
      const matchingSentence = sentences.find(s => s.toLowerCase().includes(term)) || sentences[index % sentences.length] || sentences[0];
      return {
        word: term,
        meaning: isPersianSupport
          ? `واژه کلیدی '${term}' با کاربرد محوری در این متن`
          : `A salient term denoting '${term}', essential to the conceptual framework of this text.`,
        example: matchingSentence,
        difficulty: effectiveLevel,
        importance: index < 2 ? 'High' : 'Medium'
      };
    });

    // 3. Useful Phrases
    const phrases = sentences.slice(0, 3).map(s => {
      const clauses = s.split(/,|;/).map(c => c.trim()).filter(c => c.length > 10);
      const phrase = clauses[0] || s;
      return {
        phrase,
        meaning: isPersianSupport
          ? `الگوی عبارتی طبیعی و کاربردی برای روان‌سازی مکالمه و نگارش`
          : `A natural phrasing pattern used in analytical and expository English.`,
        example: s,
        difficulty: effectiveLevel
      };
    });

    // 4. Grammar Patterns
    const grammarPatterns = [
      {
        pattern: 'Subordinate and Relative Clause Anchoring',
        explanation: isPersianSupport
          ? 'استفاده از جمله‌واره‌های پیرو برای پیوند منطقی و دقیق گزاره‌ها'
          : 'Complex sentences connect subordinate reasoning clauses without losing subject-verb concord.',
        example: sentences[0] || 'When individuals practice deeply, their performance accelerates.',
        relevance: 'Essential for cohesive discourse.'
      },
      {
        pattern: 'Nominalization and Concept Density',
        explanation: isPersianSupport
          ? 'تبدیل افعال و صفات به اسم برای ارتقای وزن علمی و ادراکی متن'
          : 'Transforming verbs and adjectives into abstract nouns to condense dense information.',
        example: sentences[1] || 'Implicit grammar acquisition occurs through continuous exposure.',
        relevance: 'Improves reading comprehension.'
      }
    ];

    // 5. Comprehension Questions
    const comprehensionQuestions = [
      {
        question: `What is the primary argument or central idea conveyed in "${title || 'this passage'}"?`,
        answer: `The text explores key principles and systematic mechanisms underlying the subject matter.`,
        options: [
          `The text explores key principles and systematic mechanisms underlying the subject matter.`,
          `The author completely dismisses structured analysis in favor of arbitrary chance.`,
          `The text serves strictly as an introductory greeting with no substantive analysis.`,
          `The passage argues against language practice and deliberate learning.`
        ],
        type: 'multiple_choice',
        explanation: isPersianSupport
          ? 'متن ساختارهای مضمونی مشخصی ارائه داده و بین مفاهیم پیوند برقرار می‌کند.'
          : `The passage establishes structured thematic relationships and demonstrates practical insights.`
      },
      {
        question: `Based on the text, how does the author support the central concept?`,
        answer: `By highlighting contextual mechanisms and functional outcomes.`,
        options: [
          `By highlighting contextual mechanisms and functional outcomes.`,
          `By reciting unrelated historical dates.`,
          `By asking rhetorical questions without answering them.`,
          `By providing fictitious dialogs.`
        ],
        type: 'multiple_choice',
        explanation: isPersianSupport
          ? 'متن بر روابط علت و معلولی و کاربرد دقیق ساختارها تکیه دارد.'
          : `The text builds its narrative around concrete cause-and-effect relationships.`
      }
    ];

    // 6. Speaking Prompts
    const speakingPrompts = [
      {
        prompt: `In 60 seconds, summarize the core thesis of "${title || 'this passage'}" in your own words.`,
        relatedConcept: wordPool.slice(0, 2).join(', '),
        difficulty: effectiveLevel,
        guidance: `Focus on smooth pacing and try to integrate at least two key terms naturally into your explanation.`
      },
      {
        prompt: `How does the topic described in this text relate to your own personal experience or professional work?`,
        relatedConcept: wordPool.slice(2, 4).join(', '),
        difficulty: effectiveLevel,
        guidance: `Use contrastive discourse markers such as 'Similarly', 'In contrast', or 'From my perspective'.`
      }
    ];

    // 7. Recommended Focus
    const recommendedFocus = [
      'Key Collocations',
      'Contextual Retrieval',
      'Connected Speech Shadowing'
    ];

    return {
      summary,
      estimatedLevel: effectiveLevel,
      vocabulary,
      phrases,
      comprehensionQuestions,
      speakingPrompts,
      grammarPatterns,
      recommendedFocus,
      analyzedAt: Date.now(),
      modelUsed: 'heuristic-local-engine'
    };
  }

  public async generateExercises(source: Source, count: number): Promise<Exercise[]> {
    const rawSentences = source.content
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length >= 15 && /[a-zA-Z]/.test(s));

    const sentences = rawSentences.length > 0
      ? rawSentences
      : [
          'Deep concentration reinforces neural pathways and accelerates language mastery.',
          'Implicit grammar acquisition occurs through regular, attentive immersion in authentic text.',
          'Retrieval practice strengthens long-term memory far more effectively than passive rereading.'
        ];

    const stopWords = new Set([
      'about', 'above', 'after', 'again', 'against', 'all', 'and', 'any', 'are', 'aren\'t', 'because',
      'been', 'before', 'being', 'below', 'between', 'both', 'but', 'cannot', 'could', 'couldn\'t',
      'did', 'didn\'t', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during', 'each', 'few', 'for',
      'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'her',
      'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'into',
      'is', 'isn\'t', 'its', 'itself', 'let\'s', 'more', 'most', 'mustn\'t', 'myself', 'nor', 'not',
      'off', 'once', 'only', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
      'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'shouldn\'t', 'some',
      'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs', 'them', 'themselves', 'then',
      'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this',
      'those', 'through', 'too', 'under', 'until', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll',
      'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where',
      'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t',
      'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours',
      'yourself', 'yourselves'
    ]);

    const words = source.content
      .replace(/[^a-zA-Z\s-]/g, ' ')
      .split(/\s+/)
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length >= 4 && !stopWords.has(w) && !/^\d+$/.test(w));

    const uniqueWords = Array.from(new Set(words));
    const wordPool = uniqueWords.length > 0
      ? uniqueWords
      : ['concentration', 'pathways', 'acquisition', 'sustainable', 'resilience', 'infrastructure'];

    const exerciseSequence: ExerciseType[] = [
      'vocabulary_retrieval',
      'implicit_grammar',
      'listening_comprehension',
      'speaking_shadowing',
      'vocabulary_retrieval',
      'implicit_grammar',
      'listening_comprehension',
      'speaking_shadowing'
    ];

    const exercises: Exercise[] = [];

    for (let i = 0; i < count; i++) {
      const type = exerciseSequence[i % exerciseSequence.length];
      const targetSentence = sentences[i % sentences.length];
      const targetWord = wordPool[i % wordPool.length];

      if (type === 'vocabulary_retrieval') {
        const contextualSentence = sentences.find(s => s.toLowerCase().includes(targetWord)) || targetSentence;
        const correctDef = `A central concept in this passage denoting '${targetWord}', referring to its specific contextual function`;
        const distractor1 = `An unrelated, contrary antonym referring to the opposite of ${targetWord}`;
        const distractor2 = `A superficial grammatical connector with no substantive meaning here`;
        const distractor3 = `A colloquial idiom rarely encountered in formal or analytical writing`;

        const options = [correctDef, distractor1, distractor2, distractor3].sort(() => 0.5 - Math.random());

        exercises.push({
          id: `ex_vocab_${i}_${Date.now()}`,
          type,
          instruction: 'Vocabulary Retrieval & Context Mapping',
          prompt: `In the context of the sentence below, identify the core function and nuance of the term "${targetWord}":\n\n"${contextualSentence}"`,
          options,
          correctAnswer: correctDef,
          explanation: `In this text, "${targetWord}" acts as an anchor term. Active retrieval anchors its semantic network in memory far more deeply than passive flashcards.`,
          highlightText: targetWord,
          grammarInsight: `Notice how "${targetWord}" fits syntactically into the sentence structure. Paying attention to its surrounding prepositions and collocations cements implicit grammatical intuition.`,
          targetAssetTerm: targetWord,
          targetAssetType: 'vocabulary'
        });
      } else if (type === 'implicit_grammar') {
        let perturbed = targetSentence;
        let correctionNote = 'Subject-verb concord and natural tense consistency.';

        if (/\bis\b/i.test(targetSentence)) {
          perturbed = targetSentence.replace(/\bis\b/gi, 'are');
          correctionNote = 'Singular subjects require singular verb agreements.';
        } else if (/\bare\b/i.test(targetSentence)) {
          perturbed = targetSentence.replace(/\bare\b/gi, 'is');
          correctionNote = 'Plural antecedents require plural verb forms.';
        } else if (/\bhas\b/i.test(targetSentence)) {
          perturbed = targetSentence.replace(/\bhas\b/gi, 'have');
          correctionNote = 'Third-person singular constructions require "has" in standard aspect.';
        } else if (/\bhave\b/i.test(targetSentence)) {
          perturbed = targetSentence.replace(/\bhave\b/gi, 'has');
          correctionNote = 'Plural or non-third-person subjects take "have".';
        } else if (/\bin\b/i.test(targetSentence)) {
          perturbed = targetSentence.replace(/\bin\b/i, 'at');
          correctionNote = 'Spatial and conceptual prepositions conform to customary English collocations.';
        } else {
          const wordsInSentence = targetSentence.split(' ');
          if (wordsInSentence.length > 5) {
            wordsInSentence[2] = wordsInSentence[2] + 's';
            perturbed = wordsInSentence.join(' ');
          }
        }

        exercises.push({
          id: `ex_gram_${i}_${Date.now()}`,
          type,
          instruction: 'Implicit Grammar & Flow Calibration',
          prompt: `The following phrase excerpted from your source contains a subtle grammatical or structural mismatch. Restore its natural, fluent version:\n\n"${perturbed}"`,
          correctAnswer: targetSentence,
          explanation: `Your brain naturally registers rhythmic anomalies in spoken and written English. ${correctionNote} Repeated exposure to correct patterns strengthens intuition without tedious rule drills.`,
          grammarInsight: `Explicit rule: ${correctionNote} When speaking spontaneously, you will intuitively produce this without consciously calculating the rule.`,
          targetAssetTerm: 'Syntax Concord & Clause Harmony',
          targetAssetType: 'grammar_pattern'
        });
      } else if (type === 'listening_comprehension') {
        const wordsInTarget = targetSentence.split(' ');
        const keyWordIndex = Math.min(Math.floor(wordsInTarget.length / 2), wordsInTarget.length - 1);
        const missingWord = wordsInTarget[keyWordIndex].replace(/[^a-zA-Z]/g, '');
        const clozePrompt = wordsInTarget.map((w, idx) => (idx === keyWordIndex ? '_______' : w)).join(' ');

        exercises.push({
          id: `ex_listen_${i}_${Date.now()}`,
          type,
          instruction: 'Aural Decoding & Phonemic Cloze',
          prompt: `Listen to the audio segment spoken from your text, then fill in the missing word in the transcription below:\n\n"${clozePrompt}"`,
          audioText: targetSentence,
          correctAnswer: missingWord,
          explanation: `Linking rapid speech sounds to orthographic spelling calibrates the auditory cortex for authentic English cadence and connected speech.`,
          highlightText: missingWord,
          grammarInsight: `In connected speech, unstressed vowels and function words often reduce into schwas (/ə/). Noticing this helps decode fast natural speakers.`,
          targetAssetTerm: missingWord.toLowerCase(),
          targetAssetType: 'vocabulary'
        });
      } else {
        exercises.push({
          id: `ex_speak_${i}_${Date.now()}`,
          type,
          instruction: 'Active Production & Shadowing Cadence',
          prompt: `Listen carefully to the segment, then read it aloud smoothly, matching the phrasing, rhythmic pauses, and natural intonation:\n\n"${targetSentence}"`,
          audioText: targetSentence,
          correctAnswer: 'shadowing_completed',
          explanation: `Shadowing trains motor pathways in the speech apparatus. It bridges the gap between passive recognition and spontaneous active production.`,
          grammarInsight: `Notice the thought groups (chunks) within the sentence. Pausing between natural clause boundaries makes your spoken English sound effortless and clear.`,
          targetAssetTerm: targetSentence.slice(0, 35) + '...',
          targetAssetType: 'phrase'
        });
      }
    }

    return exercises;
  }

  public async checkHealth(): Promise<{ ok: boolean; message: string; availableModels?: string[] }> {
    return {
      ok: true,
      message: 'Local heuristic engine is active (in-memory mode).'
    };
  }

  /**
   * Conservative rule-based evaluator for offline/fallback mode.
   * Does not hallucinate or fabricate semantic complexity.
   */
  public async evaluateResponse(context: EvaluationContext, response: string): Promise<AIEvaluationResponse> {
    const cleanResponse = response.trim();
    const isPersianSupport = context.userProfile?.supportLanguage === 'fa';
    const target = (context.targetAssetTerm || '').trim().toLowerCase();
    const expected = (context.expectedAnswer || '').trim().toLowerCase();

    // 1. Empty or trivial response
    if (cleanResponse.length === 0) {
      return {
        status: 'needs_support',
        taskCompleted: false,
        isCorrect: false,
        grammarStatus: 'major_issue',
        grammarIssues: ['No response entered'],
        feedback: {
          type: 'encouragement',
          message: 'Please provide a response to evaluate your practice.',
          explanation: isPersianSupport ? 'لطفاً پاسخی وارد کنید تا مورد ارزیابی قرار گیرد.' : 'Enter your sentence to verify understanding.',
          retryPrompt: 'Type your sentence and press verify.'
        },
        retryRecommended: true
      };
    }

    // 2. Normalize and check exact or near-exact match for expected answer
    const cleanNormResponse = cleanResponse.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const cleanNormExpected = expected.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

    if (cleanNormExpected && cleanNormResponse === cleanNormExpected) {
      return {
        status: 'strong',
        taskCompleted: true,
        isCorrect: true,
        targetVocabularyUsed: true,
        targetMeaningCorrect: true,
        grammarStatus: 'acceptable',
        meaningPreserved: true,
        naturalness: 'natural',
        clarity: 'clear',
        feedback: {
          type: 'positive',
          message: 'Accurate and natural! Matches the target model sentence perfectly.',
          suggestedCorrection: context.expectedAnswer
        },
        retryRecommended: false
      };
    }

    // 3. Check for specific common ESL grammatical patterns (e.g. "I am agree")
    if (/\bi\s+(am|was)\s+agree\b/i.test(cleanResponse)) {
      return {
        status: 'developing',
        taskCompleted: true,
        isCorrect: false,
        grammarStatus: 'minor_issue',
        grammarIssues: ["Use 'agree' as a main verb: 'I agree', not 'I am agree'"],
        meaningPreserved: true,
        naturalness: 'unnatural',
        clarity: 'partially_clear',
        feedback: {
          type: 'correction',
          message: "In English, 'agree' is a verb. Say 'I agree with this' rather than 'I am agree'.",
          suggestedCorrection: cleanResponse.replace(/\bi\s+am\s+agree\b/i, 'I agree').replace(/\bi\s+was\s+agree\b/i, 'I agreed'),
          explanation: isPersianSupport
            ? "فعل agree در زبان انگلیسی خود فعل اصلی است و نیازی به فعل to be (am/is/are) ندارد."
            : "In English, 'agree' is a dynamic verb and takes subjects directly without the verb 'to be'.",
          retryPrompt: "Try the sentence again using 'I agree'."
        },
        retryRecommended: true
      };
    }

    // 4. Check for target word inclusion if a target word was assigned
    let targetUsed = true;
    if (target && target.length > 2) {
      // Check word stem or exact word
      const targetStem = target.slice(0, Math.max(3, target.length - 2));
      targetUsed = cleanNormResponse.includes(target) || cleanNormResponse.includes(targetStem);
    }

    if (target && !targetUsed) {
      return {
        status: 'developing',
        taskCompleted: false,
        isCorrect: false,
        targetVocabularyUsed: false,
        targetMeaningCorrect: false,
        grammarStatus: 'acceptable',
        feedback: {
          type: 'hint',
          message: `Your sentence does not appear to include the target term "${context.targetAssetTerm}".`,
          suggestedCorrection: context.expectedAnswer,
          explanation: isPersianSupport
            ? `لطفاً از واژه هدف «${context.targetAssetTerm}» در جمله خود استفاده کنید.`
            : `Make sure to incorporate the target expression "${context.targetAssetTerm}".`,
          retryPrompt: `Try writing the sentence again, including "${context.targetAssetTerm}".`
        },
        retryRecommended: true
      };
    }

    // 5. General open sentence rule-based checks (length, basic capital & punctuation)
    const wordCount = cleanResponse.split(/\s+/).length;
    if (wordCount < 3 && context.exerciseType !== 'vocabulary_retrieval') {
      return {
        status: 'developing',
        taskCompleted: false,
        isCorrect: false,
        grammarStatus: 'minor_issue',
        grammarIssues: ['Response is very short'],
        feedback: {
          type: 'encouragement',
          message: 'Try expressing your thought in a complete sentence with a subject and verb.',
          suggestedCorrection: context.expectedAnswer,
          explanation: isPersianSupport
            ? 'یک جمله کامل با فاعل و فعل بنویسید تا تمرین شما اثربخش‌تر باشد.'
            : 'Write a full sentence with a subject and verb for maximum learning benefit.',
          retryPrompt: 'Expand your response into a complete sentence.'
        },
        retryRecommended: true
      };
    }

    // If target is used and sentence is complete
    return {
      status: 'acceptable',
      taskCompleted: true,
      isCorrect: true,
      targetVocabularyUsed: targetUsed,
      targetMeaningCorrect: true,
      grammarStatus: 'acceptable',
      meaningPreserved: true,
      naturalness: 'acceptable',
      clarity: 'clear',
      feedback: {
        type: 'positive',
        message: 'Good practice! Your response communicates the message and uses the target structure.',
        suggestedCorrection: context.expectedAnswer
      },
      retryRecommended: false
    };
  }
}
