// ============================================================
//  LINKS AI — Token Bank Client (React Hook)
//  גרסה: 1.0
//
//  Hook לחיבור קומפוננטות React ל-Token Bank.
//  מנהל state של loading / error / response אוטומטית.
//
//  שימוש:
//    import { useTokenBank } from './useTokenBank';
//
//    function MyComponent() {
//      const { send, loading, error, data } = useTokenBank('links_sk_live_...');
//      return (
//        <button onClick={() => send([{ role: 'user', content: 'שלום' }])}>
//          {loading ? 'טוען...' : 'שלח'}
//        </button>
//      );
//    }
// ============================================================

import { useState, useCallback, useRef } from 'react';

const TOKEN_BANK_URL    = 'https://token-bank.onrender.com/v1/messages';
const TOKEN_BANK_SIGNUP = 'https://token-bank.onrender.com';
const DEFAULT_MODEL     = 'VEGA FORGE Sonnet';

export const VEGA_MODELS = {
  'forge-opus':   'VEGA FORGE Opus',
  'forge-sonnet': 'VEGA FORGE Sonnet',
  'forge-haiku':  'VEGA FORGE Haiku',
  'nova-pro':     'VEGA NOVA Pro',
  'nova-lite':    'VEGA NOVA Lite',
  'atlas-pro':    'VEGA ATLAS Pro',
  'atlas-flash':  'VEGA ATLAS Flash',
};

export const tokenBankSignupUrl = () => TOKEN_BANK_SIGNUP;

function friendlyError(status, rawText) {
  let apiMsg = rawText;
  try { apiMsg = JSON.parse(rawText)?.error?.message || rawText; } catch (_) {}
  const map = {
    401: 'מפתח Token Bank לא תקין. בדוק שהמפתח נכון ומתחיל ב-links_sk_',
    402: 'הארנק ריק. יש לטעון יתרה בבנק כדי להמשיך.',
    403: 'החשבון מושעה. פנה לתמיכה.',
    400: 'בקשה לא תקינה: ' + apiMsg,
    429: 'יותר מדי בקשות. נסה שוב בעוד רגע.',
  };
  return map[status] || `שגיאת בנק (${status}): ${apiMsg}`;
}

/**
 * @param {string} apiKey - מפתח links_sk_live_...
 * @param {object} [opts] - { project, model, maxTokens }
 */
export function useTokenBank(apiKey, opts = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [data, setData]       = useState(null);
  const project   = opts.project   || null;
  const model     = opts.model     || DEFAULT_MODEL;
  const maxTokens = opts.maxTokens || 2000;
  const keyRef = useRef(apiKey);
  keyRef.current = apiKey;

  const send = useCallback(async (messages, options = {}) => {
    setLoading(true);
    setError(null);

    if (!keyRef.current || !keyRef.current.startsWith('links_sk_')) {
      const e = new Error('מפתח Token Bank לא תקין. המפתח צריך להתחיל ב-links_sk_');
      setError(e); setLoading(false); throw e;
    }

    const body = {
      model: options.model || model,
      max_tokens: options.maxTokens || maxTokens,
      messages,
    };
    if (options.system)     body.system      = options.system;
    if (options.tools)      body.tools       = options.tools;
    if (options.toolChoice) body.tool_choice = options.toolChoice;

    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + keyRef.current,
      };
      const proj = options.project || project;
      if (proj) headers['X-Links-Project'] = proj;

      const res = await fetch(TOKEN_BANK_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const txt = await res.text();
        const e = new Error(friendlyError(res.status, txt));
        e.status = res.status;
        throw e;
      }

      const json = await res.json();
      setData(json);
      return json;
    } catch (e) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [model, maxTokens, project]);

  /**
   * sendStream — שליחה עם streaming. התשובה זורמת דרך onText.
   * נתמך כרגע רק ב-FORGE.
   * @param {Array} messages
   * @param {object} callbacks - { onText(text), onDone(meta), onError(err) }
   * @param {object} [options] - system / tools / model / maxTokens / project
   * @returns {Promise<string>} הטקסט המלא
   */
  const sendStream = useCallback(async (messages, callbacks = {}, options = {}) => {
    setLoading(true);
    setError(null);
    const { onText, onDone, onError } = callbacks;

    if (!keyRef.current || !keyRef.current.startsWith('links_sk_')) {
      const e = new Error('מפתח Token Bank לא תקין. המפתח צריך להתחיל ב-links_sk_');
      setError(e); setLoading(false);
      if (onError) { onError(e); return ''; }
      throw e;
    }

    const body = {
      model: options.model || model,
      max_tokens: options.maxTokens || maxTokens,
      stream: true,
      messages,
    };
    if (options.system)     body.system      = options.system;
    if (options.tools)      body.tools       = options.tools;
    if (options.toolChoice) body.tool_choice = options.toolChoice;

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + keyRef.current,
    };
    const proj = options.project || project;
    if (proj) headers['X-Links-Project'] = proj;

    let fullText = '';
    try {
      const res = await fetch(TOKEN_BANK_URL, { method: 'POST', headers, body: JSON.stringify(body) });

      const ctype = res.headers.get('content-type') || '';
      if (!ctype.includes('text/event-stream')) {
        const txt = await res.text();
        const e = new Error(friendlyError(res.status, txt));
        e.status = res.status;
        throw e;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop();
        for (const block of blocks) {
          let event = 'message', data = '';
          for (const line of block.split('\n')) {
            if (line.startsWith('event:')) event = line.slice(6).trim();
            else if (line.startsWith('data:')) data += line.slice(5).trim();
          }
          if (!data || data === '[DONE]') continue;
          let parsed;
          try { parsed = JSON.parse(data); } catch (_) { continue; }

          if (event === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
            fullText += parsed.delta.text;
            if (onText) onText(parsed.delta.text);
          } else if (event === 'links_meta') {
            setData(parsed);
            if (onDone) onDone(parsed);
          } else if (event === 'error') {
            const e = new Error(parsed.message || 'שגיאת streaming');
            if (onError) onError(e); else throw e;
          }
        }
      }
      return fullText;
    } catch (e) {
      setError(e);
      if (onError) { onError(e); return fullText; }
      throw e;
    } finally {
      setLoading(false);
    }
  }, [model, maxTokens, project]);

  return { send, sendStream, loading, error, data };
}
