# Adaptive English Learning (Local-First Architecture)

A privacy-focused, local-first adaptive English language learning application built with **React**, **TypeScript**, and **Tailwind CSS**, designed to run completely offline on the user's computer with **Ollama** as the runtime LLM.

---

## 🏛️ System Architecture

The application is architected around a strict separation of concerns, decoupling user interface components from the underlying AI inference engine and persistence layers.

```
┌─────────────────────────────────────────────────────────────┐
│                       React User Interface                  │
│   (HomeScreen, SourceDetails, ChooseTime, LearningSession)  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
   ┌───────────────────────────┐ ┌───────────────────────────┐
   │      SessionEngine        │ │      LocalRepository      │
   │  (Time adaptation, drill  │ │  (LocalStorage / Indexed) │
   │   matrix, exercise queue) │ │  (Sources, Sessions, Logs)│
   └────────────┬──────────────┘ └───────────────────────────┘
                │
                ▼
   ┌─────────────────────────────────────────────────────────┐
   │                    AIService Facade                     │
   └────────────────────────────┬────────────────────────────┘
                                │
                                ▼
   ┌─────────────────────────────────────────────────────────┐
   │                  AIProvider Interface                   │
   │  - analyzeSource(input): Promise<SourceAnalysisResult>  │
   │  - generateExercises(...): Promise<Exercise[]>          │
   │  - checkHealth?(): Promise<HealthStatus>                │
   └────────────┬─────────────────────────────┬──────────────┘
                │                             │
                ▼                             ▼
 ┌─────────────────────────────┐ ┌─────────────────────────────┐
 │       OllamaProvider        │ │  HeuristicFallbackProvider  │
 │  - Local REST API (/api/*)  │ │  - In-memory NLP rules      │
 │  - Structured JSON format   │ │  - Instant zero-dependency  │
 │  - Configurable Host/Model  │ │    offline fallback         │
 └─────────────────────────────┘ └─────────────────────────────┘
```

---

## 🔌 AI Provider Abstraction

The application interacts with AI exclusively through the `AIProvider` contract:

```typescript
export interface AIProvider {
  readonly name: string;
  analyzeSource(input: SourceAnalysisInput): Promise<SourceAnalysisResult>;
  generateExercises(source: Source, count: number, userLevel?: EnglishLevel): Promise<Exercise[]>;
  checkHealth?(): Promise<{ ok: boolean; message: string; availableModels?: string[] }>;
}
```

### Implementations

1. **`OllamaProvider`**:
   - Communicates with a local Ollama daemon via standard `fetch` against the `/api/chat` endpoint.
   - Enforces structured JSON output (`format: "json"`).
   - Configurable host (`baseUrl`, defaults to `http://localhost:11434`) and model name (e.g. `llama3.2`, `mistral`, `qwen2.5`, `phi3`).
   - No model name is hardcoded across the application.

2. **`HeuristicFallbackProvider`**:
   - In-memory rule-based linguistic parser that provides uninterrupted learning drills even if the Ollama daemon is offline or starting up.

---

## 🔍 The `analyzeSource()` Operation

The primary analytical capability of the AI engine parses authentic user text and returns structured learning components:

### Input Schema (`SourceAnalysisInput`)
```typescript
interface SourceAnalysisInput {
  title: string;
  content: string;
  userLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
}
```

### Output Schema (`SourceAnalysisResult`)
```typescript
interface SourceAnalysisResult {
  topics: string[];
  vocabularyItems: {
    term: string;
    partOfSpeech?: string;
    definition: string;
    contextSentence: string;
  }[];
  usefulExpressions: {
    phrase: string;
    meaning: string;
    contextSentence: string;
    usageNote?: string;
  }[];
  grammarPatterns: {
    pattern: string;
    explanation: string;
    exampleFromText: string;
  }[];
  comprehensionQuestions: {
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  }[];
  speakingPrompts: {
    prompt: string;
    targetVocabulary?: string[];
    guidance?: string;
  }[];
  analyzedAt?: number;
  modelUsed?: string;
}
```

---

## 💻 Connecting Ollama Locally

To run the application with your local Ollama LLM:

### 1. Install & Start Ollama
Ensure [Ollama](https://ollama.com) is installed on your machine.

### 2. Pull a Recommended Model
You can use any LLM installed in your Ollama environment. Fast 3B to 8B models are recommended:
```bash
# Llama 3.2 (3B - Fast and accurate for structured JSON)
ollama run llama3.2

# Or Mistral / Qwen 2.5
ollama run mistral
ollama run qwen2.5:7b
```

### 3. Enable Browser Access (CORS)
Because the web app runs in the browser, Ollama must allow web origins to communicate with its local REST API (`http://localhost:11434`):

- **macOS / Linux**:
  ```bash
  OLLAMA_ORIGINS="*" ollama serve
  ```
- **Windows (PowerShell)**:
  ```powershell
  $env:OLLAMA_ORIGINS="*"
  ollama serve
  ```
- **Systemd / Daemon**:
  Add `Environment="OLLAMA_ORIGINS=*"` to `/etc/systemd/system/ollama.service`.

### 4. Configure in the App
Click the **"Local AI"** button in the top navigation bar to configure:
- **Base URL**: `http://localhost:11434` (default)
- **Model Name**: Type your desired model (e.g. `llama3.2`) or click **"Test Connection"** to auto-detect installed models.

---

## 🛠️ Development & Building

```bash
# Install dependencies
npm install

# Run Vite dev server
npm run dev

# Check TypeScript types
npm run lint

# Build production bundle
npm run build
```
