# Funda amaGama 🗣️ — isiZulu Vocabulary Trainer

A friendly web app for building and drilling isiZulu vocabulary at **IEB First
Additional Language** level — with quizzes, flashcards, videos, progress
tracking, and a **shared leaderboard** so you and your classmates can compete.

Built with **React + Vite**. Personal data (your words, videos and progress)
lives in your browser; the leaderboard syncs across everyone via **Supabase**.

---

## ✨ Features

- **Vocabulary** organised into themed lists (greetings, family, school, food,
  verbs, describing words, colours, body, animals, numbers) — seeded with a
  solid FAL starter set. Add / edit / delete words, create your own lists, and
  **import** from pasted text or a spreadsheet.
- **Quizzes**: multiple choice (isiZulu→English & English→isiZulu), typing/
  spelling, and flip **flashcards**. Quiz any list, a **mixed** pool, or a
  **“review my mistakes”** set. Instant feedback + a score at the end.
- **Videos**: attach YouTube clips per topic for pronunciation & lessons.
- **Progress dashboard**: words practised, quizzes done, accuracy, day streak,
  and a mastery bar per category.
- **Leaderboard**: everyone enters a display name; quiz scores post to a shared,
  cross-device ranking.

---

## 🏃 Run it locally

You need [Node.js](https://nodejs.org) 18+ installed.

```bash
# 1. install dependencies
npm install

# 2. start the dev server
npm run dev
```

Open the URL it prints (usually <http://localhost:5173>). The app works
immediately — the only thing that needs setup is the **shared leaderboard**
(below). Until then, everything else (vocab, quizzes, videos, progress) works
fully offline on your device.

To make a production build: `npm run build`, preview it with `npm run preview`.

---

## 📚 How to add & manage vocab

Open the **Vocab** tab.

- **Add a word** → `➕ Add word`. Fill in isiZulu + English (example sentence and
  noun class are optional).
- **Edit / delete** → the ✏️ and 🗑️ icons on any word.
- **New list** → `🗂️ New list` — perfect for a topic from your syllabus. Give it
  a name and an icon.
- **Import a list** → `📥 Import`. Paste one word per line as:

  ```
  isiZulu, English
  inja, dog
  ikati, cat
  ```

  You can also add an example and noun class per row:
  `isiZulu, English, example, class`. **Commas or tabs** both work, so you can
  copy straight out of Excel / Google Sheets. Choose an existing list or create
  a new one on import.
- **Restore starter** → `↺` re-adds any of the built-in starter words you may
  have deleted (it never creates duplicates).

> Note: your custom words are stored **on your own device** (browser
> localStorage). They don't automatically appear on a friend's phone — but you
> can paste/import the same list on any device. The **leaderboard** is the part
> that's shared across everyone.

---

## 🏆 How the leaderboard works

- Each person sets a **display name** (top-right, or when first opening the app).
- When you finish a quiz you can **post your score**. Score = 10 points per
  correct answer, +25 bonus for a perfect round.
- The Leaderboard tab shows the **top scores from everyone**, highlights **your**
  rows, and shows **your best rank**.
- There's no login — it's a friendly class leaderboard, so names aren't
  password-protected. That keeps it zero-friction for classmates.

### Setting up the leaderboard (one-time, ~3 minutes, free)

The leaderboard needs a free Supabase project. Without it, the whole app still
works — the Leaderboard tab just shows a “not connected yet” message.

**1. Create a project**
- Go to <https://supabase.com> → sign in → **New project**.
- Pick a name and a database password (save it somewhere), choose the free plan,
  and wait ~1 minute for it to provision.

**2. Create the tables**
- In your project, open the **SQL Editor** → **New query**, paste this and click
  **Run**. (If you already created `scores` earlier, this safely adds the new
  bits — run the whole thing again.)

```sql
-- ----- scores (leaderboard) -----
create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  score int not null,
  quiz_mode text,
  category text,
  accuracy int,
  created_at timestamptz default now()
);

-- per-file challenge leaderboards live in the same table:
alter table public.scores add column if not exists challenge_id uuid;

alter table public.scores enable row level security;

drop policy if exists "anyone can read scores" on public.scores;
create policy "anyone can read scores"
  on public.scores for select using (true);

drop policy if exists "anyone can add a score" on public.scores;
create policy "anyone can add a score"
  on public.scores for insert
  with check (
    char_length(display_name) between 1 and 24
    and score >= 0 and score <= 100000
  );

-- ----- challenges (vocab sets made from notes files) -----
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  words jsonb not null,
  created_at timestamptz default now()
);

alter table public.challenges enable row level security;

drop policy if exists "anyone can read challenges" on public.challenges;
create policy "anyone can read challenges"
  on public.challenges for select using (true);

drop policy if exists "anyone can add a challenge" on public.challenges;
create policy "anyone can add a challenge"
  on public.challenges for insert
  with check (
    char_length(name) between 1 and 60
    and jsonb_typeof(words) = 'array'
  );
```

**3. Get your keys**
- Go to **Project Settings → API**.
- Copy the **Project URL** and the **anon / public** key. (Do **not** use the
  `service_role` secret key — the anon key is the correct one for a browser app.)

**4. Add the keys to the app**
- Copy `.env.example` to `.env.local` in the project root.
- Fill in your values:

  ```
  VITE_SUPABASE_URL=https://YOUR-PROJECT-ref.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-public-key
  ```

- Restart `npm run dev` (Vite only reads env files on start).

> Admin powers (creating/deleting challenges, moderating leaderboards) use a
> separate **admin password stored in the database** — see *Admin controls*
> below. It is deliberately NOT an env var, so it never ships in the browser.

The Leaderboard tab should now be live, and scores will sync across every device
running the app. 🎉

> The anon key is designed to be public (it's shipped in the browser). Row-Level
> Security policies above keep it safe: people can read the board and add a
> score, but can't wipe or edit others' rows.

---

## 📎 Challenges (quiz sets from a notes file)

The **Files** tab lets **you** (the admin) turn a PDF of isiZulu notes into a
shared quiz set — each with its **own leaderboard** — that friends can compete on.

**How it works**
1. On the **Files** tab, click **Admin sign in** and enter your admin password
   (see *Admin controls* below). Friends can play challenges without it; only you
   can create/delete them.
2. Click **Add notes file** → upload a **PDF** (or `.txt`), or paste the text.
3. The app scans the notes for isiZulu–English pairs. **You review them** —
   edit, delete junk rows, use **Swap columns** if the sides are flipped, add any
   it missed — then give the challenge a name and **Publish**.
4. Everyone now sees that challenge, can quiz on it, and competes on its own
   dedicated leaderboard.

**Good to know**
- Extraction is best-effort. It works best when notes have one pair per line
  (e.g. `umama – mother`, `isikole: school`, or `ukudla means to eat`). Messy
  prose gives rougher results — that's what the review step is for.
- **Scanned / photo PDFs have no selectable text**, so nothing can be extracted
  from them. Paste the text in that case.
- Challenges live in Supabase (shared), unlike your personal word lists (which
  stay on your device).

---

## 🛡️ Admin controls

You (and only you) can create/delete challenges and moderate the leaderboards
(remove entries with offensive names, or award points). Because there's no login
and the anon key is public, a browser-only check couldn't truly stop others — so
the **admin password lives in the database** and every destructive action is
verified server-side.

**One-time setup**
1. Open **`supabase-admin.sql`** (in this repo). Change the line
   `'CHANGE-ME-to-your-admin-password'` to your own private password.
2. Paste the whole file into Supabase **SQL Editor** and **Run**. This creates
   the admin functions and makes challenge creation admin-only.

**Using it**
- **Files** tab → **Admin sign in** → enter that password. It's verified by the
  database and remembered on your device (never in the app code). Use **Lock** to
  sign out.
- Once signed in: an **✕** appears on each challenge (delete it + its board), and
  each leaderboard gains **✕** on rows (remove an entry) plus an **Award points**
  button (give a name bonus points).
- To change the password later:
  `update public.app_secrets set value = 'new-password' where key = 'admin_password';`

> Deleting a challenge also clears its leaderboard. Deletes can't be undone.

---

## 🚀 Deploy for free (share a link with friends)

The easiest option is **Vercel** or **Netlify**. Both give you a public URL you
can send to classmates.

First, put the project on GitHub (create an empty repo, then):

```bash
git init
git add .
git commit -m "isiZulu vocab app"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/zulu-vocab.git
git push -u origin main
```

### Option A — Vercel
1. Go to <https://vercel.com> → **Add New → Project** → import your GitHub repo.
2. Vercel auto-detects Vite (Build: `npm run build`, Output: `dist`). Leave
   defaults.
3. Under **Environment Variables**, add `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` with your values. (No `VITE_OWNER_CODE` — admin uses
   a database password instead; see *Admin controls*.)
4. **Deploy**. You'll get a URL like `https://zulu-vocab.vercel.app` — share it!

### Option B — Netlify
1. Go to <https://netlify.com> → **Add new site → Import an existing project** →
   pick your repo.
2. Build command `npm run build`, publish directory `dist`.
3. Add the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables
   under **Site settings → Environment variables**.
4. **Deploy**.

> Whenever you change env vars on Vercel/Netlify, trigger a redeploy so they take
> effect. Everyone who opens your deployed URL shares the **same** leaderboard.

---

## 🗂️ Project structure

```
zulu-vocab/
├── index.html
├── package.json
├── vite.config.js
├── .env.example            # copy to .env.local and add your Supabase keys
├── public/favicon.svg
└── src/
    ├── main.jsx            # app entry
    ├── App.jsx            # nav shell + tabs
    ├── styles.css         # all styling (SA-flavoured palette)
    ├── lib/
    │   ├── supabase.js    # leaderboard client + helpers
    │   └── storage.js     # localStorage helpers
    ├── data/
    │   ├── seedVocab.js   # starter FAL vocab + categories
    │   └── seedVideos.js  # starter video links + search hints
    ├── context/
    │   └── VocabContext.jsx  # vocab, videos & progress state
    ├── components/        # NameModal, ProgressBar, VideoEmbed
    └── pages/             # Dashboard, Vocab, Quiz, Videos, Leaderboard
```

## 🧮 Data model (quick reference)

**Local (your device):**
- `Word` — `{ id, category, isizulu, english, example?, nounClass? }`
- `Category` — `{ id, name, emoji }`
- `Video` — `{ id, categoryId, title, youtubeUrl }`
- `Progress` — per-word stats, quizzes completed, accuracy, streak, category
  mastery.

**Supabase (shared) — table `scores`:**

| column        | type          | notes                         |
|---------------|---------------|-------------------------------|
| id            | uuid          | primary key                   |
| display_name  | text          | the player's chosen name      |
| score         | int           | points for that quiz          |
| quiz_mode     | text          | which mode was played         |
| category      | text          | which list                    |
| accuracy      | int           | percent correct               |
| created_at    | timestamptz   | auto                          |

---

Sala kahle, and happy studying! 🇿🇦 **Ukuqhubeka kuyimpumelelo** — persistence
brings success.
