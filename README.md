# TinyTCD AI — Vercel deployment

This project deploys TinyTCD AI as a shared website with a server-side Gemini connection.

## Deploy

1. Create a new GitHub repository and upload the contents of this folder.
2. Import that repository at https://vercel.com/new.
3. In Vercel, open Project → Settings → Environment Variables.
4. Add `GEMINI_API_KEY` with a **newly generated** Google AI Studio key.
5. Optionally add `GEMINI_MODEL` with `gemini-2.5-flash`.
6. Add the variables to Production (and Preview if desired), save, then redeploy.

## Important

- Do not put your Gemini API key in `index.html`, GitHub, or any browser-side code.
- The previously pasted key should be revoked and replaced before deployment.
- Users must visit the deployed Vercel URL. A local `file://` copy cannot call the hosted `/api/chat` endpoint correctly.
- The 30 named models are persona profiles routed to the configured Gemini model; they are not 30 separate underlying AI engines.
- Add rate limiting / authentication before sharing widely, otherwise visitors can consume your Gemini quota.
