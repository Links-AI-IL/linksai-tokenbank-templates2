// ============================================================
//  דוגמאות שימוש — Token Bank (JavaScript / Browser)
// ============================================================
//
// בתוסף Chrome: טען את tokenbank.js לפני הקובץ הזה ב-HTML:
//   <script src="tokenbank.js"></script>
//   <script src="example.js"></script>
//
// או כ-module:  const { TokenBank, TokenBankError } = require('./tokenbank');

// ---------- 1. שימוש בסיסי ----------
async function basic() {
  const tb = new TokenBank('links_sk_live_YOUR_KEY');
  const res = await tb.chat([
    { role: 'user', content: 'כתוב משפט קצר על תל אביב' }
  ]);
  console.log(res.content[0].text);
}

// ---------- 2. עם הוראת מערכת ובחירת מנוע ----------
async function withSystem() {
  const tb = new TokenBank('links_sk_live_YOUR_KEY', {
    model: 'VEGA FORGE Opus',   // המנוע החזק
    maxTokens: 1000,
  });
  const res = await tb.chat(
    [{ role: 'user', content: 'נתח את הסנטימנט של הטקסט: "השירות היה מעולה!"' }],
    { system: 'אתה מנתח סנטימנט. ענה במילה אחת: חיובי/שלילי/נייטרלי.' }
  );
  console.log(res.content[0].text);
}

// ---------- 3. עם כלים (tool use) — כמו NewsLens ----------
async function withTools() {
  const tb = new TokenBank('links_sk_live_YOUR_KEY');
  const res = await tb.chat(
    [{ role: 'user', content: 'נתח את הכתבה הזו' }],
    {
      tools: [{
        name: 'submit_analysis',
        description: 'הגש ניתוח מובנה של הכתבה',
        input_schema: {
          type: 'object',
          properties: {
            sentiment: { type: 'string' },
            summary:   { type: 'string' },
          },
          required: ['sentiment', 'summary'],
        },
      }],
      tool_choice: { type: 'tool', name: 'submit_analysis' },
    }
  );
  // התשובה תכיל tool_use block
  const toolUse = res.content.find(c => c.type === 'tool_use');
  console.log(toolUse.input);
}

// ---------- 4. טיפול בשגיאות ----------
async function withErrorHandling() {
  const tb = new TokenBank('links_sk_live_YOUR_KEY');
  try {
    const res = await tb.chat([{ role: 'user', content: 'שלום' }]);
    console.log(res.content[0].text);
  } catch (err) {
    if (err instanceof TokenBankError) {
      // הודעה מתורגמת לעברית, מוכנה להצגה למשתמש
      console.error('שגיאת בנק:', err.message);
      if (err.status === 402) {
        // הארנק ריק — הפנה לטעינה
        window.open(TokenBank.signupUrl(), '_blank');
      }
    } else {
      console.error('שגיאת רשת:', err.message);
    }
  }
}
