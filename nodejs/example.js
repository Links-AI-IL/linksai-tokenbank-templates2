// ============================================================
//  דוגמאות שימוש — Token Bank (Node.js)
// ============================================================
const { TokenBank, TokenBankError } = require('./tokenbank');

// המפתח ממשתנה סביבה (מומלץ — לא בקוד!)
const tb = new TokenBank(process.env.LINKS_API_KEY || 'links_sk_live_YOUR_KEY');

async function main() {
  // 1. בסיסי
  const res = await tb.chat([
    { role: 'user', content: 'כתוב משפט קצר על חיפה' }
  ]);
  console.log(res.content[0].text);

  // 2. עם system + מנוע ספציפי
  const analysis = await tb.chat(
    [{ role: 'user', content: 'סכם: "המערכת עובדת מצוין"' }],
    { system: 'אתה מסכם טקסטים בקצרה.', model: 'VEGA FORGE Haiku' }
  );
  console.log(analysis.content[0].text);
}

main().catch(err => {
  if (err instanceof TokenBankError) {
    console.error('שגיאת בנק:', err.message, '(status', err.status + ')');
  } else {
    console.error('שגיאה:', err.message);
  }
  process.exit(1);
});
