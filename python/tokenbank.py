# ============================================================
#  LINKS AI — Token Bank Client (Python)
#  גרסה: 1.0
#
#  מחבר כל סקריפט/שרת Python ל-Token Bank.
#  דורש: pip install requests
#
#  שימוש:
#    from tokenbank import TokenBank
#    tb = TokenBank("links_sk_live_...")
#    res = tb.chat([{"role": "user", "content": "שלום"}])
#    print(res["content"][0]["text"])
# ============================================================

import json
import time
import requests

TOKEN_BANK_URL = "https://token-bank.onrender.com/v1/messages"
TOKEN_BANK_SIGNUP = "https://token-bank.onrender.com"

VEGA_MODELS = {
    "forge-opus":   "VEGA FORGE Opus",
    "forge-sonnet": "VEGA FORGE Sonnet",
    "forge-haiku":  "VEGA FORGE Haiku",
    "nova-pro":     "VEGA NOVA Pro",
    "nova-lite":    "VEGA NOVA Lite",
    "atlas-pro":    "VEGA ATLAS Pro",
    "atlas-flash":  "VEGA ATLAS Flash",
}

DEFAULT_MODEL = "VEGA FORGE Sonnet"


class TokenBankError(Exception):
    """שגיאת Token Bank עם הודעה מתורגמת לעברית."""

    def __init__(self, status, raw_text):
        try:
            parsed = json.loads(raw_text)
            api_msg = parsed.get("error", {}).get("message", raw_text)
        except (ValueError, AttributeError):
            api_msg = raw_text

        messages = {
            401: "מפתח Token Bank לא תקין. בדוק שהמפתח נכון ומתחיל ב-links_sk_",
            402: "הארנק ריק. יש לטעון יתרה בבנק כדי להמשיך.",
            403: "החשבון מושעה. פנה לתמיכה.",
            400: "בקשה לא תקינה: " + api_msg,
            429: "יותר מדי בקשות. נסה שוב בעוד רגע.",
        }

        self.status = status
        self.api_message = api_msg
        super().__init__(messages.get(status, f"שגיאת בנק ({status}): {api_msg}"))


class TokenBank:
    def __init__(self, api_key, project=None, model=DEFAULT_MODEL, max_tokens=2000, retries=2):
        if not api_key or not api_key.startswith("links_sk_"):
            raise ValueError("מפתח Token Bank לא תקין. המפתח צריך להתחיל ב-links_sk_")
        self.api_key = api_key
        self.project = project
        self.model = model
        self.max_tokens = max_tokens
        self.retries = retries

    def chat(self, messages, system=None, tools=None, tool_choice=None,
             model=None, max_tokens=None, project=None):
        """
        שליחת בקשת chat לבנק.

        :param messages: רשימת הודעות [{"role": ..., "content": ...}]
        :param system: הוראת מערכת (אופציונלי)
        :param tools: הגדרת כלים (אופציונלי)
        :param tool_choice: אילוץ כלי (אופציונלי)
        :param model: דריסת מודל לבקשה זו (אופציונלי)
        :param max_tokens: דריסת max_tokens לבקשה זו (אופציונלי)
        :return: dict — תשובת הבנק (פורמט Anthropic גולמי)
        """
        if not isinstance(messages, list) or len(messages) == 0:
            raise ValueError("messages חייב להיות רשימה לא ריקה")

        body = {
            "model": model or self.model,
            "max_tokens": max_tokens or self.max_tokens,
            "messages": messages,
        }
        if system:
            body["system"] = system
        if tools:
            body["tools"] = tools
        if tool_choice:
            body["tool_choice"] = tool_choice

        headers = {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + self.api_key,
        }
        # תגית פרויקט למעקב מפוצל ביומן הבנק (אופציונלי)
        proj = project or self.project
        if proj:
            headers["X-Links-Project"] = proj

        last_err = None
        for attempt in range(self.retries + 1):
            try:
                res = requests.post(TOKEN_BANK_URL, headers=headers,
                                    json=body, timeout=60)
                if res.ok:
                    return res.json()
                # שגיאת אימות/ארנק/בקשה — אין טעם לנסות שוב
                raise TokenBankError(res.status_code, res.text)
            except TokenBankError:
                raise
            except requests.RequestException as e:
                last_err = e
                if attempt < self.retries:
                    time.sleep(0.5 * (attempt + 1))
        raise last_err

    @staticmethod
    def signup_url():
        return TOKEN_BANK_SIGNUP

    @staticmethod
    def models():
        return dict(VEGA_MODELS)
