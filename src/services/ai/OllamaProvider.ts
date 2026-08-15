import { AIProvider, EvaluationContext, AIEvaluationResponse } from './AIProvider';
import {
  SourceAnalysisInput,
  SourceAnalysisResult,
  Source,
  Exercise,
  EnglishLevel,
  OllamaConfig,
  EvaluationStatus,
  FeedbackType
} from '../../types';
import { validateSourceAnalysis } from './validator';

export const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';
export const DEFAULT_OLLAMA_MODEL = 'llama3.2';

/**
 * OllamaProvider
 *
 * Direct client communicating with a locally running Ollama instance via its HTTP REST API.
 * Uses format: "json" and explicit JSON schemas to ensure structured output.
 */
export class OllamaProvider implements AIProvider {
  public readonly name = 'ollama';
  private baseUrl: string;
  private model: string;
  private timeoutMs: number;

  constructor(config?: Partial<OllamaConfig> & { timeoutMs?: number }) {
    this.baseUrl = (config?.baseUrl || DEFAULT_OLLAMA_BASE_URL).replace(/\/+$/, '');
    this.model = config?.model || DEFAULT_OLLAMA_MODEL;
    this.timeoutMs = config?.timeoutMs || 45000;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  public getModel(): string {
    return this.model;
  }

  public setModel(model: string): void {
    this.model = model;
  }

  /**
   * Health check to test connectivity to local Ollama and list installed models.
   */
  public async checkHealth(): Promise<{ ok: boolean; message: string; availableModels?: string[] }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          ok: false,
          message: `Ollama returned status ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json();
      const models = Array.isArray(data.models)
        ? data.models.map((m: { name: string }) => m.name)
        : [];

      return {
        ok: true,
        message: `Connected to Ollama at ${this.baseUrl}`,
        availableModels: models
      };
    } catch (err: any) {
      const isAbort = err?.name === 'AbortError';
      return {
        ok: false,
        message: isAbort
          ? `Connection to Ollama timed out at ${this.baseUrl}`
          : `Cannot reach Ollama at ${this.baseUrl} (${err?.message || 'Network error'}). Ensure Ollama is running and OLLAMA_ORIGINS="*" is set if needed.`
      };
    }
  }

  /**
   * Helper to execute chat completions with JSON formatting.
   */
  private async generateJson<T>(systemPrompt: string, userPrompt: string): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          format: 'json',
          stream: false,
          options: {
            temperature: 0.3
          }
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama chat request failed with status ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const rawContent = data?.message?.content || '';

      return this.parseStructuredJson<T>(rawContent);
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  /**
   * Robust JSON parser supporting raw JSON, markdown-wrapped JSON, and escaped blocks.
   */
  private parseStructuredJson<T>(raw: string): T {
    let clean = raw.trim();

    // Strip markdown code fences if model included them despite json format
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();
    }

    try {
      return JSON.parse(clean) as T;
    } catch (primaryErr) {
      // Find the first '{' and last '}'
      const firstBrace = clean.indexOf('{');
      const lastBrace = clean.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const substringJson = clean.substring(firstBrace, lastBrace + 1);
        return JSON.parse(substringJson) as T;
      }
      throw new Error(`Failed to parse structured JSON from Ollama response: ${primaryErr}`);
    }
  }

  /**
   * Performs deep contextual analysis of a learning source material.
   * Extracts summary, estimated level, vocabulary, phrases, comprehension questions, speaking prompts, and grammar patterns.
   * Takes UserProfile into account (level, goals, interests, skill priorities, support language).
   */
  public async analyzeSource(input: SourceAnalysisInput): Promise<SourceAnalysisResult> {
    const { title, content, userProfile } = input;
    const effectiveLevel: EnglishLevel = (userProfile?.level && userProfile.level !== 'unknown' ? userProfile.level : input.userLevel) || 'B1';
    const supportLang = userProfile?.supportLanguage || 'en';
    const langPref = userProfile?.languageSupportPreference || 'mostly_english';
    const goalsList = userProfile?.goals?.join(', ') || 'General Communication';
    const interestsList = [...(userProfile?.interests || []), ...(userProfile?.customInterests || [])].join(', ') || 'General Topics';
    const skillList = userProfile?.skillPriorities?.join(', ') || 'Vocabulary, Speaking, Comprehension';

    const supportLangInstruction = supportLang === 'fa' || langPref === 'native_language_explanations' || langPref === 'occasional_translation'
      ? `SUPPORT LANGUAGE: The learner's native/support language is Persian (Farsi).
- Keep all English source quotations, words, phrases, and target examples in authentic English.
- Provide vocabulary definitions, phrase meanings, and grammar explanations in clear Persian (or bilingual English + Persian explanation) to maximize comprehension.
- Comprehension questions can have Persian explanatory hints if appropriate.`
      : `SUPPORT LANGUAGE: English. Keep explanations, definitions, and questions in level-appropriate English.`;

    const systemPrompt = `You are an expert Applied Linguistics and Adaptive English Acquisition system.
Analyze the user's provided English text for a language learner with the following profile:
- Target CEFR Level: ${effectiveLevel}
- Learning Goals: ${goalsList}
- Interests: ${interestsList}
- Skill Priorities: ${skillList}
- Difficulty Mode: ${userProfile?.difficultyPreference || 'balanced'}

${supportLangInstruction}

You MUST reply strictly with a valid JSON object adhering exactly to this schema:
{
  "summary": "string (concise 1-2 sentence overview of the core topic/theme)",
  "estimatedLevel": "${effectiveLevel}",
  "vocabulary": [
    {
      "word": "string (salient vocabulary word from the text)",
      "meaning": "string (level-appropriate contextual definition)",
      "example": "string (sentence from or inspired by the text illustrating the word)",
      "difficulty": "string (e.g. A2, B1, B2, C1)",
      "importance": "string (e.g. High, Medium)"
    }
  ],
  "phrases": [
    {
      "phrase": "string (useful multi-word collocation, idiom, or discourse marker from the text)",
      "meaning": "string (functional explanation of what it expresses)",
      "example": "string (sentence illustrating the phrase)",
      "difficulty": "string (e.g. B1, B2)"
    }
  ],
  "comprehensionQuestions": [
    {
      "question": "string (thoughtful comprehension question testing understanding of the text)",
      "answer": "string (the correct answer)",
      "options": ["string (4 multiple-choice options with exactly 1 correct answer matching answer)"],
      "type": "multiple_choice",
      "explanation": "string (brief explanation why this answer is correct based on the text)"
    }
  ],
  "speakingPrompts": [
    {
      "prompt": "string (active speaking prompt asking the learner to express their thoughts about the text topic)",
      "relatedConcept": "string (key concept or theme related to the prompt)",
      "difficulty": "${effectiveLevel}",
      "guidance": "string (advice on organizing their spoken answer)"
    }
  ],
  "grammarPatterns": [
    {
      "pattern": "string (grammatical or syntactic pattern observed in the text)",
      "example": "string (exact or simplified excerpt from the text)",
      "explanation": "string (clear structural explanation of how the pattern works)",
      "relevance": "string (why this pattern is useful for communication)"
    }
  ],
  "recommendedFocus": ["string (2-4 recommended focus areas, e.g. 'Collocations', 'Complex clauses', 'Oral summarization')"]
}`;

    const userPrompt = `Source Title: ${title || 'Untitled Material'}
User Profile: Level=${effectiveLevel}, SupportLanguage=${supportLang}

Source Text Content:
"""
${content}
"""

Perform deep structural, lexical, and pedagogical analysis of this text now and return the JSON object.`;

    const rawResult = await this.generateJson<any>(systemPrompt, userPrompt);
    const validated = validateSourceAnalysis(rawResult, effectiveLevel);

    if (!validated) {
      throw new Error('AI response did not match the expected SourceAnalysis structure.');
    }

    return {
      ...validated,
      analyzedAt: Date.now(),
      modelUsed: `ollama:${this.model}`
    };
  }

  /**
   * Generates time-adaptive exercises using Ollama.
   */
  public async generateExercises(source: Source, count: number, userLevel: EnglishLevel = 'B2'): Promise<Exercise[]> {
    const systemPrompt = `You are an adaptive English drill generation engine.
Create exactly ${count} English learning exercises based on the provided text for a learner at CEFR level ${userLevel}.
Rotate between these exercise types: "vocabulary_retrieval", "implicit_grammar", "listening_comprehension", "speaking_shadowing".
You MUST output a valid JSON object with the following schema:
{
  "exercises": [
    {
      "id": "string",
      "type": "vocabulary_retrieval" | "implicit_grammar" | "listening_comprehension" | "speaking_shadowing",
      "instruction": "string",
      "prompt": "string",
      "options": ["string (required for vocabulary_retrieval, array of 4 options)"],
      "correctAnswer": "string",
      "explanation": "string",
      "audioText": "string (the sentence for listening or shadowing)",
      "highlightText": "string (key word or phrase)",
      "grammarInsight": "string (explicit structural note)"
    }
  ]
}`;

    const userPrompt = `Source Title: ${source.title}
Source Content:
"""
${source.content}
"""

Generate ${count} adaptive exercises from this text now.`;

    const response = await this.generateJson<{ exercises: Exercise[] }>(systemPrompt, userPrompt);

    if (Array.isArray(response?.exercises) && response.exercises.length > 0) {
      return response.exercises.map((ex, idx) => ({
        ...ex,
        id: ex.id || `ex_ollama_${idx}_${Date.now()}`
      }));
    }

    throw new Error('Ollama returned empty exercises array');
  }

  /**
   * Evaluates an open-ended learner response (free text production, grammar correction, or speaking transcript proxy).
   * Generates structured educational feedback and retry recommendations.
   */
  public async evaluateResponse(context: EvaluationContext, response: string): Promise<AIEvaluationResponse> {
    const effectiveLevel = context.userLevel || context.userProfile?.level || 'B1';
    const supportLang = context.userProfile?.supportLanguage || 'en';
    const langPref = context.userProfile?.languageSupportPreference || 'mostly_english';
    const isPersianSupport = supportLang === 'fa' || langPref === 'native_language_explanations' || langPref === 'occasional_translation';

    const supportLangGuidance = isPersianSupport
      ? `- If explaining a conceptual error or providing an explanation note, write the "explanation" field in clear Persian (Farsi) to support deep comprehension.
- Keep the "message", "suggestedCorrection", and "retryPrompt" in authentic, level-appropriate English so the learner continues practicing English.`
      : `- Keep all feedback and explanations in level-appropriate, clear English.`;

    const systemPrompt = `You are an expert Applied Linguistics and Adaptive English Pedagogical Evaluator.
Evaluate the learner's response for a student at approximate CEFR level ${effectiveLevel}.

EVALUATION PRINCIPLES:
1. Activity Purpose Awareness: Judge the response based on the specific task, target term, and instruction.
2. Naturalness vs. Strict Error: Distinguish between true errors (ungrammatical, incorrect word choice) vs. acceptable stylistic variations. Do NOT over-correct natural colloquial English.
3. Level-Appropriate CEFR Expectation: Do not penalize a B1 learner for not using C1 vocabulary if their response is communicative, grammatical, and achieves the task.
4. Actionable Educational Feedback: Be concise, encouraging, and specific. Never say "Wrong" or "Bad grammar". Instead explain what is more natural (e.g. "Use 'I agree', not 'I am agree'").
5. Retry Decision: If there is a meaningful learning opportunity to fix an error (e.g. target word misplaced, agreement error), set "retryRecommended": true and provide an adapted "retryPrompt". If the response is already acceptable or strong, set "retryRecommended": false.

${supportLangGuidance}

You MUST reply strictly with a valid JSON object matching this schema:
{
  "status": "strong" | "acceptable" | "developing" | "needs_support",
  "taskCompleted": boolean,
  "isCorrect": boolean,
  "targetVocabularyUsed": boolean,
  "targetMeaningCorrect": boolean,
  "grammarStatus": "acceptable" | "minor_issue" | "major_issue",
  "grammarIssues": ["string (concise descriptions of issues if any)"],
  "meaningPreserved": boolean,
  "naturalness": "natural" | "acceptable" | "unnatural",
  "clarity": "clear" | "partially_clear" | "unclear",
  "feedback": {
    "type": "positive" | "correction" | "hint" | "encouragement",
    "message": "string (concise educational summary feedback, max 2 sentences)",
    "suggestedCorrection": "string (ideal or natural model form)",
    "explanation": "string (brief grammatical or semantic explanation)",
    "retryPrompt": "string (specific adapted instruction for the next attempt if retryRecommended is true)"
  },
  "retryRecommended": boolean
}`;

    const userPrompt = `ACTIVITY CONTEXT:
Type: ${context.exerciseType}
Instruction: ${context.instruction}
Task Prompt: "${context.prompt}"
Target Asset/Word: ${context.targetAssetTerm || 'N/A'}
Expected Concept/Answer: ${context.expectedAnswer || 'N/A'}
Previous Attempts Count: ${context.previousAttempts?.length || 0}
Hint Was Used: ${context.hintProvided ? 'Yes' : 'No'}

LEARNER RESPONSE:
"""
${response}
"""

Evaluate this learner response now and return the JSON object.`;

    try {
      const raw = await this.generateJson<any>(systemPrompt, userPrompt);

      // Normalize & validate the response
      const status: EvaluationStatus = ['strong', 'acceptable', 'developing', 'needs_support'].includes(raw?.status)
        ? raw.status
        : (raw?.isCorrect ? 'acceptable' : 'developing');

      const isCorrect = typeof raw?.isCorrect === 'boolean'
        ? raw.isCorrect
        : (status === 'strong' || status === 'acceptable');

      const taskCompleted = typeof raw?.taskCompleted === 'boolean' ? raw.taskCompleted : isCorrect;

      const feedbackType: FeedbackType = ['positive', 'correction', 'hint', 'encouragement'].includes(raw?.feedback?.type)
        ? raw.feedback.type
        : (isCorrect ? 'positive' : 'correction');

      return {
        status,
        taskCompleted,
        isCorrect,
        targetVocabularyUsed: typeof raw?.targetVocabularyUsed === 'boolean' ? raw.targetVocabularyUsed : true,
        targetMeaningCorrect: typeof raw?.targetMeaningCorrect === 'boolean' ? raw.targetMeaningCorrect : isCorrect,
        grammarStatus: ['acceptable', 'minor_issue', 'major_issue'].includes(raw?.grammarStatus) ? raw.grammarStatus : (isCorrect ? 'acceptable' : 'minor_issue'),
        grammarIssues: Array.isArray(raw?.grammarIssues) ? raw.grammarIssues.map(String) : [],
        meaningPreserved: typeof raw?.meaningPreserved === 'boolean' ? raw.meaningPreserved : true,
        naturalness: ['natural', 'acceptable', 'unnatural'].includes(raw?.naturalness) ? raw.naturalness : 'acceptable',
        clarity: ['clear', 'partially_clear', 'unclear'].includes(raw?.clarity) ? raw.clarity : 'clear',
        feedback: {
          type: feedbackType,
          message: String(raw?.feedback?.message || (isCorrect ? 'Well done! Your response communicates the idea clearly.' : 'Let\'s refine this sentence for natural phrasing.')),
          suggestedCorrection: raw?.feedback?.suggestedCorrection ? String(raw.feedback.suggestedCorrection) : undefined,
          explanation: raw?.feedback?.explanation ? String(raw.feedback.explanation) : undefined,
          retryPrompt: raw?.feedback?.retryPrompt ? String(raw.feedback.retryPrompt) : undefined
        },
        retryRecommended: typeof raw?.retryRecommended === 'boolean' ? raw.retryRecommended : (!isCorrect)
      };
    } catch (err) {
      throw new Error(`Ollama evaluation failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
