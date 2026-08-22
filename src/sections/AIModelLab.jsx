import { useState, useEffect, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { getAIDiagnostics, testAIModel, fetchFreeModels, getModelCapabilities, resetAIDiagnostics } from '../lib/services/AIService.js';
import { AI_PROVIDERS, KNOWN_FREE_MODELS, maskKey } from '../lib/ai-providers.js';
import { secureGet } from '../lib/secure-storage.js';

function timeAgo(ts) {
  if (!ts) return 'NEVER';
  const diff = Date.now() - ts;
  if (diff < 60000) return 'JUST NOW';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}M AGO`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}H AGO`;
  return `${Math.floor(diff / 86400000)}D AGO`;
}

export default function AIModelLab() {
  const { aiConfig, setAiConfig, showToast } = usePlayer();
  const [diagnostics, setDiagnostics] = useState(getAIDiagnostics());
  const [models, setModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [capabilities, setCapabilities] = useState(null);

  const apiKey = secureGet('ai_api_key') || aiConfig.apiKey;
  const provider = aiConfig.provider;
  const model = aiConfig.model;

  // Refresh diagnostics
  const refreshDiagnostics = useCallback(() => {
    setDiagnostics(getAIDiagnostics());
  }, []);

  // Load capabilities when model changes
  useEffect(() => {
    if (model) {
      setCapabilities(getModelCapabilities(model));
    } else {
      setCapabilities(null);
    }
  }, [model]);

  // Fetch available models
  const handleRefreshModels = useCallback(async () => {
    if (!provider) {
      showToast('No provider configured');
      return;
    }
    setLoadingModels(true);
    try {
      const list = await fetchFreeModels(provider, apiKey);
      setModels(list);
      showToast(`${list.length} models found`);
    } catch {
      showToast('Failed to fetch models');
    }
    setLoadingModels(false);
  }, [provider, apiKey, showToast]);

  // Test current model
  const handleTest = useCallback(async () => {
    if (!provider || !model || !apiKey) {
      showToast('Provider, model, and API key required');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testAIModel(provider, apiKey, model);
      setTestResult(result);
      refreshDiagnostics();
      showToast(result.success ? `Model OK (${result.latency}ms)` : `Test failed: ${result.error}`);
    } catch (err) {
      setTestResult({ success: false, error: err.message });
      showToast(`Test failed: ${err.message}`);
    }
    setTesting(false);
  }, [provider, model, apiKey, showToast, refreshDiagnostics]);

  // Reset diagnostics
  const handleResetStats = useCallback(() => {
    resetAIDiagnostics();
    setDiagnostics(getAIDiagnostics());
    showToast('Diagnostics reset');
  }, [showToast]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">AI Model Lab</h2>
        <p className="mt-1 text-white/60">AI model diagnostics and configuration.</p>
      </div>

      {/* Current config */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 text-sm font-medium text-white">Current Configuration</div>
        <div className="space-y-1 font-mono text-xs">
          <div className="text-white/60">
            PROVIDER <span className="text-white">{AI_PROVIDERS[provider]?.name || provider || 'NONE'}</span>
          </div>
          <div className="text-white/60">
            MODEL <span className="text-white">{model ? model.split('/').pop()?.split(':')[0] : 'NONE'}</span>
          </div>
          <div className="text-white/60">
            STATUS{' '}
            <span className={apiKey ? 'text-green-400' : 'text-red-400'}>
              {provider && apiKey ? '● ONLINE' : provider ? '● NO KEY' : '● UNCONFIGURED'}
            </span>
          </div>
          <div className="text-white/60">
            API KEY <span className="text-white/40">{apiKey ? maskKey(apiKey) : 'NOT SET'}</span>
          </div>
        </div>
      </div>

      {/* Model list */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-medium text-white">Available Models</div>
          <button
            onClick={handleRefreshModels}
            disabled={loadingModels}
            className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs text-white/70 transition hover:border-white/30 hover:text-white disabled:opacity-40"
          >
            {loadingModels ? 'LOADING...' : 'REFRESH MODELS'}
          </button>
        </div>
        <div className="space-y-1">
          {models.length === 0 && !loadingModels && (
            <div className="py-4 text-center text-xs text-white/30">
              Click REFRESH MODELS to load available free models.
            </div>
          )}
          {models.map(m => (
            <div
              key={m.id}
              className={`flex items-center justify-between rounded-lg border px-4 py-2.5 font-mono text-xs transition ${
                m.id === model
                  ? 'border-white/30 bg-white/10 text-white'
                  : 'border-white/5 bg-white/[0.01] text-white/50 hover:border-white/15'
              }`}
            >
              <div className="flex items-center gap-2">
                {m.id === model && <span className="text-green-400">▶</span>}
                <span>{m.name || m.id.split('/').pop()}</span>
              </div>
              <button
                onClick={() => {
                  setAiConfig({ ...aiConfig, model: m.id });
                  showToast(`Model set: ${m.name || m.id}`);
                }}
                className="text-white/30 hover:text-white/60 transition"
              >
                {m.id === model ? 'ACTIVE' : 'SELECT'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Diagnostics grid */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 text-sm font-medium text-white">Diagnostics</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <div className="text-xs font-mono text-white/40">REQUESTS</div>
            <div className="font-mono text-lg text-white">{diagnostics.requestCount}</div>
          </div>
          <div>
            <div className="text-xs font-mono text-white/40">ERRORS</div>
            <div className={`font-mono text-lg ${diagnostics.errorCount > 0 ? 'text-red-400' : 'text-white'}`}>
              {diagnostics.errorCount}
            </div>
          </div>
          <div>
            <div className="text-xs font-mono text-white/40">LAST LATENCY</div>
            <div className="font-mono text-lg text-white">{diagnostics.lastLatency != null ? `${diagnostics.lastLatency}ms` : '--'}</div>
          </div>
          <div>
            <div className="text-xs font-mono text-white/40">AVG LATENCY</div>
            <div className="font-mono text-lg text-white">{diagnostics.avgLatency != null ? `${diagnostics.avgLatency}ms` : '--'}</div>
          </div>
        </div>
        <div className="mt-3 font-mono text-xs text-white/30">
          LAST REQUEST {timeAgo(diagnostics.lastRequest)}
        </div>
        {diagnostics.lastError && (
          <div className="mt-1 font-mono text-xs text-red-400/60">
            LAST ERROR: {diagnostics.lastError.message} · {timeAgo(diagnostics.lastError.ts)}
          </div>
        )}
      </div>

      {/* Model capabilities */}
      {capabilities && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-3 text-sm font-medium text-white">Model Capabilities</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <div className="text-xs font-mono text-white/40">CONTEXT LENGTH</div>
              <div className="font-mono text-lg text-white">{capabilities.context}</div>
            </div>
            <div>
              <div className="text-xs font-mono text-white/40">VISION</div>
              <div className={`font-mono text-lg ${capabilities.vision ? 'text-green-400' : 'text-white/30'}`}>
                {capabilities.vision ? 'YES' : 'NO'}
              </div>
            </div>
            <div>
              <div className="text-xs font-mono text-white/40">REASONING</div>
              <div className={`font-mono text-lg ${capabilities.reasoning ? 'text-green-400' : 'text-white/30'}`}>
                {capabilities.reasoning ? 'YES' : 'NO'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleTest}
          disabled={testing}
          className="rounded-lg border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/30 hover:text-white disabled:opacity-40"
        >
          {testing ? 'TESTING...' : 'TEST MODEL'}
        </button>
        <button
          onClick={handleResetStats}
          className="rounded-lg border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/30 hover:text-white"
        >
          RESET STATS
        </button>
      </div>

      {/* Test result */}
      {testResult && (
        <div className={`rounded-2xl border p-5 ${
          testResult.success
            ? 'border-green-400/20 bg-green-500/5'
            : 'border-red-400/20 bg-red-500/5'
        }`}>
          <div className="font-mono text-xs">
            <div className={testResult.success ? 'text-green-400' : 'text-red-400'}>
              {testResult.success ? '● TEST PASSED' : '● TEST FAILED'}
            </div>
            <div className="mt-1 text-white/60">
              LATENCY {testResult.latency}ms
            </div>
            {testResult.response && (
              <div className="mt-1 text-white/40">
                RESPONSE: {testResult.response}
              </div>
            )}
            {testResult.error && (
              <div className="mt-1 text-red-400/60">
                ERROR: {testResult.error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
