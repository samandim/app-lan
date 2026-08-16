import React, { useState, useEffect } from 'react';
import { AIService } from '../services/ai';
import { OllamaConfig, UserProfile, InterfaceLanguage } from '../types';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { LocalRepository } from '../services/store';
import {
  Settings,
  Server,
  Cpu,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Sun,
  Moon,
  Laptop,
  User,
  Sparkles,
  Globe,
  RotateCcw
} from 'lucide-react';

interface OllamaSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: UserProfile | null;
  onOpenOnboarding?: () => void;
  onResetProfile?: () => void;
}

export const OllamaSettingsModal: React.FC<OllamaSettingsModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onOpenOnboarding,
  onResetProfile
}) => {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, isRTL, t } = useLanguage();
  const [config, setConfig] = useState<OllamaConfig>(AIService.getConfig());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
    availableModels?: string[];
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfig(AIService.getConfig());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    AIService.updateConfig(config);
    onClose();
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    AIService.updateConfig(config);
    const res = await AIService.checkHealth();
    setTestResult(res);
    setIsTesting(false);
  };

  const handleLanguageChange = (lang: InterfaceLanguage) => {
    setLanguage(lang);
    if (userProfile) {
      LocalRepository.saveUserProfile({ interfaceLanguage: lang });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div
        id="settings-modal-card"
        className="rounded-2xl border shadow-xl max-w-md w-full p-6 space-y-5 transition-colors my-8"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-primary)'
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between pb-3 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
            <div
              className="p-2 rounded-xl"
              style={{
                backgroundColor: 'var(--color-accent-subtle)',
                color: 'var(--color-accent)'
              }}
            >
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                {t('settings.title')}
              </h3>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {t('settings.subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors cursor-pointer"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section: Interface Language Switcher */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
              <Globe className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                {t('settings.interfaceLanguage')}
              </label>
            </div>
            <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
              {language === 'fa' ? 'فارسی' : 'English'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleLanguageChange('en')}
              className="py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center space-x-2 rtl:space-x-reverse transition-all cursor-pointer"
              style={{
                backgroundColor: language === 'en' ? 'var(--color-accent-subtle)' : 'var(--color-surface-secondary)',
                borderColor: language === 'en' ? 'var(--color-accent)' : 'var(--color-border)',
                color: language === 'en' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                fontWeight: language === 'en' ? 600 : 500
              }}
            >
              <span>🇬🇧</span>
              <span>English</span>
            </button>

            <button
              type="button"
              onClick={() => handleLanguageChange('fa')}
              className="py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center space-x-2 rtl:space-x-reverse transition-all cursor-pointer"
              style={{
                backgroundColor: language === 'fa' ? 'var(--color-accent-subtle)' : 'var(--color-surface-secondary)',
                borderColor: language === 'fa' ? 'var(--color-accent)' : 'var(--color-border)',
                color: language === 'fa' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                fontWeight: language === 'fa' ? 600 : 500
              }}
            >
              <span>🇮🇷</span>
              <span>فارسی</span>
            </button>
          </div>
        </div>

        {/* Section: Learner Profile Overview */}
        {userProfile && (
          <div className="space-y-2.5 text-xs pb-3 border-b border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 rtl:space-x-reverse font-semibold">
                <User className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
                <span style={{ color: 'var(--color-text-primary)' }}>{t('settings.learnerProfile')}</span>
              </div>
              {onOpenOnboarding && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenOnboarding();
                  }}
                  className="text-[11px] font-semibold underline cursor-pointer"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {t('settings.editProfile')}
                </button>
              )}
            </div>

            <div
              className="p-3 rounded-xl border space-y-2 text-[11px]"
              style={{
                backgroundColor: 'var(--color-surface-secondary)',
                borderColor: 'var(--color-border)'
              }}
            >
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--color-text-secondary)' }}>{t('onboarding.final.levelLabel')}:</span>
                <span className="font-semibold font-mono px-2 py-0.5 rounded border" style={{
                  backgroundColor: 'var(--color-accent-subtle)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-accent)'
                }}>
                  {userProfile.level.toUpperCase()} ({userProfile.levelSource.replace('_', ' ')})
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--color-text-secondary)' }}>{t('onboarding.final.skillsLabel')}:</span>
                <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {userProfile.skillPriorities.slice(0, 3).map(s => t(`onboarding.step2.skills.${s}.label`, s)).join(', ')}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--color-text-secondary)' }}>{t('onboarding.final.difficultyLabel')}:</span>
                <span className="font-medium capitalize" style={{ color: 'var(--color-text-primary)' }}>
                  {t(`onboarding.step3.difficulty.${userProfile.difficultyPreference}.title`, userProfile.difficultyPreference)}
                </span>
              </div>

              {userProfile.interests && userProfile.interests.length > 0 && (
                <div>
                  <span className="block mb-1 text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                    {t('onboarding.final.interestsLabel')}:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {userProfile.interests.slice(0, 4).map((interest, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.5 rounded border text-[10px]"
                        style={{
                          backgroundColor: 'var(--color-surface)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text-secondary)'
                        }}
                      >
                        {t(`onboarding.step2.interests.${interest}`, interest)}
                      </span>
                    ))}
                    {userProfile.interests.length > 4 && (
                      <span className="text-[10px] self-center" style={{ color: 'var(--color-text-tertiary)' }}>
                        +{userProfile.interests.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {onResetProfile && (
                <div className="pt-2 border-t flex justify-end" style={{ borderColor: 'var(--color-border)' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(t('settings.resetConfirm'))) {
                        onResetProfile();
                        onClose();
                      }
                    }}
                    className="text-[10px] text-red-500 hover:underline inline-flex items-center space-x-1 rtl:space-x-reverse cursor-pointer font-medium"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{t('settings.resetAllData')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section: Appearance / Theme */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
            {t('settings.theme')}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { mode: 'light' as ThemeMode, label: t('settings.light'), icon: Sun },
              { mode: 'dark' as ThemeMode, label: t('settings.dark'), icon: Moon },
              { mode: 'system' as ThemeMode, label: t('settings.system'), icon: Laptop }
            ].map(({ mode, label, icon: Icon }) => {
              const isSelected = theme === mode;
              return (
                <button
                  key={mode}
                  id={`theme-btn-${mode}`}
                  type="button"
                  onClick={() => setTheme(mode)}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center space-x-1.5 rtl:space-x-reverse transition-all cursor-pointer ${
                    isSelected ? 'shadow-xs' : ''
                  }`}
                  style={{
                    backgroundColor: isSelected
                      ? 'var(--color-accent-subtle)'
                      : 'var(--color-surface-secondary)',
                    borderColor: isSelected
                      ? 'var(--color-accent)'
                      : 'var(--color-border)',
                    color: isSelected
                      ? 'var(--color-accent)'
                      : 'var(--color-text-secondary)',
                    fontWeight: isSelected ? 600 : 500
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section: Local AI Runtime Configuration */}
        <div className="space-y-3.5 text-xs pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
            <Server className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
            <span className="font-semibold uppercase tracking-wider text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
              {t('settings.aiConfig')}
            </span>
          </div>

          <div>
            <label className="block font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
              Ollama Base URL
            </label>
            <input
              type="text"
              value={config.baseUrl}
              onChange={e => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
              placeholder="http://localhost:11434"
              className="w-full px-3 py-2 border rounded-xl font-mono text-xs focus:outline-none transition-colors"
              style={{
                backgroundColor: 'var(--color-surface-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
            />
            <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
              Default: <code className="font-mono">http://localhost:11434</code>
            </p>
          </div>

          <div>
            <label className="block font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
              Model Name
            </label>
            <input
              type="text"
              value={config.model}
              onChange={e => setConfig(prev => ({ ...prev, model: e.target.value }))}
              placeholder="llama3.2, mistral, qwen2.5, phi3..."
              className="w-full px-3 py-2 border rounded-xl font-mono text-xs focus:outline-none transition-colors"
              style={{
                backgroundColor: 'var(--color-surface-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
            />
            <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
              Any model installed in Ollama (e.g. <code>llama3.2</code>, <code>mistral</code>, <code>qwen2.5</code>).
            </p>
          </div>

          {/* Test connection results */}
          {testResult && (
            <div
              className="p-3 rounded-xl border text-xs"
              style={{
                backgroundColor: testResult.ok
                  ? 'var(--color-success-subtle)'
                  : 'var(--color-error-subtle)',
                borderColor: testResult.ok
                  ? 'var(--color-success)'
                  : 'var(--color-error)',
                color: testResult.ok
                  ? 'var(--color-success)'
                  : 'var(--color-error)'
              }}
            >
              <div className="flex items-start space-x-2 rtl:space-x-reverse">
                {testResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-semibold">{testResult.message}</p>
                  {testResult.availableModels && testResult.availableModels.length > 0 && (
                    <div>
                      <span className="text-[11px] opacity-80">Detected models:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {testResult.availableModels.map(m => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setConfig(prev => ({ ...prev, model: m }))}
                            className="px-1.5 py-0.5 border font-mono text-[10px] rounded-lg transition-colors cursor-pointer"
                            style={{
                              backgroundColor: 'var(--color-surface)',
                              borderColor: 'var(--color-border)',
                              color: 'var(--color-text-primary)'
                            }}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CORS Hint */}
          <div
            className="p-3 border rounded-xl text-[11px] space-y-1"
            style={{
              backgroundColor: 'var(--color-surface-secondary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)'
            }}
          >
            <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Connecting from browser to Ollama:
            </p>
            <p>If your browser blocks requests due to CORS, start Ollama with:</p>
            <code
              className="block p-1.5 rounded-lg border font-mono"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
            >
              OLLAMA_ORIGINS="*" ollama serve
            </code>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className="flex items-center justify-between pt-2 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors inline-flex items-center space-x-1.5 rtl:space-x-reverse cursor-pointer"
            style={{
              backgroundColor: 'var(--color-surface-secondary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            <span>Test Connection</span>
          </button>

          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded-xl cursor-pointer"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              {t('common.saveChanges')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
