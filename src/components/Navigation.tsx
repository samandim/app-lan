import React from 'react';
import { Sparkles, BookOpen, Clock, Plus, Settings, Sun, Moon, Globe } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';

interface NavigationProps {
  currentScreen: string;
  onGoHome: () => void;
  onAddSource: () => void;
  onOpenSettings?: () => void;
  onOpenCalibrationQA?: () => void;
  sourcesCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentScreen,
  onGoHome,
  onAddSource,
  onOpenSettings,
  onOpenCalibrationQA,
  sourcesCount
}) => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const { language, setLanguage, isRTL, t } = useLanguage();

  const toggleLanguage = () => {
    const nextLang = language === 'fa' ? 'en' : 'fa';
    setLanguage(nextLang);
  };

  return (
    <header
      id="app-header"
      className="border-b sticky top-0 z-40 backdrop-blur-md transition-colors"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        opacity: 0.96
      }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand & Logo */}
        <button
          id="nav-brand-btn"
          onClick={onGoHome}
          className="flex items-center space-x-3 rtl:space-x-reverse text-left rtl:text-right group focus:outline-none cursor-pointer"
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-medium shadow-xs transition-colors shrink-0"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <span className="text-base font-serif italic">æ</span>
          </div>
          <div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <span
                className="font-semibold tracking-tight text-sm sm:text-base"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {t('common.appName')}
              </span>
              <span
                className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border"
                style={{
                  backgroundColor: 'var(--color-accent-subtle)',
                  color: 'var(--color-accent)',
                  borderColor: 'var(--color-border)'
                }}
              >
                Local-First
              </span>
            </div>
            <p
              className="text-[11px] hidden sm:block"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {language === 'fa'
                ? 'جلسات یادگیری تطبیقی بر اساس زمان و متن شما'
                : 'Time-adaptive sessions from your custom text'}
            </p>
          </div>
        </button>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 rtl:space-x-reverse">
          {/* Quick Language Toggle */}
          <button
            id="nav-language-toggle-btn"
            type="button"
            onClick={toggleLanguage}
            className="px-2.5 py-1.5 rounded-xl border transition-colors flex items-center space-x-1 rtl:space-x-reverse text-xs font-semibold cursor-pointer"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-surface-secondary)',
              color: 'var(--color-text-primary)'
            }}
            title={language === 'fa' ? 'Switch to English' : 'تغییر زبان به فارسی'}
            aria-label="Toggle language"
          >
            <Globe className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
            <span>{language === 'fa' ? 'EN' : 'فا'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            id="nav-theme-toggle-btn"
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl border transition-colors flex items-center justify-center cursor-pointer"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-surface-secondary)',
              color: 'var(--color-text-secondary)'
            }}
            title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`}
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
          </button>

          {/* Calibration QA Trigger */}
          {onOpenCalibrationQA && (
            <button
              id="nav-calibration-qa-btn"
              type="button"
              onClick={onOpenCalibrationQA}
              className="p-2 sm:px-3 sm:py-2 rounded-xl border transition-colors inline-flex items-center space-x-1.5 rtl:space-x-reverse text-xs font-semibold cursor-pointer"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-accent-subtle)',
                color: 'var(--color-accent)'
              }}
              title="Run Adaptive Learning Engine Calibration & End-to-End QA Suite"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Calibration QA</span>
            </button>
          )}

          {/* Settings Trigger */}
          {onOpenSettings && (
            <button
              id="nav-settings-btn"
              type="button"
              onClick={onOpenSettings}
              className="p-2 sm:px-3 sm:py-2 rounded-xl border transition-colors inline-flex items-center space-x-1.5 rtl:space-x-reverse text-xs font-medium cursor-pointer"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface-secondary)',
                color: 'var(--color-text-secondary)'
              }}
              title={t('settings.title')}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">{t('common.settings')}</span>
            </button>
          )}

          {currentScreen !== 'add-source' &&
            currentScreen !== 'session' &&
            currentScreen !== 'onboarding' &&
            currentScreen !== 'language-select' && (
              <button
                id="nav-add-source-btn"
                onClick={onAddSource}
                className="inline-flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-2 text-xs font-medium rounded-xl transition-colors border cursor-pointer"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-surface-secondary)',
                  color: 'var(--color-text-primary)'
                }}
              >
                <Plus className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
                <span>{t('home.addSourceBtn')}</span>
              </button>
            )}

          {currentScreen !== 'home' &&
            currentScreen !== 'session' &&
            currentScreen !== 'onboarding' &&
            currentScreen !== 'language-select' && (
              <button
                id="nav-home-btn"
                onClick={onGoHome}
                className="text-xs font-medium px-2.5 py-2 rounded-xl transition-colors cursor-pointer"
                style={{
                  color: 'var(--color-text-secondary)'
                }}
              >
                {t('common.home')}
              </button>
            )}
        </div>
      </div>
    </header>
  );
};
