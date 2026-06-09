// Netlify Function: secure proxy to Anthropic's Messages API.
// The API key is read from the ANTHROPIC_API_KEY environment variable
// (set it in Netlify dashboard → Site settings → Environment variables).
// This keeps the key off the client and avoids browser CORS issues.
//
// Using Claude Haiku — the cheapest current model ($1/$5 per 1M tokens),
// ideal for structured extraction. ~3x cheaper than Sonnet.

const MODEL = 'claude-haiku-4-5';

export default async (request) => {
  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response('', {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (request.method !== 'POST') {
    // Allow a simple GET health-check to verify the key is configured
    if (request.method === 'GET') {
      const hasKey = !!process.env.ANTHROPIC_API_KEY;
      return json({
        ok: true,
        function: 'extract',
        apiKeyConfigured: hasKey,
        message: hasKey
          ? 'المفتاح مضبوط ✓ — الدالة جاهزة'
          : 'تحذير: ANTHROPIC_API_KEY غير مضبوط. أضِفه من Site settings ← Environment variables ثم أعد النشر.',
      });
    }
    return json({ error: 'Method not allowed' }, 405);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json({ error: 'ANTHROPIC_API_KEY غير مضبوط في إعدادات Netlify' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  // Only forward the fields we expect; force a known-good model server-side.
  const payload = {
    model: MODEL,
    max_tokens: Math.min(body.max_tokens || 1500, 4096),
    messages: body.messages || [],
  };

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });

    const text = await resp.text();
    return new Response(text, {
      status: resp.status,
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return json({ error: 'Upstream error: ' + err.message }, 502);
  }
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
