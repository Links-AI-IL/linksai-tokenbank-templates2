# ============================================================
#  דוגמאות שימוש — Token Bank (Python)
# ============================================================
import os
from tokenbank import TokenBank, TokenBankError

# המפתח ממשתנה סביבה (מומלץ — לא בקוד!)
tb = TokenBank(os.environ.get("LINKS_API_KEY", "links_sk_live_YOUR_KEY"))


def main():
    # 1. בסיסי
    res = tb.chat([{"role": "user", "content": "כתוב משפט קצר על ירושלים"}])
    print(res["content"][0]["text"])

    # 2. עם system + מנוע ספציפי
    analysis = tb.chat(
        [{"role": "user", "content": 'סכם: "הבנק עובד מצוין"'}],
        system="אתה מסכם טקסטים בקצרה.",
        model="VEGA FORGE Haiku",
    )
    print(analysis["content"][0]["text"])

    # 3. עם כלים (tool use)
    tool_res = tb.chat(
        [{"role": "user", "content": "נתח את הסנטימנט"}],
        tools=[{
            "name": "submit_sentiment",
            "description": "הגש ניתוח סנטימנט",
            "input_schema": {
                "type": "object",
                "properties": {"sentiment": {"type": "string"}},
                "required": ["sentiment"],
            },
        }],
        tool_choice={"type": "tool", "name": "submit_sentiment"},
    )
    tool_use = next(c for c in tool_res["content"] if c["type"] == "tool_use")
    print(tool_use["input"])


if __name__ == "__main__":
    try:
        main()
    except TokenBankError as e:
        print(f"שגיאת בנק: {e} (status {e.status})")
    except Exception as e:
        print(f"שגיאה: {e}")
