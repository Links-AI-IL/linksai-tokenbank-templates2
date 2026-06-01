// ============================================================
//  LINKS AI — Token Bank Client (Node.js)
//  גרסה: 1.0
//
//  מחבר כל שרת/סקריפט Node.js ל-Token Bank.
//  דורש Node 18+ (fetch מובנה). לגרסאות ישנות: npm i node-fetch
//
//  שימוש:
//    const { TokenBank } = require('./tokenbank');
//    const tb = new TokenBank(process.env.LINKS_API_KEY);
//    const res = await tb.chat([{ role: 'user', content: 'שלום' }]);
//    console.log(res.content[0].text);
// ============================================================

const TOKEN_BANK_URL    = 'https://token-bank.onrender.com/v1/messages';
const TOKEN_BANK_SIGNUP = 'https://token-bank.onrender.com';

const VEGA_MODELS = {
  'forge-opus':   'VEGA FORGE Opus',
  'forge-sonnet': 'VEGA FORGE Sonnet',
  'forge-haiku':  'VEGA FORGE Haiku',
  'nova-pro':     'VEGA NOVA Pro',
  'nova-lite':    'VEGA NOVA Lite',
  'atlas-pro':    'VEGA ATLAS Pro',
  'atlas-flash':  'VEGA ATLAS Flash',
};

const DEFAULT_MODEL = 'VEGA FORGE Sonnet';

class TokenBankError extends Error {
  constructor(status, rawText) {
    let parsed = {};
    try { parsed = JSON.parse(rawText); } catch (_) {}
    const apiMsg = parsed?.error?.message || rawText;

    const messages = {
      401: 'מפתח Token Bank לא תקין. בדוק שהמפתח נכון ומתחיל ב-links_sk_',
      402: 'הארנק ריק. יש לטעון יתרה בבנק כדי להמשיך.',
      403: 'החשבון מושעה. פנה לתמיכה.',
      400: 'בקשה לא תקינה: ' + apiMsg,
      429: 'יותר מדי בקשות. נסה שוב בעוד רגע.',
    };

    super(messages[status] || `שגיאת בנק (${status}): ${apiMsg}`);
    this.name = 'TokenBankError';
    this.status = status;
    this.apiMessage = apiMsg;
  }
}

class TokenBank {
  constructor(apiKey, opts = {}) {
    if (!apiKey || !apiKey.startsWith('links_sk_')) {
      throw new Error('מפתח Token Bank לא תקין. המפתח צריך להתחיל ב-links_sk_');
    }
    this.apiKey    = apiKey;
    this.model     = opts.model     || DEFAULT_MODEL;
    this.maxTokens = opts.maxTokens || 2000;
    this.retries   = opts.retries ?? 2;
  }

  async chat(messages, options = {}) {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('messages חייב להיות מערך לא ריק');
    }

    const body = {
      model: options.model || this.model,
      max_tokens: options.maxTokens || this.maxTokens,
      messages,
    };
    if (options.system)     body.system      = options.system;
    if (options.tools)      body.tools       = options.tools;
    if (options.toolChoice) body.tool_choice = options.toolChoice;

    let lastErr;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const res = await fetch(TOKEN_BANK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + this.apiKey,
          },
          body: JSON.stringify(body),
        });

        if (res.ok) return await res.json();

        const errText = await res.text();
        throw new TokenBankError(res.status, errText);
      } catch (err) {
        lastErr = err;
        if (err instanceof TokenBankError) throw err;
        if (attempt < this.retries) {
          await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        }
      }
    }
    throw lastErr;
  }

  static signupUrl() { return TOKEN_BANK_SIGNUP; }
  static models() { return { ...VEGA_MODELS }; }
}

module.exports = { TokenBank, TokenBankError };
