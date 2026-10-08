import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, shuffle } from '../src/game.js';
import { verbs } from '../src/verbs.js';

const wake = verbs.find((verb) => verb.base === 'wake');
const makeGame = () => new Game([wake]);

test('starts with zero points, three lives, and the graveyard', () => {
  const game = makeGame();
  assert.equal(game.score, 0);
  assert.equal(game.lives, 3);
  assert.equal(game.stage, 'start');
  assert.equal(game.status, 'playing');
});
test('both forms correct earn exactly one point', () => {
  const game = makeGame();
  assert.equal(game.submit('woke', 'woken').type, 'correct');
  assert.equal(game.score, 1);
  assert.equal(game.lives, 3);
});
test('one or both forms wrong apply only one penalty; negative scores allowed', () => {
  for (const answers of [['wrong', 'woken'], ['woke', 'wrong'], ['wrong', 'wrong']]) {
    const game = makeGame();
    assert.equal(game.submit(...answers).type, 'incorrect');
    assert.equal(game.score, -1);
    assert.equal(game.lives, 2);
    assert.equal(game.stage, 'first_error');
  }
});
test('empty or whitespace-only fields validate without consuming a question', () => {
  for (const answers of [['', ''], ['  ', 'woken'], ['woke', ' ']]) {
    const game = makeGame();
    assert.equal(game.submit(...answers).type, 'validation');
    assert.equal(game.score, 0);
    assert.equal(game.lives, 3);
    assert.equal(game.locked, false);
    assert.equal(game.submit('woke', 'woken').type, 'correct');
  }
});
test('normalizes case and surrounding whitespace', () => {
  assert.equal(makeGame().submit('  WoKe \t', '\nWOKEN ').type, 'correct');
});
test('British and American alternatives can be freely combined', () => {
  for (const base of ['learn', 'burn', 'dream', 'lean', 'spell', 'spill', 'get', 'kneel', 'smell']) {
    const verb = verbs.find((v) => v.base === base);
    for (const past of verb.pastSimple) for (const part of verb.pastParticiple) {
      assert.equal(new Game([verb]).submit(past, part).type, 'correct');
    }
  }
});
test('artwork follows cumulative mistakes, even after correct answers', () => {
  const game = makeGame();
  game.submit('wrong', 'wrong');
  game.next();
  game.submit('woke', 'woken');
  assert.equal(game.lives, 2);
  assert.equal(game.stage, 'first_error');
  game.next();
  game.submit('wrong', 'wrong');
  assert.equal(game.stage, 'second_error');
  game.next();
  game.submit('woke', 'woken');
  assert.equal(game.stage, 'second_error');
  assert.equal(game.lives, 1);
});
test('third mistake immediately ends the game and blocks all further answers', () => {
  const game = makeGame();
  for (let i = 0; i < 3; i++) { game.submit('wrong', 'wrong'); game.next(); }
  assert.equal(game.status, 'lost');
  assert.equal(game.lives, 0);
  assert.equal(game.score, -3);
  assert.equal(game.stage, 'game_lost');
  assert.equal(game.next(), false);
  assert.equal(game.submit('woke', 'woken'), null);
  assert.equal(game.score, -3);
});
test('ten points immediately wins; an earlier error requires eleven correct answers', () => {
  const game = makeGame();
  game.submit('wrong', 'wrong'); game.next();
  for (let i = 0; i < 10; i++) { game.submit('woke', 'woken'); game.next(); }
  assert.equal(game.status, 'playing');
  assert.equal(game.score, 9);
  game.submit('woke', 'woken');
  assert.equal(game.status, 'won');
  assert.equal(game.stage, 'game_won');
  assert.equal(game.lives, 2);
  assert.equal(game.next(), false);
  assert.equal(game.submit('wrong', 'wrong'), null);
  assert.equal(game.score, 10);
});
test('repeated submissions cannot score or penalize again', () => {
  for (const answers of [['woke', 'woken'], ['wrong', 'wrong']]) {
    const game = makeGame(); game.submit(...answers);
    const before = [game.score, game.lives, game.result];
    for (let i = 0; i < 10; i++) assert.equal(game.submit(...answers), null);
    assert.deepEqual([game.score, game.lives, game.result], before);
  }
});
test('restart resets the whole model from either ending', () => {
  for (const success of [true, false]) {
    const game = makeGame();
    for (let i = 0; i < (success ? 10 : 3); i++) {
      game.submit(...(success ? ['woke', 'woken'] : ['wrong', 'wrong'])); game.next();
    }
    game.restart();
    assert.deepEqual([game.score, game.lives, game.stage, game.status, game.locked, game.result, game.index], [0, 3, 'start', 'playing', false, null, 0]);
    assert.equal(game.submit('woke', 'woken').type, 'correct');
  }
});
test('shuffles without changing the bank, avoids repeats until exhaustion', () => {
  const bank = verbs.filter((v) => v.playable !== false);
  const original = [...bank];
  let seed = 42;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  assert.notDeepEqual(shuffle(bank, random), bank);
  assert.deepEqual(bank, original);
  // Alternate correct and wrong answers so the model can run through a short bank.
  const game = new Game(bank.slice(0, 4), random);
  const seen = new Set();
  for (let i = 0; i < 4; i++) {
    assert.ok(!seen.has(game.current)); seen.add(game.current);
    game.submit(...(i % 2 ? ['wrong', 'wrong'] : [game.current.pastSimple[0], game.current.pastParticiple[0]]));
    game.next();
  }
  assert.equal(seen.size, 4);
  assert.notEqual(game.current, game.deck[3]);
  const firstDeck = [...game.deck];
  game.restart();
  assert.notDeepEqual(game.deck, firstDeck);
});
test('bank includes every source entry, disambiguates lie, and skips impossible modal questions', () => {
  assert.equal(verbs.length, 140);
  assert.equal(verbs.filter((v) => v.playable !== false).length, 135);
  for (const verb of verbs) {
    assert.ok(verb.base && verb.pastSimple.length);
    if (verb.playable !== false) assert.ok(verb.pastParticiple.length);
    for (const answer of [...verb.pastSimple, ...verb.pastParticiple]) assert.equal(answer, answer.trim().toLowerCase());
  }
  assert.equal(verbs.filter((v) => v.base === 'lie').length, 2);
  assert.deepEqual(verbs.filter((v) => v.playable === false).map((v) => v.base), ['can', 'may', 'must', 'shall', 'will']);
  const game = new Game(verbs);
  assert.ok(game.deck.every((v) => v.playable !== false));
});
