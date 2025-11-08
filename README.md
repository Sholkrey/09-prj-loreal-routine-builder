# L'Oréal | Smart Routine & Product Advisor

Bring-your-style version with L’Oréal brand colors, product selection, saved state, AI-generated routine via Cloudflare Worker, follow-up chat, product search, RTL support, and optional web search.

## Features

- Product grid: Filter by category and search keyword.
- Selection: Click a card or the Select/Unselect button; visual highlight + badge.
- Description: Per-card Details toggle reveals full description.
- Selected list: Removable chips + Clear All. Persists via localStorage.
- Routine generation: Sends selected products + messages to a Cloudflare Worker (OpenAI gpt-4o, messages param).
- Follow-up chat: Conversation memory, guardrails for allowed topics.
- RTL toggle: Persists layout direction.
- Web search (beta): Optional checkbox adds real-time references if BRAVE_API_KEY is configured.

## Quick Start (Front-End)

1. Open `index.html` in a live server (VS Code Live Preview or similar).
2. Set your Worker URL in `secrets.js`:

```js
window.SECRETS = { WORKER_URL: "https://your-worker.workers.dev" };
```

3. Filter or search products; click to select. Click Details for descriptions.
4. Click Generate Routine. Then ask follow-up questions in the chat.
5. Toggle “Use web search (beta)” if you configured Brave search in the Worker.

## Cloudflare Worker Setup

1. Create a Worker project (e.g. `wrangler init loreal-routine-builder`).
2. Put the code from `worker-example.js` into `src/index.js`.
3. Add secrets:

```bash
wrangler secret put OPENAI_API_KEY
wrangler secret put BRAVE_API_KEY   # optional
```

4. Publish:

```bash
wrangler deploy
```

5. Copy the deployed URL (e.g. `https://loreal-routine-builder.<your>.workers.dev`) into `secrets.js`.

### Worker Request Payload

```json
{
  "messages": [{ "role": "user", "content": "Generate routine" }],
  "selected": [
    {
      "id": 1,
      "name": "Foaming Facial Cleanser",
      "brand": "CeraVe",
      "category": "cleanser",
      "description": "..."
    }
  ],
  "enableWebSearch": true
}
```

### Worker Response (excerpt)

```json
{
  "id": "chatcmpl-...",
  "choices": [
    {
      "message": { "role": "assistant", "content": "Morning:\n1. Cleanser ..." }
    }
  ]
}
```

## Student Guidelines Applied

- No npm/OpenAI SDK; uses `fetch` + `async/await`.
- Uses `messages` instead of `prompt`; checks `choices[0].message.content`.
- Simple vanilla JS; script referenced in `index.html` (no modules/exports).

## Conversation Guardrails

- Only responds to topics containing common skincare/hair/makeup/fragrance keywords.
- Redirects politely if off-topic.

## Persistence

- Selected product IDs stored under `loreal_selected_products_v1` in localStorage.
- Direction stored under `loreal_dir`.

## Web Search (Extra Credit)

- Requires `BRAVE_API_KEY` secret in Worker.
- Enable by checking the checkbox; Worker adds brief citation list (top 3 results).

## RTL Support

- Toggle sets `dir="rtl"` on `<html>`; styles adapt (message alignment, chips, gradients).

## Troubleshooting

| Issue                       | Fix                                                            |
| --------------------------- | -------------------------------------------------------------- |
| "Worker URL not configured" | Set `window.SECRETS.WORKER_URL` in `secrets.js`.               |
| 401 / OpenAI error          | Verify `OPENAI_API_KEY` secret and active billing.             |
| Brave search empty          | Ensure `BRAVE_API_KEY` or uncheck web search.                  |
| Products not loading        | Check `products.json` path + browser console for fetch errors. |

## Quality Gates

- Build: PASS (static HTML/CSS/JS only).
- Lint: N/A (no tooling configured).
- Tests: N/A (manual verification recommended: selection, routine generation, follow-up, persistence, RTL toggle, web search).

## Suggested Next Steps

- Add simple unit tests with a lightweight runner (optional).
- Add accessibility audit (focus states, contrast review).
- Add category option for "skincare" if you want direct filtering (data uses that category too).

## License

Educational classroom project. Do not ship with real production secrets.
