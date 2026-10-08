import { Game } from './game.js';
import { verbs } from './verbs.js';

const game = new Game(verbs);
const $ = (id) => document.getElementById(id);
const fields = {
  pastSimple: { input: $('past-simple'), feedback: $('past-simple-feedback'), label: 'Past simple' },
  pastParticiple: { input: $('past-participle'), feedback: $('past-participle-feedback'), label: 'Past participle' },
};
const scenes = {
  start: ['01 / THE GRAVEYARD', 'Keep the dead asleep.', 'A moonlit graveyard. The central gravestone reads: Here lies bad grammar.'],
  first_error: ['02 / SOMETHING STIRS', 'A hand reaches out. Two lives remain.', 'A zombie hand emerges from the earth in front of the central gravestone.'],
  second_error: ['03 / THE DEAD RISE', 'One life left. Make it count.', 'A zombie emerges from the earth in front of the central gravestone.'],
  game_lost: ['04 / TOO LATE', 'The graveyard claims another grammarian.', 'The zombie has escaped its grave. Defeat in the moonlit graveyard.'],
  game_won: ['05 / A NEW DAWN', 'You lived to tell the tale.', 'Sunrise lights the graveyard. The zombie is gone and the central gravestone remains.'],
};

// Retain decoded images and only swap after decoding. The previous scene stays
// visible even if a player's connection is slow when they make a mistake.
const readyImages = new Map();
for (const stage of Object.keys(scenes)) {
  const image = new Image();
  image.id = 'scene-image';
  image.width = 1536;
  image.height = 1024;
  image.src = new URL(`../images/web/${stage}.webp`, import.meta.url).href;
  readyImages.set(stage, { image, ready: image.decode().catch(() => {}) });
}
let sceneVersion = 0;
async function showScene() {
  const version = ++sceneVersion;
  const stage = game.stage;
  const asset = readyImages.get(stage);
  await asset.ready;
  if (version !== sceneVersion) return;
  asset.image.alt = scenes[stage][2];
  const displayed = $('scene-image');
  if (displayed.src !== asset.image.src) displayed.replaceWith(asset.image);
  $('art-frame').dataset.stage = stage;
  $('scene-number').textContent = scenes[stage][0];
  $('scene-caption').textContent = scenes[stage][1];
}

function updateStats() {
  $('score').textContent = String(game.score).replace('-', '−');
  $('lives').textContent = game.lives;
  $('life-marks').textContent = '♥ '.repeat(game.lives).trim() || '—';
  showScene();
}

function showQuestion() {
  $('verb').textContent = game.current.base[0].toUpperCase() + game.current.base.slice(1);
  $('verb-hint').textContent = game.current.hint || '';
  $('verb-hint').hidden = !game.current.hint;
  for (const { input, feedback } of Object.values(fields)) {
    input.value = '';
    input.readOnly = false;
    input.disabled = false;
    input.removeAttribute('aria-invalid');
    input.removeAttribute('data-result');
    feedback.textContent = '';
  }
  $('feedback').textContent = '';
  $('feedback').className = 'feedback';
  $('check-answer').hidden = false;
  $('next-verb').hidden = true;
  $('play-again').hidden = true;
  $('ending').hidden = true;
  $('prompt').textContent = 'Give this verb a past';
  $('panel-note').hidden = false;
  updateStats();
  fields.pastSimple.input.focus({ preventScroll: true });
}

$('answer-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const result = game.submit(fields.pastSimple.input.value, fields.pastParticiple.input.value);
  if (!result) return;
  if (result.type === 'validation') {
    for (const [key, { input, feedback }] of Object.entries(fields)) {
      const missing = result.missing.includes(key);
      input.setAttribute('aria-invalid', String(missing));
      feedback.textContent = missing ? 'Please enter a verb form.' : '';
    }
    $('feedback').textContent = 'Fill in both verb forms. No points or lives lost.';
    fields[result.missing[0]].input.focus();
    return;
  }
  const announcements = [];
  for (const [key, { input, feedback, label }] of Object.entries(fields)) {
    const correct = result.correct[key];
    input.readOnly = true;
    input.setAttribute('aria-invalid', String(!correct));
    input.dataset.result = correct ? 'correct' : 'incorrect';
    // Reveal both accepted forms after a mistake, even if one field was right.
    feedback.textContent = `${correct ? '✓ Correct' : '✕ Incorrect'}${result.type === 'incorrect' ? ` · ${game.current[key].join(' / ')}` : ''}`;
    announcements.push(`${label}: ${correct ? 'correct' : 'incorrect'}.${result.type === 'incorrect' ? ` Accepted: ${game.current[key].join(' or ')}.` : ''}`);
  }
  updateStats();
  $('check-answer').hidden = true;
  $('feedback').className = `feedback ${result.type}`;
  const summary = result.type === 'correct' ? 'Both correct! +1 point.' : 'The dead stir… −1 point, −1 life.';
  $('feedback').textContent = `${summary} ${announcements.join(' ')} Score ${game.score} of 10. ${game.lives} ${game.lives === 1 ? 'life' : 'lives'} left.`;
  if (game.status === 'playing') {
    $('next-verb').hidden = false;
    $('next-verb').focus({ preventScroll: true });
  } else {
    const won = game.status === 'won';
    $('ending-heading').textContent = won ? 'You win!' : 'You died!';
    $('ending-message').textContent = won ? 'Ten points. A new dawn. You escaped the graveyard!' : 'Three mistakes woke the dead. Learn the forms below and try again.';
    $('ending').hidden = false;
    $('play-again').hidden = false;
    $('panel-note').hidden = true;
    $('prompt').textContent = 'Your final verb';
    for (const { input } of Object.values(fields)) input.disabled = true;
    $('feedback').textContent = `${$('ending-heading').textContent} ${$('feedback').textContent}`;
    $('play-again').focus({ preventScroll: true });
  }
});

$('next-verb').addEventListener('click', () => { if (game.next()) showQuestion(); });
$('play-again').addEventListener('click', () => { game.restart(); showQuestion(); });
showQuestion();
