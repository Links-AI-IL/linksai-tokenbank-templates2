// ============================================================
//  דוגמת שימוש — Token Bank (React)
// ============================================================
import React, { useState } from 'react';
import { useTokenBank, tokenBankSignupUrl } from './useTokenBank';

export default function Example() {
  const [apiKey, setApiKey] = useState('');
  const [prompt, setPrompt] = useState('');
  const { send, loading, error, data } = useTokenBank(apiKey, {
    model: 'VEGA FORGE Sonnet',
  });

  const handleSend = async () => {
    try {
      await send([{ role: 'user', content: prompt }]);
    } catch (e) {
      // השגיאה כבר ב-error state, מתורגמת לעברית
    }
  };

  const answer = data?.content?.find(c => c.type === 'text')?.text;

  return (
    <div dir="rtl" style={{ maxWidth: 480, margin: '0 auto' }}>
      <input
        type="password"
        placeholder="links_sk_live_..."
        value={apiKey}
        onChange={e => setApiKey(e.target.value)}
      />
      <button onClick={() => window.open(tokenBankSignupUrl(), '_blank')}>
        אין לך מפתח? הירשם
      </button>

      <textarea
        placeholder="הקלד הודעה..."
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
      />
      <button onClick={handleSend} disabled={loading}>
        {loading ? 'שולח...' : 'שלח'}
      </button>

      {error && <p style={{ color: 'crimson' }}>{error.message}</p>}
      {answer && <p>{answer}</p>}
    </div>
  );
}
