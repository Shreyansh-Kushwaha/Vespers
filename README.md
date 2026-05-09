# Vespers

A calm, premium emotional wellness companion. Anonymous by design — no account, no inbox, just a private recovery code.

## Repository layout

```
.
├── frontend/   Next.js 14 (UI only — landing + chat)
└── backend/    Hono API on Node (chat + session, file-backed memory)
```

The two halves talk over HTTP. The frontend reads `NEXT_PUBLIC_BACKEND_URL` to know where the API lives.

## Local development

You need two terminals.

### 1) Backend

```bash
cd backend
cp .env.example .env
# edit .env and paste your Gemini key (free at https://aistudio.google.com/apikey)
npm install
npm run dev
# → http://localhost:8787
```

### 2) Frontend

```bash
cd frontend
cp .env.example .env.local      # default points at http://localhost:8787
npm install
npm run dev
# → http://localhost:3000  (or whatever port Next picks)
```

Visit the landing at `/` and the chat at `/app`.

## Deploy

The two pieces are independently deployable.

### Frontend (Vercel / Netlify / Cloudflare Pages)
- Set the build dir to `frontend/`.
- Build command: `npm run build`
- Set env var: `NEXT_PUBLIC_BACKEND_URL=https://<your-backend-host>`

### Backend (Railway / Render / Fly.io / Cloudflare Workers / any Node host)
- Set the working dir to `backend/`.
- Build: `npm run build` — Start: `npm start` (or `npm run dev` for development hosts)
- Required env: `GEMINI_API_KEY`, `FRONTEND_ORIGIN=https://<your-frontend-host>`
- Optional env: `GEMINI_MODEL`, `PORT`

The backend stores conversation memory in `backend/data/sessions.json`. For most hosts this is fine on a persistent volume; for Cloudflare Workers / serverless, swap `lib/memory.ts` to your KV / database of choice.

## Stack

- **Frontend**: Next.js 14 (App Router), Tailwind, Framer Motion, Lenis, custom paper/ink/calligraphy design system
- **Backend**: Hono on `@hono/node-server`, `@google/generative-ai`, file-backed JSON memory
- **AI**: Google Gemini (free tier friendly)

## Privacy posture

- No accounts, no email, no identity collection
- Conversations are linked to a private recovery code (`VESP-XXXX-XXXX`) the user alone keeps
- No passwords, payments, or government identifiers are stored
- The system prompt instructs the model not to ask for or echo personal identifiers
