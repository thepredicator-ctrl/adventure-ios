// AI Provider abstraction layer
// Supports: OpenRouter (free models only), Hugging Face
// All API calls respect free-model-only constraints.

const OPENROUTER_API = 'https://openrouter.ai/api/v1';
const HF_INFERENCE_API = 'https://api-inference.huggingface.co/models/';

// ---- Provider definitions ----

export const AI_PROVIDERS = {
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Access free models via OpenRouter',
    authHeader: (key) => `Bearer ${key}`,
    chatEndpoint: `${OPENROUTER_API}/chat/completions`,
    modelsEndpoint: `${OPENROUTER_API}/models`,
    testEndpoint: `${OPENROUTER_API}/models`,
  },
  huggingface: {
    id: 'huggingface',
    name: 'Hugging Face',
    description: 'Free inference with Hugging Face',
    authHeader: (key) => `Bearer ${key}`,
    chatEndpoint: null, // Uses per-model endpoint
    modelsEndpoint: null,
    testEndpoint: `${HF_INFERENCE_API}google/flan-t5-large`,
  },
};

// ---- Free model registry ----
// These are known free models. The system also fetches live model lists from OpenRouter.

export const KNOWN_FREE_MODELS = {
  openrouter: [
    { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B', provider: 'openrouter', free: true },
    { id: 'google/gemma-2-9b-it:free', name: 'Gemma 2 9B', provider: 'openrouter', free: true },
    { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B', provider: 'openrouter', free: true },
    { id: 'qwen/qwen-2-7b-instruct:free', name: 'Qwen 2 7B', provider: 'openrouter', free: true },
    { id: 'huggingfaceh4/zephyr-7b-beta:free', name: 'Zephyr 7B', provider: 'openrouter', free: true },
  ],
  huggingface: [
    { id: 'google/flan-t5-large', name: 'FLAN-T5 Large', provider: 'huggingface', free: true },
    { id: 'google/flan-t5-xxl', name: 'FLAN-T5 XXL', provider: 'huggingface', free: true },
    { id: 'mistralai/Mistral-7B-Instruct-v0.3', name: 'Mistral 7B Instruct', provider: 'huggingface', free: true },
  ],
};

// ---- API Functions ----

/**
 * Fetch free models from OpenRouter's live API.
 * Filters to only models marked as :free or with pricing 0.
 */
export async function fetchOpenRouterFreeModels(apiKey) {
  const resp = await fetch(AI_PROVIDERS.openrouter.modelsEndpoint, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://adventure.app',
      'X-Title': 'Adventure',
    },
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${resp.status}`);
  }
  const data = await resp.json();
  const models = (data.data || []).filter(m => {
    // Only free models
    const id = m.id || '';
    const isFree = id.endsWith(':free') ||
      (m.pricing && parseFloat(m.pricing.prompt) === 0 && parseFloat(m.pricing.completion) === 0);
    return isFree && m.architecture?.modality?.includes('text');
  }).map(m => ({
    id: m.id,
    name: m.name || m.id,
    provider: 'openrouter',
    free: true,
    contextLength: m.context_length,
    description: m.description || '',
  }));
  return models;
}

/**
 * Send a chat completion request to OpenRouter.
 */
export async function chatOpenRouter(apiKey, modelId, messages, options = {}) {
  const resp = await fetch(AI_PROVIDERS.openrouter.chatEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://adventure.app',
      'X-Title': 'Adventure',
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      max_tokens: options.maxTokens || 512,
      temperature: options.temperature ?? 0.7,
    }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    const msg = err.error?.message || `HTTP ${resp.status}`;
    if (resp.status === 401) throw new Error('INVALID_API_KEY');
    if (resp.status === 429) throw new Error('RATE_LIMITED');
    if (resp.status === 404) throw new Error('MODEL_UNAVAILABLE');
    throw new Error(msg);
  }
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('EMPTY_RESPONSE');
  return { content, model: data.model, usage: data.usage };
}

/**
 * Send a text generation request to Hugging Face.
 */
export async function chatHuggingFace(apiKey, modelId, messages, options = {}) {
  // Convert chat messages to a single prompt for HF
  const prompt = messages.map(m => {
    if (m.role === 'system') return `[SYSTEM] ${m.content}`;
    if (m.role === 'user') return `[USER] ${m.content}`;
    if (m.role === 'assistant') return `[ASSISTANT] ${m.content}`;
    return m.content;
  }).join('\n') + '\n[ASSISTANT]';

  const resp = await fetch(`${HF_INFERENCE_API}${modelId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: options.maxTokens || 256,
        temperature: options.temperature ?? 0.7,
        return_full_text: false,
      },
    }),
  });
  if (!resp.ok) {
    if (resp.status === 401) throw new Error('INVALID_API_KEY');
    if (resp.status === 429) throw new Error('RATE_LIMITED');
    if (resp.status === 503) throw new Error('MODEL_LOADING');
    throw new Error(`HF Error: ${resp.status}`);
  }
  const data = await resp.json();
  const content = Array.isArray(data)
    ? data[0]?.generated_text
    : data?.generated_text;
  if (!content) throw new Error('EMPTY_RESPONSE');
  return { content, model: modelId, usage: null };
}

/**
 * Test API key connectivity.
 */
export async function testConnection(providerId, apiKey) {
  if (providerId === 'openrouter') {
    const resp = await fetch(AI_PROVIDERS.openrouter.testEndpoint, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!resp.ok) {
      if (resp.status === 401) throw new Error('INVALID_API_KEY');
      throw new Error(`Connection failed: HTTP ${resp.status}`);
    }
    return true;
  }
  if (providerId === 'huggingface') {
    const resp = await fetch(AI_PROVIDERS.huggingface.testEndpoint, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!resp.ok) {
      if (resp.status === 401) throw new Error('INVALID_API_KEY');
      throw new Error(`Connection failed: HTTP ${resp.status}`);
    }
    return true;
  }
  throw new Error('Unknown provider');
}

/**
 * Mask an API key for display: hf_abc...xyz → hf_••••••xyz
 */
export function maskKey(key) {
  if (!key || key.length < 8) return '••••••••';
  return key.slice(0, 5) + '••••••' + key.slice(-4);
}

/**
 * Send a chat request via the configured provider.
 * Automatically routes to the correct provider function.
 */
export async function sendChatRequest(providerId, apiKey, modelId, messages, options = {}) {
  if (providerId === 'openrouter') {
    return chatOpenRouter(apiKey, modelId, messages, options);
  }
  if (providerId === 'huggingface') {
    return chatHuggingFace(apiKey, modelId, messages, options);
  }
  throw new Error('Unknown provider');
}

/**
 * Build a system prompt with minimal relevant library context.
 * Only includes data necessary for the user's query type.
 */

export function buildSystemPrompt(contextData) {
  const { shows = [], watchHistory = [], currentShow = null, stats = {}, watchTime = {}, aiMemory = [], missionControl = null } = contextData;

  let prompt = 'You are ADVENTURE AI, a minimal monochrome media terminal assistant.\n';
  prompt += 'You understand the user\'s media library, watch history, statistics, Adventures, Smart Rewatch, Show Analysis, and Mission Control.\n';
  prompt += 'Give short, precise, technical responses. Never fabricate statistics.\n\n';

  if (aiMemory && aiMemory.length > 0) {
    prompt += 'USER PREFERENCES (from AI Memory):\n';
    for (const mem of aiMemory) prompt += '- ' + mem.content + '\n';
    prompt += '\n';
  }

  if (missionControl) {
    prompt += 'MISSION CONTROL STATUS:\n';
    prompt += '- Current mission: ' + missionControl.currentMission + ' (' + missionControl.missionPct + '%)\n';
    if (missionControl.missionNext) prompt += '- Next: S' + String(missionControl.missionNext.season).padStart(2,'0') + 'E' + String(missionControl.missionNext.episode).padStart(2,'0') + '\n';
    prompt += '- Watch streak: ' + missionControl.streak + ' days\n';
    prompt += '- AI status: ' + missionControl.aiStatus + '\n\n';
  }

  prompt += 'LIBRARY STATUS:\n';
  for (const s of shows) {
    prompt += '- ' + s.name + ': ' + s.totalEps + ' episodes across ' + s.seasonCount + ' seasons. Watched: ' + s.watchedCount + '. Progress: ' + s.progressPct + '%\n';
  }
  prompt += '\n';

  if (currentShow) prompt += 'CURRENT: ' + currentShow.name + ' S' + currentShow.season + 'E' + currentShow.episode + '\n';

  if (stats.totalWatched !== undefined) {
    prompt += 'STATS: ' + stats.totalWatched + ' episodes watched, ' + stats.watchHours + 'h total, ';
    prompt += stats.streak + '-day streak, ' + stats.completionPct + '% library complete\n';
  }

  prompt += '\nYou can return structured actions in your response using this format:\n';
  prompt += 'ACTION: <action_name>\n';
  prompt += '<param>: <value>\n\n';
  prompt += 'Supported actions: PLAY_EPISODE, OPEN_SHOW, ADD_TO_WATCHLIST, MARK_WATCHED, CREATE_ADVENTURE, OPEN_SECTION, SMART_REWATCH, SHOW_ANALYSIS, MISSION_CONTROL\n\n';
  prompt += 'For PLAY_EPISODE, include SHOW_ID, SEASON, and EPISODE.\n';
  prompt += 'For OPEN_SHOW, include SHOW_ID.\n';
  prompt += 'For CREATE_ADVENTURE, include COUNT and optionally MOOD and GENRE.\n';
  prompt += 'For OPEN_SECTION, include SECTION name.\n';
  prompt += 'For SMART_REWATCH, include MODE and COUNT.\n';
  prompt += 'When recommending episodes, always include the show name, season, and episode number.\n';
  prompt += 'If asked about duration, assume ~11 minutes for episodes and ~22 minutes for longer episodes.\n';
  prompt += 'Respond in the same language the user uses.';

  return prompt;
}

/**
 * Parse structured actions from AI response text.
 */
export function parseActions(text) {
  const actions = [];
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.startsWith('ACTION:')) {
      const actionType = line.replace('ACTION:', '').trim();
      const params = {};
      i++;
      while (i < lines.length && lines[i].includes(':') && !lines[i].trim().startsWith('ACTION:')) {
        const [key, ...rest] = lines[i].split(':');
        if (rest.length > 0) params[key.trim()] = rest.join(':').trim();
        i++;
      }
      actions.push({ type: actionType, params });
      continue;
    }
    i++;
  }
  return actions;
}
