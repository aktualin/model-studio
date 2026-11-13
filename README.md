# Model Studio

Admin console for issuing **virtual API keys** that proxy to a single upstream AI provider
plan (Anthropic, or an OpenAI-compatible Model Studio endpoint). Each virtual key gets its own
name, requests-per-second limit, tokens-per-minute budget, and optional expiry — the same shape
as how Anthropic's console / Claude Code issue scoped keys against one account. The proxy itself
never reparses the Anthropic Messages / OpenAI chat format: it forwards requests and streams
responses through byte-for-byte, so any client that already speaks that API works unmodified.

## Stack

- Next.js 16 (App Router) + TypeScript (strict) + Tailwind CSS 4
- Prisma 7 + `@prisma/adapter-pg`, PostgreSQL on Supabase
- Deploy target: Vercel

## Local setup

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

- `DATABASE_URL` / `DIRECT_URL` — your Supabase Postgres connection strings (pooled on port
  6543 for the app, direct on port 5432 for migrations).
- `AI_PROVIDER` — `anthropic` (default) or `modelstudio`.
- `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` — the one real upstream key/model every virtual key
  proxies to, when `AI_PROVIDER=anthropic`.
- `MODEL_STUDIO_API_KEY` / `MODEL_STUDIO_BASE_URL` / `MODEL_STUDIO_MODEL` — only used when
  `AI_PROVIDER=modelstudio`.

Run the first migration (uses `DIRECT_URL`):

```bash
npx prisma migrate dev --name init
```

Start the dev server:

```bash
npm run dev
```

Open <http://localhost:3000> — it redirects to `/admin`.

## Using a virtual key

1. In `/admin`, click **Buat API Key**, set its limits/expiry, and copy the secret shown once.
2. Call the proxy exactly as you would call the real provider, but point the client at this app
   and send the virtual key instead of the real one:

   ```bash
   curl http://localhost:3000/api/v1/messages \
     -H "x-api-key: sk-ms-..." \
     -H "content-type: application/json" \
     -d '{"model":"claude-sonnet-5-5","max_tokens":256,"messages":[{"role":"user","content":"hi"}]}'
   ```

   Any path under `/api/v1/*` is forwarded to the configured upstream (`https://api.anthropic.com`
   for `AI_PROVIDER=anthropic`, or `MODEL_STUDIO_BASE_URL` for `modelstudio`) with the server's
   real credentials swapped in — streaming included.
3. Requests over the key's rps/tpm limits get a `429`; a revoked or expired key gets a `401`.

## Deploying to Vercel

1. Push this repo and import it in Vercel.
2. Set the same environment variables from `.env.example` for both **Production** and
   **Preview** in the project's dashboard.
3. `npm run build` runs `prisma generate` before `next build` (see `package.json`).
4. Apply migrations against the production database once, from your machine or CI:

   ```bash
   DIRECT_URL="<production direct url>" npx prisma migrate deploy
   ```

5. Verify: open the deployed `/admin` URL, create a key, and call `/api/v1/...` with it; check
   function logs in the Vercel dashboard for errors.

## Notes

- The in-memory rate limiter in `src/lib/key-rate-limit.ts` is per-instance — fine for a single
  deployment, but swap it for a shared store (e.g. Upstash Redis) if this ever runs across
  multiple instances concurrently.
- Request/token counters are best-effort: streamed responses are scanned for `usage` fields as
  they pass through, so they reflect what the upstream actually reported.
- No authentication guards `/admin` yet — add one before exposing it outside a trusted network.
