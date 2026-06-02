// ============================================================
//  LINKS AI — Token Bank Client (JavaScript / Browser)
//  גרסה: 1.0
//
//  מחבר כל מערכת לינקס (תוסף, אתר, PWA) ל-Token Bank.
//  כל הקריאות ל-AI עוברות דרך הבנק — אימות, חיוב, ורישום אוטומטיים.
//
//  שימוש בסיסי:
//    const tb = new TokenBank('links_sk_live_...');
//    const res = await tb.chat([{ role: 'user', content: 'שלום' }]);
//    console.log(res.content[0].text);
// ============================================================

const TOKEN_BANK_URL    = 'https://token-bank.onrender.com/v1/messages';
const TOKEN_BANK_SIGNUP = 'https://token-bank.onrender.com';

// מנועי VEGA הזמינים (השם שהלקוח רואה — לעולם לא שם הספק האמיתי)
const VEGA_MODELS = {
  // FORGE = המנוע החזק (Anthropic)
  'forge-opus':   'VEGA FORGE Opus',     // החכם ביותר
  'forge-sonnet': 'VEGA FORGE Sonnet',   // מאוזן (ברירת מחדל מומלצת)
  'forge-haiku':  'VEGA FORGE Haiku',    // מהיר וזול
  // NOVA = OpenAI
  'nova-pro':     'VEGA NOVA Pro',
  'nova-lite':    'VEGA NOVA Lite',
  // ATLAS = Gemini
  'atlas-pro':    'VEGA ATLAS Pro',
  'atlas-flash':  'VEGA ATLAS Flash',
};

const DEFAULT_MODEL = 'VEGA FORGE Sonnet';

class TokenBank {
  /**
   * @param {string} apiKey - מפתח links_sk_live_... מהבנק
   * @param {object} [opts]
   * @param {string} [opts.project] - שם הפרויקט למעקב שימוש מפוצל ביומן הבנק
   * @param {string} [opts.model] - שם מנוע VEGA (ברירת מחדל: VEGA FORGE Sonnet)
   * @param {number} [opts.maxTokens] - מקסימום טוקנים בתשובה (ברירת מחדל: 2000)
   * @param {number} [opts.retries] - מספר ניסיונות חוזרים בשגיאת רשת (ברירת מחדל: 2)
   */
  constructor(apiKey, opts = {}) {
    if (!apiKey || !apiKey.startsWith('links_sk_')) {
      throw new Error('מפתח Token Bank לא תקין. המפתח צריך להתחיל ב-links_sk_');
    }
    this.apiKey    = apiKey;
    this.project   = opts.project   || null;
    this.model     = opts.model     || DEFAULT_MODEL;
    this.maxTokens = opts.maxTokens || 2000;
    this.retries   = opts.retries ?? 2;
  }

  /**
   * שליחת בקשת chat לבנק.
   * @param {Array} messages - מערך הודעות [{ role, content }]
   * @param {object} [options] - אופציות נוספות
   * @param {string} [options.system] - הוראת מערכת
   * @param {Array}  [options.tools] - הגדרת כלים (tool use)
   * @param {object} [options.toolChoice] - אילוץ כלי
   * @param {string} [options.model] - דריסת המודל לבקשה זו
   * @param {number} [options.maxTokens] - דריסת maxTokens לבקשה זו
   * @returns {Promise<object>} תשובת הבנק (פורמט Anthropic גולמי)
   */
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
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + this.apiKey,
        };
        // תגית פרויקט למעקב מפוצל ביומן הבנק (אופציונלי)
        const project = options.project || this.project;
        if (project) headers['X-Links-Project'] = project;

        const res = await fetch(TOKEN_BANK_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });

        if (res.ok) return await res.json();

        // טיפול בשגיאות מתורגם
        const errText = await res.text();
        throw new TokenBankError(res.status, errText);
      } catch (err) {
        lastErr = err;
        // שגיאת אימות/ארנק/בקשה — אין טעם לנסות שוב
        if (err instanceof TokenBankError) throw err;
        // שגיאת רשת — נסה שוב עם השהיה
        if (attempt < this.retries) {
          await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        }
      }
    }
    throw lastErr;
  }

  /**
   * שליחת בקשת chat עם streaming — התשובה מגיעה בהדרגה (מילה-מילה).
   * שימושי לצ'אט ויצירת תוכן ארוך, לחוויית משתמש זורמת.
   * הערה: כרגע נתמך רק במנוע FORGE.
   *
   * @param {Array} messages - מערך הודעות [{ role, content }]
   * @param {object} callbacks
   * @param {function(string)} callbacks.onText - נקרא לכל קטע טקסט שמגיע
   * @param {function(object)} [callbacks.onDone] - נקרא בסוף עם מטא-דאטה (engine, tokens, חיוב, יתרה)
   * @param {function(Error)}  [callbacks.onError] - נקרא בשגיאה
   * @param {object} [options] - system / tools / model / maxTokens / project (כמו ב-chat)
   * @returns {Promise<string>} הטקסט המלא שהצטבר
   */
  async chatStream(messages, callbacks = {}, options = {}) {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('messages חייב להיות מערך לא ריק');
    }
    const { onText, onDone, onError } = callbacks;

    const body = {
      model: options.model || this.model,
      max_tokens: options.maxTokens || this.maxTokens,
      stream: true,
      messages,
    };
    if (options.system)     body.system      = options.system;
    if (options.tools)      body.tools       = options.tools;
    if (options.toolChoice) body.tool_choice = options.toolChoice;

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + this.apiKey,
    };
    const project = options.project || this.project;
    if (project) headers['X-Links-Project'] = project;

    let fullText = '';
    try {
      const res = await fetch(TOKEN_BANK_URL, {
        method: 'POST', headers, body: JSON.stringify(body),
      });

      // שגיאות (אימות/ארנק/בקשה) מגיעות לפני שה-stream מתחיל — כ-JSON
      const ctype = res.headers.get('content-type') || '';
      if (!ctype.includes('text/event-stream')) {
        const errText = await res.text();
        throw new TokenBankError(res.status, errText);
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
          const { event, data } = _parseSSE(block);
          if (!data || data === '[DONE]') continue;
          let parsed;
          try { parsed = JSON.parse(data); } catch (_) { continue; }

          if (event === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
            fullText += parsed.delta.text;
            if (onText) onText(parsed.delta.text);
          } else if (event === 'links_meta') {
            if (onDone) onDone(parsed);
          } else if (event === 'error') {
            const e = new Error(parsed.message || 'שגיאת streaming');
            if (onError) onError(e); else throw e;
          }
        }
      }
      return fullText;
    } catch (err) {
      if (onError) { onError(err); return fullText; }
      throw err;
    }
  }

  /** רשימת מנועי VEGA הזמינים */
  static models() { return { ...VEGA_MODELS }; }
}

/** שגיאת Token Bank עם הודעה מתורגמת לעברית */
class TokenBankError extends Error {
  constructor(status, rawText) {
    let parsed = {};
    try { parsed = JSON.parse(rawText); } catch (_) {}
    const apiMsg = parsed?.error?.message || rawText;

    let friendly;
    switch (status) {
      case 401:
        friendly = 'מפתח Token Bank לא תקין. בדוק שהמפתח נכון ומתחיל ב-links_sk_';
        break;
      case 402:
        friendly = 'הארנק ריק. יש לטעון יתרה בבנק כדי להמשיך.';
        break;
      case 403:
        friendly = 'החשבון מושעה. פנה לתמיכה.';
        break;
      case 400:
        friendly = 'בקשה לא תקינה: ' + apiMsg;
        break;
      case 429:
        friendly = 'יותר מדי בקשות. נסה שוב בעוד רגע.';
        break;
      default:
        friendly = `שגיאת בנק (${status}): ${apiMsg}`;
    }

    super(friendly);
    this.name = 'TokenBankError';
    this.status = status;
    this.apiMessage = apiMsg;
  }
}

/** פירוק בלוק SSE לאירוע ולנתונים */
function _parseSSE(block) {
  let event = 'message', data = '';
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) data += line.slice(5).trim();
  }
  return { event, data };
}

// תמיכה גם ב-module וגם ב-global (תוסף/אתר)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TokenBank, TokenBankError };
}
