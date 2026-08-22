/**
 * AIService - AI diagnostics and model management.
 */
import { AI_PROVIDERS, KNOWN_FREE_MODELS, fetchOpenRouterFreeModels, testConnection, sendChatRequest } from '../ai-providers.js';
import { secureGet } from '../secure-storage.js';

const DIAGNOSTICS_KEY = 'adventure:ai_diagnostics';

const diagnostics = {
  requestCount: 0,
  errorCount: 0,
  lastRequest: null,
  lastError: null,
  lastLatency: null,
  avgLatency: null,
  latencies: [],
};

export function recordRequest(success, latencyMs, error = null) {
  diagnostics.requestCount++;
  if (!success) diagnostics.errorCount++;
  diagnostics.lastRequest = Date.now();
  if (error) diagnostics.lastError = { message: error, ts: Date.now() };
  if (latencyMs) {
    diagnostics.lastLatency = latencyMs;
    diagnostics.latencies.push(latencyMs);
    if (diagnostics.latencies.length > 50) diagnostics.latencies.shift();
    diagnostics.avgLatency = Math.round(diagnostics.latencies.reduce((a, b) => a + b, 0) / diagnostics.latencies.length);
  }
  try {
    localStorage.setItem(DIAGNOSTICS_KEY, JSON.stringify({ ...diagnostics, latencies: diagnostics.latencies.slice(-20) }));
  } catch {}
}

export function getAIDiagnostics() {
  try {
    const saved = JSON.parse(localStorage.getItem(DIAGNOSTICS_KEY) || '{}');
    return { ...diagnostics, ...saved };
  } catch { return { ...diagnostics }; }
}

export function resetAIDiagnostics() {
  diagnostics.requestCount = 0;
  diagnostics.errorCount = 0;
  diagnostics.lastRequest = null;
  diagnostics.lastError = null;
  diagnostics.lastLatency = null;
  diagnostics.avgLatency = null;
  diagnostics.latencies = [];
  try { localStorage.removeItem(DIAGNOSTICS_KEY); } catch {}
}

export async function fetchFreeModels(provider, apiKey) {
  if (provider === 'openrouter' && apiKey) {
    try {
      const models = await fetchOpenRouterFreeModels(apiKey);
      if (models.length > 0) return models;
    } catch {}
  }
  return KNOWN_FREE_MODELS[provider] || [];
}

export async function testAIModel(provider, apiKey, modelId) {
  const start = performance.now();
  try {
    const messages = [
      { role: 'system', content: 'You are a test. Reply with OK.' },
      { role: 'user', content: 'Test' },
    ];
    const result = await sendChatRequest(provider, apiKey, modelId, messages, { maxTokens: 10 });
    const latency = Math.round(performance.now() - start);
    recordRequest(true, latency);
    return { success: true, latency, response: result.content?.slice(0, 50) };
  } catch (err) {
    const latency = Math.round(performance.now() - start);
    recordRequest(false, latency, err.message);
    return { success: false, latency, error: err.message };
  }
}

export function getModelCapabilities(modelId) {
  const id = (modelId || '').toLowerCase();
  if (id.includes('llama')) return { context: '128K', vision: false, reasoning: false };
  if (id.includes('gemma')) return { context: '8K', vision: false, reasoning: false };
  if (id.includes('mistral')) return { context: '32K', vision: false, reasoning: false };
  if (id.includes('qwen')) return { context: '32K', vision: false, reasoning: false };
  if (id.includes('zephyr')) return { context: '8K', vision: false, reasoning: false };
  if (id.includes('flan')) return { context: '512', vision: false, reasoning: false };
  return { context: 'unknown', vision: false, reasoning: false };
}
