import React, { useState } from 'react';
import { InterfaceLanguage } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { Globe, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

interface LanguageSelectScreenProps {
  onContinue: (selectedLang: InterfaceLanguage) => void;
}

export const LanguageSelectScreen: React.FC<LanguageSelectScreenProps> = ({
  onContinue
}) => {
  const { language, setLanguage, isRTL } = useLanguage();
  const [selected, setSelected] = useState<InterfaceLanguage>(language || 'en');

  const handleSelect = (lang: InterfaceLanguage) => {
    setSelected(lang);
    setLanguage(lang);
  };

  const handleProceed = () => {
    setLanguage(selected);
    onContinue(selected);
  };

  return (
    <div
      id="language-select-screen"
      className="max-w-md mx-auto w-full py-10 sm:py-16 px-4 transition-colors"
      dir={selected === 'fa' ? 'rtl' : 'ltr'}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="p-6 sm:p-8 rounded-3xl border shadow-xs space-y-8"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)'
        }}
      >
        {/* Globe Badge Header */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xs"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <Globe className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <h1
              className="text-xl sm:text-2xl font-semibold tracking-tight"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {selected === 'fa' ? 'زبان برنامه را انتخاب کنید' : 'Which language should we use?'}
            </h1>
            <p className="text-xs sm:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {selected === 'fa'
                ? 'زبان راهنماها و منوهای برنامه را مشخص کنید.'
                : 'Choose the language for guides, menus, and explanations.'}
            </p>
          </div>
        </div>

        {/* Language Options: English & Persian */}
        <div
          role="radiogroup"
          aria-label={selected === 'fa' ? 'انتخاب زبان رابط کاربری' : 'Interface language selection'}
          className="space-y-3"
        >
          {/* English Option */}
          <button
            id="lang-option-en"
            type="button"
            role="radio"
            aria-checked={selected === 'en'}
            onClick={() => handleSelect('en')}
            className="w-full p-4 rounded-2xl border text-left rtl:text-right transition-all flex items-center justify-between group cursor-pointer focus:outline-none focus-visible:ring-2"
            style={{
              backgroundColor:
                selected === 'en'
                  ? 'var(--color-accent-subtle)'
                  : 'var(--color-surface)',
              borderColor:
                selected === 'en'
                  ? 'var(--color-accent)'
                  : 'var(--color-border)'
            }}
          >
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <span className="text-2xl">🇬🇧</span>
              <div>
                <span
                  className="font-semibold text-sm sm:text-base block"
                  style={{
                    color:
                      selected === 'en'
                        ? 'var(--color-accent)'
                        : 'var(--color-text-primary)'
                  }}
                >
                  English
                </span>
                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  English interface
                </span>
              </div>
            </div>

            <div
              className="w-5 h-5 rounded-full border flex items-center justify-center transition-colors"
              style={{
                backgroundColor:
                  selected === 'en' ? 'var(--color-accent)' : 'transparent',
                borderColor:
                  selected === 'en' ? 'var(--color-accent)' : 'var(--color-border)'
              }}
            >
              {selected === 'en' && (
                <Check className="w-3 h-3 text-white stroke-[3]" />
              )}
            </div>
          </button>

          {/* Persian Option */}
          <button
            id="lang-option-fa"
            type="button"
            role="radio"
            aria-checked={selected === 'fa'}
            onClick={() => handleSelect('fa')}
            className="w-full p-4 rounded-2xl border text-left rtl:text-right transition-all flex items-center justify-between group cursor-pointer focus:outline-none focus-visible:ring-2"
            style={{
              backgroundColor:
                selected === 'fa'
                  ? 'var(--color-accent-subtle)'
                  : 'var(--color-surface)',
              borderColor:
                selected === 'fa'
                  ? 'var(--color-accent)'
                  : 'var(--color-border)'
            }}
          >
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <span className="text-2xl">🇮🇷</span>
              <div>
                <span
                  className="font-semibold text-sm sm:text-base block"
                  style={{
                    color:
                      selected === 'fa'
                        ? 'var(--color-accent)'
                        : 'var(--color-text-primary)'
                  }}
                >
                  فارسی
                </span>
                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  محیط و راهنماهای فارسی
                </span>
              </div>
            </div>

            <div
              className="w-5 h-5 rounded-full border flex items-center justify-center transition-colors"
              style={{
                backgroundColor:
                  selected === 'fa' ? 'var(--color-accent)' : 'transparent',
                borderColor:
                  selected === 'fa' ? 'var(--color-accent)' : 'var(--color-border)'
              }}
            >
              {selected === 'fa' && (
                <Check className="w-3 h-3 text-white stroke-[3]" />
              )}
            </div>
          </button>
        </div>

        {/* Primary CTA */}
        <div className="pt-2">
          <button
            id="language-continue-btn"
            type="button"
            onClick={handleProceed}
            className="w-full py-3.5 px-6 text-white font-medium rounded-xl shadow-xs hover:shadow transition-all inline-flex items-center justify-center space-x-2 rtl:space-x-reverse text-sm sm:text-base cursor-pointer"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <span>{selected === 'fa' ? 'ادامه' : 'Continue'}</span>
            {selected === 'fa' ? (
              <ArrowLeft className="w-4 h-4 mr-1" />
            ) : (
              <ArrowRight className="w-4 h-4 ml-1" />
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
