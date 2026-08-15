export const en = {
  common: {
    appName: 'Adaptive English',
    continue: 'Continue',
    back: 'Back',
    cancel: 'Cancel',
    save: 'Save',
    saveChanges: 'Save Changes',
    startLearning: 'Start Learning',
    addCustomSource: 'Add Custom Source',
    edit: 'Edit',
    delete: 'Delete',
    close: 'Close',
    optional: 'Optional',
    required: 'Required',
    selectMultiple: 'Select multiple',
    chooseUpToThree: 'Choose 1–3',
    selected: 'selected',
    step: 'Step',
    of: 'of',
    comingSoon: 'Coming soon',
    ready: 'Ready',
    changeLanguage: 'Language',
    settings: 'Settings',
    home: 'Home',
    sources: 'Sources'
  },
  languageSelection: {
    title: 'Which language should we use?',
    subtitle: 'Choose the interface language for navigation, hints, and explanations.',
    english: 'English',
    persian: 'فارسی (Persian)',
    continueBtn: 'Continue'
  },
  onboarding: {
    steps: {
      step1: 'Your English',
      step2: 'Make It Personal',
      step3: 'Teaching Style'
    },
    validation: {
      levelRequired: 'Please select your English level to continue.',
      goalRequired: 'Choose at least one goal to continue.',
      bothRequired: 'Select your English level and at least one goal to continue.',
      maxChallengesReached: 'You can choose up to 3 challenges.',
      customInterestDuplicate: 'This interest is already in your list.',
      customInterestEmpty: 'Please type an interest before adding.'
    },
    notSpecified: 'Flexible / Not specified',
    step1: {
      title: "Let's get to know your English",
      subtitle: 'Tell us about where you are starting from. We will adapt your learning sessions continuously as you practice.',
      levelQuestion: 'How would you describe your English?',
      levels: {
        beginner: {
          label: 'Beginner',
          description: 'Basic phrases and foundational vocabulary'
        },
        elementary: {
          label: 'Elementary',
          description: 'Simple everyday conversations and routine tasks'
        },
        intermediate: {
          label: 'Intermediate',
          description: 'Can understand main points of clear standard input'
        },
        upper_intermediate: {
          label: 'Upper-Intermediate',
          description: 'Comfortable with complex texts and spontaneous fluency'
        },
        advanced: {
          label: 'Advanced',
          description: 'Near-effortless expression across professional topics'
        },
        unknown: {
          label: "I'm not sure",
          description: "We'll estimate your level with a quick baseline"
        }
      },
      placementCheck: {
        title: 'Not sure? We can estimate your level with a quick check.',
        button: 'Find my level',
        explanation: 'Quick Placement Assessment is coming soon! Your initial sessions will start at a comfortable B1 baseline and dynamically calibrate based on your responses.'
      },
      goalsQuestion: 'What do you mainly want English for?',
      goals: {
        work: 'Work & Career',
        study: 'Study / University',
        travel: 'Travel',
        communication: 'Communication',
        living_abroad: 'Living abroad',
        content: 'Watching movies & YouTube',
        reading: 'Reading books & articles',
        exams: 'Exams',
        personal_growth: 'Personal growth',
        other: 'Other'
      },
      challengesQuestion: 'What is the biggest thing you want to improve?',
      challenges: {
        speaking_struggle: 'I understand English, but I struggle to speak.',
        unnatural_words: "I know many words, but I can't use them naturally.",
        reading_better_than_speaking: 'I understand written English better than spoken English.',
        native_comprehension: 'I want to understand native speakers better.',
        sound_natural: 'I want to sound more natural.',
        career_need: 'I need English for my career.',
        vocabulary_struggle: 'I struggle with vocabulary.',
        grammar_struggle: 'I struggle with grammar.',
        not_sure_yet: "I'm not sure yet."
      }
    },
    step2: {
      title: "Let's make English more interesting",
      subtitle: 'Your interests and skill priorities guide which learning passages and vocabulary collocations the adaptive engine selects.',
      interestsQuestion: 'What are you interested in?',
      addCustomInterest: '+ Add my own',
      customInterestPlaceholder: 'e.g. Neuroscience, Cooking, Robotics...',
      addBtn: 'Add',
      interests: {
        technology: 'Technology',
        ai: 'AI',
        programming: 'Programming',
        business: 'Business',
        finance: 'Finance',
        gaming: 'Gaming',
        movies_tv: 'Movies & TV',
        music: 'Music',
        sports: 'Sports',
        fitness: 'Fitness',
        science: 'Science',
        psychology: 'Psychology',
        history: 'History',
        travel: 'Travel',
        books: 'Books',
        news: 'News',
        cars: 'Cars',
        food: 'Food',
        fashion: 'Fashion'
      },
      skillsQuestion: 'What would you most like to improve?',
      skillsSubtitle: 'Select skills',
      skills: {
        listening: {
          label: 'Listening',
          description: 'Catch real-speed speech, native cadence, and nuances'
        },
        speaking: {
          label: 'Speaking',
          description: 'Fluidity, shadowing rhythms, and spontaneous recall'
        },
        vocabulary: {
          label: 'Vocabulary',
          description: 'Contextual collocations and precision word retrieval'
        },
        reading: {
          label: 'Reading',
          description: 'Comprehending dense articles, books, and insights'
        },
        writing: {
          label: 'Writing',
          description: 'Clear expression, sentence structures, and cohesion'
        },
        grammar: {
          label: 'Grammar',
          description: 'Internalizing natural syntactic patterns implicitly'
        }
      },
      contentQuestion: 'What kind of content do you enjoy learning from?',
      contentSubtitle: 'Optional — helps recommend source materials',
      content: {
        youtube: 'YouTube videos',
        movies_tv: 'Movies & TV',
        podcasts: 'Podcasts',
        books: 'Books',
        articles: 'Articles',
        conversations: 'Conversations',
        news: 'News',
        social_media: 'Social media',
        academic: 'Academic content'
      }
    },
    step3: {
      title: 'How should we teach you?',
      subtitle: 'Set your preferred balance between challenge, native language support, and implicit grammar discovery.',
      difficultyQuestion: 'How challenging should English feel?',
      difficulty: {
        easy: {
          title: 'Easy — I want to build confidence',
          subtitle: 'Gentle pacing, accessible vocabulary, high positive reinforcement'
        },
        balanced: {
          title: 'Balanced — challenge me without overwhelming me',
          subtitle: 'A healthy mix of familiar patterns and moderate stretch exercises'
        },
        challenging: {
          title: 'Challenging — push me',
          subtitle: 'Steeper complexity, native nuance, and rigorous retrieval tests'
        }
      },
      languageSupportQuestion: 'How much help do you want in your native language?',
      languageSupport: {
        mostly_english: 'Mostly English',
        occasional_translation: 'English with occasional translation',
        native_language_explanations: 'Explain difficult things in my language',
        translate_when_stuck: "Translate when I'm stuck"
      },
      grammarQuestion: 'How should we handle grammar?',
      grammar: {
        implicit: {
          title: 'Learn grammar naturally through practice',
          description: 'Implicit pattern recognition during sentence construction and reading.'
        },
        repeated_mistakes: {
          title: 'Explain grammar when I make repeated mistakes',
          description: 'Targeted corrective insights only when a recurring blindspot occurs.'
        },
        on_demand: {
          title: 'Give me focused grammar lessons when I ask',
          description: 'Stay focused on flow, but make deep structural breakdowns available.'
        },
        regular: {
          title: 'I want regular grammar practice',
          description: 'Include deliberate syntax and structure reinforcement in exercises.'
        }
      }
    },
    final: {
      title: "You're ready.",
      lead: "That's enough for us to start personalizing your English learning.",
      description: "Your schedule doesn't have to be fixed. Whenever you have a few minutes, we'll figure out what can help you most.",
      startLearningBtn: 'Start Learning',
      adjustPreferences: 'Adjust preferences',
      profileSummary: 'Learner Profile Initialized',
      levelLabel: 'Baseline Level',
      skillsLabel: 'Skill Focus',
      difficultyLabel: 'Difficulty Mode',
      interestsLabel: 'Active Interests',
      goalsLabel: 'Main Goals'
    }
  },
  settings: {
    title: 'Application Settings',
    subtitle: 'Learner Profile, Theme & Interface Language',
    learnerProfile: 'Learner Profile',
    editProfile: 'Edit Profile / Onboarding',
    interfaceLanguage: 'Interface Language',
    learningLanguage: 'Learning Language',
    supportLanguage: 'Support Language',
    theme: 'Appearance / Theme',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    aiConfig: 'Local AI Provider (Ollama)',
    resetProfile: 'Reset Learner Profile',
    resetAllData: 'Reset All Learner Data',
    resetConfirm: 'Are you sure you want to permanently reset all learner data? This will remove your profile, sources, sessions, and learning progress.'
  },
  home: {
    heroBadge: 'Dynamic multi-skill practice tailored to your time',
    heroTitle: 'Turn your reading material into adaptive learning.',
    heroSubtitle: 'No rigid courses or pre-baked tracks. Choose any text you are reading, set how many minutes you have right now, and begin.',
    nextDecision: {
      sectionTitle: 'Recommended Next Step',
      whyThis: 'Why this recommendation?',
      chooseTime: 'Session Duration:',
      minutesShort: 'min',
      resumeTitle: 'Resume Your Session',
      reviewTitle: 'Targeted Spaced Review',
      continueTitle: 'Continue Your Material',
      newTitle: 'Start Fresh Practice',
      addTitle: 'Add Reading Material',
      resumeBtn: 'Resume Session',
      reviewBtn: 'Review Developing Items',
      continueBtn: 'Continue Learning',
      newBtn: 'Start Practice Session',
      addBtn: 'Add Custom Source',
      discardBtn: 'Discard In-Progress Session'
    },
    activeSession: {
      title: 'In-Progress Session',
      subtitle: 'You have an unfinished practice session.',
      resumeBtn: 'Resume Session',
      discardBtn: 'Discard',
      activityProgress: 'Activity'
    },
    recommendations: {
      title: 'Next Adaptive Step',
      reviewTitle: 'Targeted Review Recommended',
      reviewDesc: 'You have developing words and phrases ready for spaced reinforcement.',
      startReview: 'Practice Review Items',
      exploreTitle: 'Ready for New Exploration',
      exploreDesc: 'All previous items are consolidated. Pick any source to acquire new vocabulary.'
    },
    history: {
      title: 'Recent Learning History',
      subtitle: 'Your completed practice units and mastery progression',
      empty: 'No completed sessions yet. Start your first session above!',
      accuracy: 'Accuracy',
      mastery: 'Mastery',
      duration: 'Duration',
      completedOn: 'Completed'
    },
    principles: {
      timeTitle: 'Time-Adaptive Sessions',
      timeDesc: 'Whether you have 3, 5, 10, or 20 minutes, the session adapts its density to fit your exact window.',
      noDecisionsTitle: 'No Skill Decisions Needed',
      noDecisionsDesc: 'The system dynamically blends vocabulary recall, listening, implicit syntax, and shadowing seamlessly.',
      implicitTitle: 'Implicit Over Rigid Rules',
      implicitDesc: 'Grammar is learned naturally through calibrated sentence correction, with explicit rule tips available on request.'
    },
    sourcesTitle: 'Learning Sources',
    sourcesSubtitle: 'Select any material to inspect or launch a practice cycle',
    addSourceBtn: 'Add Source',
    noSourcesTitle: 'No learning sources found.',
    noSourcesDesc: 'Add your first text excerpt, article passage, or book notes to begin generating exercises.',
    addFirstSource: 'Add First Source',
    inspectAndPractice: 'Inspect & Practice',
    statusAnalyzing: 'Analyzing...',
    statusFailed: 'Needs Analysis',
    statusReady: 'Ready'
  },
  addSource: {
    title: 'Learn from something you already care about',
    subtitle: "Paste a piece of English content and we'll turn it into a short learning session.",
    contentLabel: 'English Text',
    contentPlaceholder: 'Paste your English text here...',
    sourceTitleLabel: 'What is this about? (optional)',
    sourceTitlePlaceholder: 'e.g. Climate article, Work email, Tech report...',
    analyzeBtn: 'Analyze',
    analyzing: 'Analyzing your English text...',
    analyzingDesc: 'Extracting salient vocabulary, natural collocations, comprehension prompts, and syntactic patterns...',
    wordCount: 'words',
    validation: {
      emptyText: 'Add some English text first.',
      tooShort: 'Add a little more text (at least 5 words) so we can analyze it.',
      tooLong: 'This text is too long for one source. Try adding a smaller section (maximum ~2,500 words).',
      noEnglishWords: 'Please make sure the text contains English words.'
    }
  },
  sourceDetails: {
    backToSources: 'Back to Sources',
    estimatedLevel: 'Estimated Level',
    words: 'words',
    summary: 'Summary',
    learningAssets: 'Extracted Learning Assets',
    startPractice: 'Start Practice',
    analyzingTitle: 'Analyzing Material...',
    analyzingSub: 'Extracting adaptive vocabulary, syntactic structures, and comprehension prompts.',
    failedTitle: 'Analysis Incomplete',
    failedDesc: 'We encountered an issue during deep analysis. Your original text is safely saved.',
    retryAnalysis: 'Retry Analysis',
    viewOriginalText: 'View Original Text',
    hideOriginalText: 'Hide Original Text',
    deleteSource: 'Delete Source',
    deleteConfirm: 'Are you sure you want to delete this source?',
    noAnalysisYet: 'This source has not been analyzed yet.',
    analyzeNow: 'Analyze Now',
    recommendedFocus: 'Recommended Focus',
    tabs: {
      vocabulary: 'Vocabulary',
      phrases: 'Useful Phrases',
      comprehension: 'Comprehension',
      speaking: 'Speaking',
      grammar: 'Grammar'
    },
    counts: {
      vocabCount: 'terms',
      phrasesCount: 'phrases',
      questionsCount: 'questions',
      promptsCount: 'prompts',
      grammarCount: 'patterns'
    },
    labels: {
      meaning: 'Meaning / Definition',
      contextExample: 'Context in Material',
      explanation: 'Explanation',
      correctAnswer: 'Correct Answer',
      speakingPrompt: 'Oral Production Prompt',
      relatedConcept: 'Related Concept',
      guidance: 'Delivery Guidance',
      grammarPattern: 'Pattern',
      example: 'Example from Material',
      relevance: 'Functional Relevance'
    }
  }
};
