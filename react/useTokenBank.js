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
 * @param {object} [opts] - { model, maxTokens }
 */
export function useTokenBank(apiKey, opts = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [data, setData]       = useState(null);
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
      const res = await fetch(TOKEN_BANK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + keyRef.current,
        },
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
  }, [model, maxTokens]);

  return { send, loading, error, data };
}
