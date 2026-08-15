import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { InterfaceLanguage } from './types';
import { en } from './translations/en';
import { fa } from './translations/fa';

interface LanguageContextType {
  language: InterfaceLanguage;
  setLanguage: (lang: InterfaceLanguage) => void;
  dir: 'ltr' | 'rtl';
  isRTL: boolean;
  t: (path: string, fallback?: string) => string;
}

const STORAGE_KEY_LANGUAGE = 'adaptive_english_lang_v1';

const dictionaries: Record<InterfaceLanguage, Record<string, any>> = {
  en,
  fa
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<InterfaceLanguage>(() => {
    if (typeof window === 'undefined') return 'en';
    const saved = localStorage.getItem(STORAGE_KEY_LANGUAGE) as InterfaceLanguage | null;
    if (saved === 'en' || saved === 'fa') {
      return saved;
    }
    return 'en';
  });

  const dir: 'ltr' | 'rtl' = language === 'fa' ? 'rtl' : 'ltr';
  const isRTL = dir === 'rtl';

  // Apply html dir and lang attributes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      document.documentElement.dir = dir;
    }
  }, [language, dir]);

  const setLanguage = useCallback((newLang: InterfaceLanguage) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY_LANGUAGE, newLang);
    } catch (e) {
      console.error('Failed to save language preference:', e);
    }
  }, []);

  const t = useCallback((path: string, fallback?: string): string => {
    const dict = dictionaries[language] || dictionaries.en;
    const parts = path.split('.');
    
    let current: any = dict;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        current = undefined;
        break;
      }
    }

    if (typeof current === 'string') {
      return current;
    }

    // Fallback to English dictionary if missing in current
    if (language !== 'en') {
      let enCurrent: any = dictionaries.en;
      for (const part of parts) {
        if (enCurrent && typeof enCurrent === 'object' && part in enCurrent) {
          enCurrent = enCurrent[part];
        } else {
          enCurrent = undefined;
          break;
        }
      }
      if (typeof enCurrent === 'string') {
        return enCurrent;
      }
    }

    return fallback !== undefined ? fallback : path;
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    dir,
    isRTL,
    t
  }), [language, setLanguage, dir, isRTL, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
