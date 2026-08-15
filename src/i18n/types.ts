export type InterfaceLanguage = 'en' | 'fa';
export type LearningLanguage = 'en';
export type SupportLanguage = 'en' | 'fa';

export type TranslationKey = string;

export interface TranslationDictionary {
  [key: string]: string | TranslationDictionary;
}
