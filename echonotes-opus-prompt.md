You are working on a project called EchoNotes — a React + TypeScript + Vite web app for uploading audio files, transcribing them with an LLM, and summarizing the transcripts with an LLM.

Your job is to generate ALL the code changes needed to integrate Supabase (database + storage) into the existing frontend so that:
1. Audio files can be uploaded to Supabase Storage
2. Audio file metadata is tracked in a Supabase PostgreSQL table
3. The app is ready for future LLM transcription + summarization (the database schema supports it, but you are NOT building the AI pipeline yet)
4. Both localhost:5173 (dev) and the Vercel production URL connect to the same Supabase project

---

## SUPABASE PROJECT INFO

- Project URL: https://tafccwxfauvbbeglsxrl.supabase.co
- Anon Key: sb_publishable_dCywfnhM8qnPi3x6rMdGpw_hMInS_39
- Storage Bucket Name: audio-uploads (public bucket)
- Database Table Name: audio_files

### Database Schema (already created in Supabase):
```sql
CREATE TABLE audio_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  duration_seconds FLOAT,
  transcript TEXT,
  summary TEXT,
  status TEXT DEFAULT 'uploaded',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

Status flow: 'uploaded' → 'transcribing' → 'transcribed' → 'summarizing' → 'completed'

RLS is enabled with a temporary "allow all" policy (auth will be added later by the team).

Storage policies allow public uploads, reads, and deletes on the 'audio-uploads' bucket.

---

## CURRENT PROJECT STRUCTURE

```
CIS376-Project/
├── README.md
└── EchoNotes/
    ├── backend/          # FastAPI (DO NOT TOUCH)
    │   ├── app/
    │   │   ├── __init__.py
    │   │   └── main.py   # Just a /health endpoint
    │   └── requirements.txt
    └── frontend/         # Vite + React 19 + TypeScript
        ├── package.json
        ├── vite.config.ts
        ├── tsconfig.json
        ├── tsconfig.app.json
        ├── tsconfig.node.json
        ├── index.html
        ├── eslint.config.js
        ├── public/
        ├── src/
        │   ├── main.tsx
        │   ├── App.tsx        # Default Vite template (counter demo)
        │   ├── App.css
        │   ├── index.css
        │   └── assets/
        │       ├── hero.png
        │       ├── react.svg
        │       └── vite.svg
        └── .gitignore         # Already includes *.local
```

---

## CURRENT FILE CONTENTS

### package.json
```json
{
  "name": "frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.2.4",
    "react-dom": "^19.2.4"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.4",
    "@types/node": "^24.12.0",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "eslint": "^9.39.4",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    "globals": "^17.4.0",
    "typescript": "~5.9.3",
    "typescript-eslint": "^8.57.0",
    "vite": "^8.0.1"
  }
}
```

### vite.config.ts
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

### src/App.tsx
```tsx
import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/App.tsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <button
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://vite.dev/" target="_blank">
                <img className="logo" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/vitejs/vite" target="_blank">
                <svg className="button-icon" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://chat.vite.dev/" target="_blank">
                <svg className="button-icon" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/vite_js" target="_blank">
                <svg className="button-icon" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg className="button-icon" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App
```

---

## WHAT YOU MUST GENERATE

Generate the COMPLETE contents of every file that needs to be created or modified. For each file, output the full file path relative to the repo root and the complete file content. DO NOT generate partial files or diffs.

### Files to CREATE:

1. **EchoNotes/frontend/.env.example**
   - Template file teammates copy to .env.local
   - Contains VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY with placeholder values
   - Include a comment pointing to where to find the values

2. **EchoNotes/frontend/src/lib/supabaseClient.ts**
   - Import createClient from @supabase/supabase-js
   - Read VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from import.meta.env
   - Throw a helpful error if either is missing
   - Export the initialized client

3. **EchoNotes/frontend/src/lib/audioStorage.ts**
   - Export an AudioFile TypeScript interface matching the database schema
   - Export these functions:
     - uploadAudio(file: File) → uploads to Storage bucket, inserts metadata row, returns AudioFile
     - listAudioFiles() → queries all rows ordered by created_at desc, returns AudioFile[]
     - getAudioUrl(filePath: string) → returns the public URL from Storage
     - deleteAudio(id: string, filePath: string) → removes from both Storage and database
     - updateAudioMetadata(id, updates) → updates transcript/summary/status fields
   - Use the bucket name 'audio-uploads'
   - Timestamp-prefix filenames to avoid collisions: `${Date.now()}_${file.name}`

### Files to MODIFY:

4. **EchoNotes/frontend/package.json**
   - Add "@supabase/supabase-js": "^2.49.1" to dependencies
   - Keep everything else exactly the same

---

## CONSTRAINTS

- DO NOT modify any backend files
- DO NOT change the UI (App.tsx, App.css, index.css stay exactly as they are)
- DO NOT add authentication — that comes later
- DO NOT build the LLM transcription/summarization pipeline yet — just make sure the schema supports it
- This is a group project — keep code clean and well-commented so teammates can understand it
- Use TypeScript throughout
- The .env.local file should NOT be generated (it's gitignored and each dev creates their own from .env.example)

---

## OUTPUT FORMAT

For each file, output:

### FILE: [path]
```[extension]
[complete file contents]
```

Generate all files now.
