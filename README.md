# Smart Bytes Challenge

Mobile-first browser quiz for the **Smart Bytes** scientific and technological club — University of Tamanrasset, Algeria. Built with static HTML, CSS, and vanilla JavaScript (no build step).

## Quick start

1. Open the project folder.
2. Double-click `index.html`, or serve the folder with any static host.
3. Play on a phone (portrait) or resize the browser to ~375px width.

Optional local server:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Project files

| File | Purpose |
|------|---------|
| `index.html` | Screens, modal, structure |
| `style.css` | Mobile-first UI, animations, accessibility |
| `script.js` | Game flow, timer, scoring, storage, share |
| `questions.js` | Question bank (69 questions, 6 categories) |
| `assets/smartBytesLogo.png` | Official Smart Bytes logo |

## Replace the logo

1. Export your logo as PNG.
2. Save it as `assets/smartBytesLogo.png` (overwrite the existing file).
3. Refresh the page.

If the image is missing, the UI shows an **SB** fallback badge instead of breaking.

## Add or edit questions

Edit `questions.js`. Each entry:

```js
{
  id: 70,
  category: 'Programming Fundamentals',
  difficulty: 'Easy', // Easy | Medium | Hard
  question: 'Your question text?',
  options: ['Correct', 'Wrong', 'Wrong', 'Wrong'],
  correctAnswer: 0, // index in options (0–3)
  explanation: 'Short explanation shown after answering.'
}
```

**Categories** (keep names consistent):

- Programming Fundamentals
- Artificial Intelligence and Machine Learning
- Computer Science and Technology
- Logic and Problem Solving
- Science and Digital Culture
- Smart Bytes and Computer Science Trivia

Answer choices are **shuffled on screen** each time; `correctAnswer` always refers to the index in the `options` array in `questions.js`.

Each round picks 10 unique questions (mostly Easy, then Medium, then one Hard when available).

## Scoring

Configured at the top of `script.js` in the `SCORING` object:

| Rule | Points |
|------|--------|
| Correct answer | 100 base |
| Speed bonus | Up to 50 (based on time left on the 15s timer) |
| Combo bonus | +5 per consecutive correct after the first, max +25 |
| Wrong / timeout | 0 |

Score is applied once per question. Ranks by **correct count**:

- 0–2 → Byte Beginner  
- 3–4 → Code Explorer  
- 5–6 → Logic Hacker  
- 7–8 → Tech Master  
- 9 → Byte Champion  
- 10 → Smart Bytes Legend  

## Personal best (local only)

Stored in `localStorage` under `smartBytesChallengeBest`:

- Nickname  
- Highest score  
- Date (ISO string)  

This is **per browser / per device**, not a global leaderboard. The code exposes an empty `leaderboardApi` object in `script.js` for a future backend hook (`submitScore`, `fetchTopScores`).

## Deploy to GitHub Pages

1. Create a GitHub repository and push this folder.
2. Repository **Settings → Pages**.
3. Source: **Deploy from branch** → `main` → `/ (root)`.
4. Save; use the published URL on your Open Day QR code.

## Deploy to Netlify

1. Drag the project folder into [Netlify Drop](https://app.netlify.com/drop) or connect the repo.
2. Build command: *(none)*  
3. Publish directory: `/` (root)

## Game flow

`HOME → PLAYER SETUP → PLAYING → RESULTS`

- 10 questions, 15 seconds each, exit round with confirmation  
- Share via Web Share API or clipboard fallback  
- Respects `prefers-reduced-motion` (disables particle background)  

## Limitations

- No shared online leaderboard in v1  
- Logo and questions are maintained manually in the repo  
- Requires a modern mobile browser (ES6+, `localStorage`)  

## License

For educational and Smart Bytes Open Day use at the University of Tamanrasset.
