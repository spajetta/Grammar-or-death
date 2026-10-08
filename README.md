# Grammar or Death

A spooky irregular-verb practice game. Complete both verb forms, reach 10 points, and survive three mistakes.

Plain HTML, CSS, and JavaScript modules; no runtime dependencies, backend, accounts, database, analytics, or external font requests. All gameplay happens in the browser. The five supplied illustrations are preserved in `images/`; the game loads smaller WebP copies from `images/web/`.

The interface resembles a vintage horror-comic cover: aged-paper gutters, heavy ink borders, narration boxes, and a speech-balloon verb prompt. The supplied prerendered `images/banner_v3.png` provides the cover lettering and halftone artwork. It is served unchanged, scales without cropping on desktop and phones, and retains an accessible **Grammar or Death** heading. Captions, instructions, labels, and feedback use handwritten **Comic Neue** lettering. Regular and bold fonts are bundled in `src/fonts/`, with their SIL Open Font License in `src/fonts/OFL.txt`; they require no external font requests. Font source: [Comic Neue in Google Fonts](https://github.com/google/fonts/tree/main/ofl/comicneue). These decorations use HTML and CSS, preserving the original illustrations and keeping controls clear on desktop and mobile.

Display headings, verbs, score/life numerals, and ending headings use **[Creepster](https://github.com/google/fonts/tree/main/ofl/creepster)** in place of Impact. Its regular font and license are bundled as `src/fonts/Creepster-Regular.ttf` and `src/fonts/Creepster-OFL.txt`. The illustrated banner remains the supplied artwork.

## Run locally

Install Node.js 22 or later, then run from this folder:

```sh
npm run dev
```

Open **http://127.0.0.1:5173**. No dependency installation is needed just to play or build. On Windows PowerShell, use `npm.cmd` if the execution policy blocks `npm.ps1`.

Serve the files over HTTP; opening `index.html` directly with `file://` does not work with browser JavaScript modules. An alternative without Node is `python -m http.server 5173 --bind 127.0.0.1`.

## Rules

- Every new game starts with **0 points and 3 lives**.
- Enter the displayed base verb's **past simple** and **past participle**, then select **Check answer** or press Enter in an answer field.
- Both forms correct: **+1 point**. Either or both wrong: **−1 point and −1 life total** for that submission. Scores can be negative.
- Blank or whitespace-only fields show validation and cost nothing.
- Capitalization and leading/trailing whitespace are ignored. Enter one accepted form per field; you do not need to type all alternatives separated by a slash.
- Submitted questions lock immediately. Field feedback stays until **Next verb**. A mistake reveals both correct forms, including accepted alternatives.
- Mistakes accumulate: the first reveals a hand; the second reveals a zombie. Correct answers never restore lives or reverse the artwork.
- The third mistake ends the game with **You died!**. Reaching 10 points ends it with **You win!** and sunrise artwork. No further submissions count.
- **Play again** resets everything and shuffles a new deck. Questions do not repeat until the playable bank is exhausted; the two meanings of “lie” are separate questions with hints. There is also no immediate repeat across deck boundaries when the bank has multiple entries.

The first answer field receives focus on each question. After submission, focus moves to **Next verb** or **Play again**. Tab navigates controls; Enter activates buttons. Visible focus, labelled fields, text-based lives and correctness, live feedback announcements, and reduced-motion support are included.

## Edit the verb bank

Edit **`src/verbs.js`**, independently of the interface and scoring code. Every entry explicitly lists accepted answers for each tense:

```js
{
  base: "learn",
  pastSimple: ["learnt", "learned"],
  pastParticiple: ["learnt", "learned"]
}
```

Use lowercase forms without surrounding whitespace. Add alternatives as separate strings. An optional `hint` clarifies a meaning or pronunciation; for example the two “lie” entries distinguish reclining from telling an untruth. Alternatives such as “born/borne”, “hung/hanged”, and “struck/stricken” depend on meaning; the context-free quiz accepts both rather than inventing sentence context.

The bank contains **all 140 rows** from [Ginger Software's irregular-verb list](https://www.gingersoftware.com/content/grammar-rules/verbs/list-of-irregular-verbs), inspected on 8 October 2026, plus maintained British/American alternatives. This includes the source's regular “lie” (tell an untruth) entry. Five modal entries—**can, may, must, shall, will**—have no past participle, so they are retained with `playable: false`, empty participle arrays, and explanatory notes. **135 entries are playable**. “Been able” is a paraphrase of “can”, not a participle of that modal, so it is not taught as one. Every playable question has two real verb forms.

To add a playable entry, provide nonempty `pastSimple` and `pastParticiple` arrays. Do not set `playable: false` unless the entry should be excluded. Update the bank-count assertions in `tests/game.test.js` if you add or remove entries intentionally.

## Artwork

The located source files are named without the `(1)` suffix:

| State | Preserved original | Game copy |
| --- | --- | --- |
| Start | `images/start.png` | `images/web/start.webp` |
| First mistake | `images/first_error.png` | `images/web/first_error.webp` |
| Second mistake | `images/second_error.png` | `images/web/second_error.webp` |
| Defeat | `images/game_lost.png` | `images/web/game_lost.webp` |
| Victory | `images/game_won.png` | `images/web/game_won.webp` |

All retain their original 1536 × 1024 dimensions and composition. The WebP copies total about 3 MB instead of about 16 MB of PNGs. All five are preloaded and decoded; an already-loaded image replaces the previous scene, preserving the scene during a slow transition. Full 3:2 illustrations appear beside the controls on desktop and above them on smaller screens.

If replacing artwork, keep matching filenames. To regenerate WebP copies from originals, optionally install Python and Pillow (`python -m pip install Pillow`), then run `python scripts/optimize_images.py`. Python and Pillow are not needed to run, build, or test the delivered game.

## Verification

```sh
npm ci
npx playwright install chromium
npm run check
```

`npm run check` runs the model tests, builds the static output, then exercises that output with a real headless Chromium browser. Other commands:

- `npm test`: 13 tests of scores, lives, negative scores, one-penalty submissions, blanks, normalization, alternatives, cumulative mistakes, exact ending thresholds, locking, restart, shuffle, and bank structure.
- `npm run build`: copies only the game and optimized artwork into `dist/`.
- `npm run test:browser`: browser scenarios for feedback, keyboard submission/navigation, repeated submits, artwork states, victory/defeat, restarting after both endings, alternate answers, and deployment under `/Grammar-or-death/`.
- `npm run preview`: serves the built `dist/` at the local address above.

Browser layout checks cover 1440, 1024, 768, 390, and 320 pixel widths, image aspect ratio and loading, artwork/control separation, horizontal overflow, touch target size, focus visibility, preload declarations, and reduced-motion mode. Screenshots are written to `test-results/desktop.png`, `mobile.png`, `victory.png`, and `defeat.png` (ignored by Git).

All these checks passed locally. Browser automation currently covers Chromium; physical mobile keyboards and assistive-technology speech output were not tested. Desktop and mobile screenshots were also visually inspected. Deployment status is available in the repository's Pages settings.

## Publishing

GitHub Pages can serve this project directly from the root of `main`. No custom build or deployment workflow is required.

### GitHub Pages

Once you explicitly decide to publish and the files have been committed and pushed to the repository:

1. In **Settings → Pages → Build and deployment**, choose **Deploy from a branch**.
2. Select **main** and **/(root)**, then Save.
3. The repository-root `index.html`, `src/`, `images/web/`, and `.nojekyll` are ready to serve directly; GitHub Pages does not need a Node build.

The expected project address is `https://spajetta.github.io/Grammar-or-death/`. All asset URLs are relative so repository subpaths work. See [GitHub's publishing-source instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

### Vercel

When you explicitly decide to deploy, import the repository as a Vercel project. Choose **Other** as the framework preset, set **Build Command** to `npm run build`, and **Output Directory** to `dist`. No environment variables are needed. Alternatively the build script can run directly as `node scripts/build.js`, without installing dependencies. See [Vercel's build configuration documentation](https://vercel.com/docs/builds/configure-a-build).

## Files

- `index.html`: accessible page and initial artwork.
- `src/styles.css`: comic theme and responsive layouts.
- `src/app.js`: form handling, focus, feedback, and artwork changes.
- `src/game.js`: scoring, lives, locking, endings, and shuffled questions.
- `src/verbs.js`: editable answer bank.
- `scripts/`: local server, static build, optional artwork optimization.
- `tests/`: rules and real-browser checks.

Reloading the page starts a fresh game; progress is intentionally not saved.
