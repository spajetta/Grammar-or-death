export const TARGET = 10;
export const MAX_LIVES = 3;
export const normalize = (value) => String(value).trim().toLowerCase();

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// The game model has no DOM dependencies, so its rules can be tested directly.
export class Game {
  constructor(bank, random = Math.random) {
    this.bank = bank.filter((verb) => verb.playable !== false);
    if (!this.bank.length) throw new Error('The verb bank needs at least one playable verb.');
    this.random = random;
    this.restart();
  }

  restart() {
    this.score = 0;
    this.mistakes = 0;
    this.status = 'playing';
    this.deck = shuffle(this.bank, this.random);
    this.index = 0;
    this.current = this.deck[0];
    this.locked = false;
    this.result = null;
  }

  get lives() { return MAX_LIVES - this.mistakes; }
  get stage() {
    if (this.status === 'won') return 'game_won';
    return ['start', 'first_error', 'second_error', 'game_lost'][this.mistakes];
  }

  submit(pastSimple, pastParticiple) {
    if (this.locked || this.status !== 'playing') return null;
    const answers = { pastSimple: normalize(pastSimple), pastParticiple: normalize(pastParticiple) };
    const missing = Object.keys(answers).filter((key) => !answers[key]);
    if (missing.length) return { type: 'validation', missing };
    const correct = Object.fromEntries(Object.entries(answers).map(([key, answer]) => [
      key, this.current[key].some((accepted) => normalize(accepted) === answer),
    ]));
    const success = correct.pastSimple && correct.pastParticiple;
    this.score += success ? 1 : -1;
    if (!success) this.mistakes++;
    this.locked = true;
    if (this.lives === 0) this.status = 'lost';
    else if (this.score >= TARGET) this.status = 'won';
    this.result = { type: success ? 'correct' : 'incorrect', correct };
    return this.result;
  }

  next() {
    if (!this.locked || this.status !== 'playing') return false;
    this.index++;
    if (this.index >= this.deck.length) {
      const previous = this.current;
      this.deck = shuffle(this.bank, this.random);
      // Avoid even a boundary repeat when more than one verb is available.
      if (this.deck.length > 1 && this.deck[0] === previous) {
        [this.deck[0], this.deck[1]] = [this.deck[1], this.deck[0]];
      }
      this.index = 0;
    }
    this.current = this.deck[this.index];
    this.locked = false;
    this.result = null;
    return true;
  }
}
