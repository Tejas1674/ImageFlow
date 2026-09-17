# Client

```bash
npm install
cp .env.example .env   # point at your running API
npm run dev
```

Opens at http://localhost:5173.

## How it works

- `hooks/useImageUpload.js` is the single source of truth for upload state: it
  validates format client-side, uploads via `api/imageApi.js`, then polls each
  image's status until the backend resolves it to `ACCEPTED`/`REJECTED`.
- `components/ImageUploader.jsx` renders the dropzone plus three sections
  (Accepted / Rejected / In progress) driven purely by that hook's state.
- `components/ImagePreviewCard.jsx` shows the local preview (`URL.createObjectURL`),
  a live status badge, upload progress, and any rejection reasons.

No client-side routing/state library needed at this scale — plain hooks are enough.
For a larger app, lift `useImageUpload`'s state into React Context or swap in
React Query for the polling/caching.
