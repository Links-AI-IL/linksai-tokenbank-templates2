# LINKS AI — Token Bank Client Templates

תבניות מוכנות לחיבור **כל מערכת לינקס** ל-Token Bank — שער ה-AI המרכזי של LINKS AI.

כל הקריאות ל-AI עוברות דרך הבנק, שמטפל אוטומטית ב:
- **אימות** — לפי מפתח `links_sk_live_...`
- **ניתוב** — לספק הנכון לפי שם מנוע VEGA
- **חיוב** — מהארנק של הלקוח
- **רישום** — היסטוריית שימוש מלאה

הלקוח אף פעם לא רואה שמות ספקים אמיתיים — רק שמות **VEGA**.

---

## איזו תבנית מתאימה לי?

| סביבה | תיקייה | קובץ |
|--------|---------|------|
| תוסף Chrome / אתר | `javascript-browser/` | `tokenbank.js` |
| שרת / סקריפט Node.js | `nodejs/` | `tokenbank.js` |
| Python | `python/` | `tokenbank.py` |
| React | `react/` | `useTokenBank.js` |

---

## התחלה מהירה (3 צעדים)

**1. השג מפתח.** היכנס ל-https://token-bank.onrender.com → הירשם → העתק את המפתח `links_sk_live_...`

**2. העתק את הקובץ המתאים** לפרויקט שלך (לפי הטבלה למעלה).

**3. קרא לבנק:**

```javascript
// JavaScript / Node.js
const tb = new TokenBank('links_sk_live_...');
const res = await tb.chat([{ role: 'user', content: 'שלום' }]);
console.log(res.content[0].text);
```

```python
# Python
tb = TokenBank("links_sk_live_...")
res = tb.chat([{"role": "user", "content": "שלום"}])
print(res["content"][0]["text"])
```

זהו. הבקשה תופיע אוטומטית בבנק עם חיוב.

---

## מנועי VEGA הזמינים

| מפתח קצר | שם מלא | תיאור |
|-----------|---------|--------|
| `forge-opus` | `VEGA FORGE Opus` | החכם ביותר, יקר |
| `forge-sonnet` | `VEGA FORGE Sonnet` | מאוזן — **ברירת מחדל מומלצת** |
| `forge-haiku` | `VEGA FORGE Haiku` | מהיר וזול |
| `nova-pro` | `VEGA NOVA Pro` | OpenAI חזק |
| `nova-lite` | `VEGA NOVA Lite` | OpenAI מהיר |
| `atlas-pro` | `VEGA ATLAS Pro` | Gemini חזק |
| `atlas-flash` | `VEGA ATLAS Flash` | Gemini מהיר |

לבחירת מנוע: העבר את השם המלא (למשל `VEGA FORGE Opus`) כפרמטר `model`.

---

## תכונות שכל התבניות תומכות בהן

- **הוראת מערכת** (`system`) — הקשר קבוע לשיחה
- **כלים** (`tools` + `tool_choice`) — tool use מלא, כולל אילוץ כלי
- **ניסיונות חוזרים** — אוטומטי בשגיאות רשת (לא בשגיאות אימות/ארנק)
- **שגיאות מתורגמות** — הודעות ברורות בעברית במקום קודי HTTP גולמיים

---

## טיפול בשגיאות

ההלפר מתרגם את קודי השגיאה להודעות ברורות:

| קוד | משמעות | הודעה |
|-----|---------|--------|
| 401 | מפתח לא תקין | "מפתח Token Bank לא תקין..." |
| 402 | ארנק ריק | "הארנק ריק. יש לטעון יתרה..." |
| 403 | חשבון מושעה | "החשבון מושעה. פנה לתמיכה." |
| 400 | בקשה לא תקינה | "בקשה לא תקינה: ..." |
| 429 | יותר מדי בקשות | "יותר מדי בקשות. נסה שוב..." |

ראה `examples/` בכל תיקייה לדוגמאות מלאות, כולל tool use ו-system prompt.

---

## כפתור "קבל מפתח" (self-service)

כל מערכת צריכה לאפשר ללקוח להשיג מפתח בעצמו. הוסף כפתור שמוביל לדף ההרשמה:

```javascript
// JS / Node
window.open(TokenBank.signupUrl(), '_blank');  // https://token-bank.onrender.com
```

הלקוח: נרשם → מקבל מפתח → מעתיק → מדביק במערכת שלך → רץ.

---

*LINKS AI Ltd · Token Bank · Powered by VEGA AI Platform*
