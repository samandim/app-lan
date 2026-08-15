import React, { useState, useEffect } from 'react';
import { CalibrationRunner, CalibrationReport } from '../services/calibration/learningScenarios';
import {
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  Brain,
  Sliders,
  ShieldCheck,
  Zap,
  Activity,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CalibrationQAModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CalibrationQAModal: React.FC<CalibrationQAModalProps> = ({ isOpen, onClose }) => {
  const [report, setReport] = useState<CalibrationReport | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'all' | 'passed' | 'failed'>('all');
  const [expandedScenarioId, setExpandedScenarioId] = useState<string | null>(null);

  const runQA = async () => {
    setIsRunning(true);
    try {
      const res = await CalibrationRunner.runCalibrationSuite();
      setReport(res);
      if (res.scenarioResults.length > 0) {
        setExpandedScenarioId(res.scenarioResults[0].scenarioId);
      }
    } catch (e) {
      console.error('Calibration QA run error:', e);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (isOpen && !report && !isRunning) {
      runQA();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredScenarios = report?.scenarioResults.filter(s => {
    if (activeTab === 'passed') return s.passed;
    if (activeTab === 'failed') return !s.passed;
    return true;
  }) || [];

  return (
    <div
      id="calibration-qa-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity"
    >
      <motion.div
        id="calibration-qa-modal-container"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-colors"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-primary)'
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center space-x-3">
            <div
              className="p-2 rounded-xl border flex items-center justify-center"
              style={{
                backgroundColor: 'var(--color-accent-subtle)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-accent)'
              }}
            >
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-semibold tracking-tight">Adaptive Learning Calibration & QA Engine</h2>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border tracking-wider"
                  style={{
                    backgroundColor: 'var(--color-accent-subtle)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-accent)'
                  }}
                >
                  Phase 6 End-to-End
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Systematic verification of pedagogical decisions, state stability, and evaluation determinism
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="run-calibration-tests-btn"
              type="button"
              onClick={runQA}
              disabled={isRunning}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: '#ffffff'
              }}
            >
              {isRunning ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>Running Suite...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Calibration Tests</span>
                </>
              )}
            </button>

            <button
              id="close-calibration-qa-modal-btn"
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border hover:opacity-80 transition-opacity cursor-pointer"
              style={{
                backgroundColor: 'var(--color-surface-secondary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)'
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Bar */}
        {report && (
          <div
            className="px-6 py-3 border-b flex flex-wrap items-center justify-between gap-4 text-xs"
            style={{
              backgroundColor: report.allPassed ? 'rgba(34, 197, 94, 0.06)' : 'rgba(239, 68, 68, 0.06)',
              borderColor: 'var(--color-border)'
            }}
          >
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1.5 font-medium">
                {report.allPassed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                )}
                <span>
                  {report.allPassed
                    ? `All ${report.totalScenarios} Calibration Scenarios Passed Flawlessly`
                    : `${report.passedScenarios}/${report.totalScenarios} Scenarios Passed`}
                </span>
              </div>
              <span className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
                Ran at {new Date(report.timestamp).toLocaleTimeString()}
              </span>
            </div>

            {/* Filter Tabs */}
            <div
              className="flex items-center p-0.5 rounded-lg border text-xs"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)'
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer font-medium ${
                  activeTab === 'all' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
                }`}
                style={
                  activeTab === 'all'
                    ? { backgroundColor: 'var(--color-surface-secondary)', color: 'var(--color-text-primary)' }
                    : { color: 'var(--color-text-secondary)' }
                }
              >
                All ({report.totalScenarios})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('passed')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer font-medium ${
                  activeTab === 'passed' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
                }`}
                style={
                  activeTab === 'passed'
                    ? { backgroundColor: 'var(--color-surface-secondary)', color: 'var(--color-text-primary)' }
                    : { color: 'var(--color-text-secondary)' }
                }
              >
                Passed ({report.passedScenarios})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('failed')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer font-medium ${
                  activeTab === 'failed' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
                }`}
                style={
                  activeTab === 'failed'
                    ? { backgroundColor: 'var(--color-surface-secondary)', color: 'var(--color-text-primary)' }
                    : { color: 'var(--color-text-secondary)' }
                }
              >
                Failed ({report.failedScenarios})
              </button>
            </div>
          </div>
        )}

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3.5">
          {isRunning ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <RotateCcw className="w-8 h-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
              <p className="text-sm font-medium">Executing multi-stage pedagogical calibration scenarios...</p>
              <p className="text-xs text-center max-w-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Evaluating state stability, objective alignment, fuzzy matching, and progressive scaffolding escalation
              </p>
            </div>
          ) : filteredScenarios.length === 0 ? (
            <div className="py-16 text-center text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              No calibration scenarios match the selected filter.
            </div>
          ) : (
            filteredScenarios.map((scenario) => {
              const isExpanded = expandedScenarioId === scenario.scenarioId;
              return (
                <div
                  key={scenario.scenarioId}
                  id={`scenario-card-${scenario.scenarioId}`}
                  className="rounded-xl border transition-all overflow-hidden"
                  style={{
                    backgroundColor: 'var(--color-surface-secondary)',
                    borderColor: scenario.passed ? 'var(--color-border)' : 'rgba(239, 68, 68, 0.4)'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedScenarioId(isExpanded ? null : scenario.scenarioId)}
                    className="w-full px-4 py-3.5 flex items-center justify-between text-left cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <div className="flex items-center space-x-3">
                      {scenario.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      )}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-semibold">{scenario.scenarioName}</span>
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-md border font-medium"
                            style={{
                              backgroundColor: 'var(--color-surface)',
                              borderColor: 'var(--color-border)',
                              color: 'var(--color-text-secondary)'
                            }}
                          >
                            {scenario.category}
                          </span>
                        </div>
                        {scenario.details && (
                          <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                            {scenario.details}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <span className="text-[11px] font-mono" style={{ color: 'var(--color-text-tertiary)' }}>
                        {scenario.executionTimeMs}ms
                      </span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                        style={{
                          backgroundColor: scenario.passed ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: scenario.passed ? '#16a34a' : '#e11d48'
                        }}
                      >
                        {scenario.passed ? 'Passed' : 'Failed'}
                      </span>
                    </div>
                  </button>

                  {/* Expanded Assertions */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 pb-4 pt-1 border-t space-y-2 text-xs"
                        style={{
                          backgroundColor: 'var(--color-surface)',
                          borderColor: 'var(--color-border)'
                        }}
                      >
                        <div className="text-[11px] font-semibold uppercase tracking-wider mt-2 mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
                          Deterministic Assertions ({scenario.assertions.filter(a => a.passed).length}/{scenario.assertions.length})
                        </div>
                        {scenario.assertions.map((assertion, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg border flex items-start justify-between space-x-3 text-[11px]"
                            style={{
                              backgroundColor: assertion.passed ? 'rgba(34, 197, 94, 0.04)' : 'rgba(239, 68, 68, 0.04)',
                              borderColor: assertion.passed ? 'var(--color-border)' : 'rgba(239, 68, 68, 0.3)'
                            }}
                          >
                            <div className="flex items-start space-x-2">
                              {assertion.passed ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                              )}
                              <div>
                                <span className="font-medium text-xs block">{assertion.name}</span>
                                <div className="mt-1 space-y-0.5 font-mono text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                                  <div>Expected: <span className="text-emerald-600 dark:text-emerald-400">{assertion.expected}</span></div>
                                  <div>Actual: <span className={assertion.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}>{assertion.actual}</span></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-3 border-t flex items-center justify-between text-xs"
          style={{
            backgroundColor: 'var(--color-surface-secondary)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)'
          }}
        >
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Pedagogical Calibration Suite v1.0 • In-memory validation engine</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border font-medium hover:opacity-80 transition-opacity cursor-pointer"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
          >
            Close QA Inspector
          </button>
        </div>
      </motion.div>
    </div>
  );
};
