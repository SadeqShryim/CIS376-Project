# 🎧 EchoNotes — Supabase Integration Handoff

Hey team! Here's the rundown on what got set up so you can jump straight into building the UI without worrying about the backend stuff.

---

## What's New

I hooked up our frontend to Supabase so we can upload, store, and manage audio files. Everything talks to our shared Supabase project — same database whether you're running locally or on Vercel.

### New files:

- **`src/lib/supabaseClient.ts`** — Sets up the connection to Supabase. You'll probably never need to touch this.
- **`src/lib/audioStorage.ts`** — This is the good stuff. All the functions you need to work with audio files. Just import and go.
- **`.env`** — Has our Supabase URL and API key. **Already gitignored**, so it won't get pushed.

### Modified files:

- **`package.json`** — Added `@supabase/supabase-js` as a dependency.
- **`.gitignore`** — Added `.env` so our keys stay safe.

---

## Getting Started (for teammates)

1. **Pull the latest code**
2. **Install dependencies:**
   ```bash
   cd EchoNotes/frontend
   npm install
   ```
3. **Create your `.env` file** in `EchoNotes/frontend/`:
   ```
   VITE_SUPABASE_URL=https://tafccwxfauvbbeglsxrl.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_dCywfnhM8qnPi3x6rMdGpw_hMInS_39
   ```
   (Ask the group chat if you don't have these values)
4. **Run the dev server:**
   ```bash
   npm run dev
   ```
   That's it. You're connected to Supabase.

---

## How to Use the Audio Functions

Everything lives in `src/lib/audioStorage.ts`. Just import what you need:

```tsx
import {
  uploadAudio,
  listAudioFiles,
  getAudioUrl,
  deleteAudio,
  updateAudioMetadata,
} from '../lib/audioStorage';

import type { AudioFile } from '../lib/audioStorage';
```

### Upload a file

```tsx
// e.g. from an <input type="file"> onChange handler
const handleUpload = async (file: File) => {
  const audioFile = await uploadAudio(file);
  console.log('Uploaded!', audioFile);
};
```

### List all files

```tsx
const files = await listAudioFiles();
// returns an array of AudioFile objects, newest first
```

### Get a playable URL

```tsx
const url = getAudioUrl(audioFile.file_path);
// use it in an <audio> tag:
// <audio src={url} controls />
```

### Delete a file

```tsx
await deleteAudio(audioFile.id, audioFile.file_path);
// removes from both storage and the database
```

### Update metadata (for later when we add AI stuff)

```tsx
await updateAudioMetadata(audioFile.id, {
  status: 'transcribing',
  transcript: 'some transcript text...',
});
```

---

## The AudioFile Shape

When you get data back from these functions, it looks like this:

```ts
{
  id: "some-uuid",
  filename: "lecture-notes.mp3",
  file_path: "1711843200000_lecture-notes.mp3",
  file_size: 4500000,
  mime_type: "audio/mpeg",
  duration_seconds: null,       // we don't calculate this yet
  transcript: null,             // filled in later by AI pipeline
  summary: null,                // filled in later by AI pipeline
  status: "uploaded",           // tracks where it is in the pipeline
  created_at: "2026-03-31T...",
  updated_at: "2026-03-31T...",
}
```

Status goes: `uploaded` → `transcribing` → `transcribed` → `summarizing` → `completed`

---

## What You DON'T Need to Worry About

- **Backend/FastAPI** — don't touch it, we're not using it for this
- **Supabase setup** — database table, storage bucket, and policies are all already configured
- **Auth** — not implemented yet, that's a later thing
- **AI transcription/summarization** — the schema supports it but we're not building that part yet

---

## Quick Troubleshooting

| Problem | Fix |
|---------|-----|
| App crashes on startup with "Missing VITE_SUPABASE_URL" | You forgot to create the `.env` file — see step 3 above |
| Upload fails with a storage error | Make sure the `audio-uploads` bucket exists in Supabase and has public policies |
| "npm install" fails | Try deleting `node_modules` and `package-lock.json`, then run `npm install` again |

---

That's everything. Go build some cool UI! 🚀
