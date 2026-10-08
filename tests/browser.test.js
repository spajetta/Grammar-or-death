import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { startServer } from '../scripts/serve.js';
import { verbs } from '../src/verbs.js';

test('real browser: scoring, validation, endings, keyboard, artwork, responsive layouts', async (t) => {
  const server = await startServer('dist', 0);
  const url = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    await mkdir('test-results', { recursive: true });
    async function openGame(options = {}, forcedBase) {
      const context = await browser.newContext(options);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
      if (forcedBase) {
        await page.route('**/src/verbs.js', (route) => route.fulfill({
          contentType: 'text/javascript',
          body: `export const verbs = ${JSON.stringify(verbs.filter((v) => v.base === forcedBase))};`,
        }));
      }
      await page.goto(url);
      await page.waitForFunction(() => document.querySelector('#verb').textContent !== '…');
      await page.waitForFunction(() => [...document.images].every((img) => img.complete && img.naturalWidth > 0));
      return { page, context, errors };
    }
    async function answer(page, correct = true, enter = false) {
      const base = (await page.locator('#verb').textContent()).toLowerCase();
      const hint = await page.locator('#verb-hint').textContent();
      const verb = verbs.find((v) => v.base === base && (v.hint || '') === hint);
      assert.ok(verb, `Known verb: ${base}`);
      await page.locator('#past-simple').fill(correct ? verb.pastSimple[0] : 'incorrect');
      await page.locator('#past-participle').fill(correct ? verb.pastParticiple[0] : 'incorrect');
      if (enter) await page.locator('#past-participle').press('Enter');
      else await page.getByRole('button', { name: 'Check answer' }).click();
    }
    async function assertStats(page, score, lives, stage) {
      assert.equal(await page.locator('#score').textContent(), String(score).replace('-', '−'));
      assert.equal(await page.locator('#lives').textContent(), String(lives));
      await page.waitForFunction((expected) => document.querySelector('#art-frame').dataset.stage === expected, stage);
      assert.ok((await page.locator('#scene-image').getAttribute('src')).endsWith(`${stage}.webp`));
      assert.ok(await page.locator('#scene-image').evaluate((image) => image.complete && image.naturalWidth === 1536));
    }
    async function restart(page) {
      await page.getByRole('button', { name: 'Play again' }).click();
      await assertStats(page, 0, 3, 'start');
      for (const id of ['past-simple', 'past-participle']) {
        assert.equal(await page.locator(`#${id}`).inputValue(), '');
        assert.equal(await page.locator(`#${id}`).getAttribute('readonly'), null);
        assert.equal(await page.locator(`#${id}`).getAttribute('aria-invalid'), null);
        assert.ok(await page.locator(`#${id}`).isEnabled());
      }
      assert.equal(await page.locator('#feedback').textContent(), '');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'past-simple');
      assert.ok(await page.locator('#check-answer').isVisible());
      assert.ok(await page.locator('#next-verb').isHidden());
      assert.ok(await page.locator('#ending').isHidden());
      assert.ok(await page.locator('#play-again').isHidden());
    }

    await t.test('desktop: validation, normalization, feedback, locking and cumulative mistake artwork', async () => {
      const { page, context, errors } = await openGame({ viewport: { width: 1440, height: 1000 } }, 'wake');
      await assertStats(page, 0, 3, 'start');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'past-simple');
      await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });
      await page.getByRole('button', { name: 'Check answer' }).click();
      await assertStats(page, 0, 3, 'start');
      assert.equal(await page.locator('#past-simple').getAttribute('aria-invalid'), 'true');
      await page.locator('#past-simple').fill('woke');
      await page.locator('#past-participle').fill('   ');
      await page.locator('#past-participle').press('Enter');
      await assertStats(page, 0, 3, 'start');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'past-participle');
      await page.locator('#past-simple').fill('  WoKe  ');
      await page.locator('#past-participle').fill(' WOKEN ');
      await page.locator('#past-participle').press('Enter');
      await assertStats(page, 1, 3, 'start');
      assert.match(await page.locator('#past-simple-feedback').textContent(), /Correct/);
      assert.match(await page.locator('#past-participle-feedback').textContent(), /Correct/);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'next-verb');
      // Repeated DOM submit events exercise the handler even when its button is hidden.
      await page.locator('#answer-form').evaluate((form) => {
        for (let i = 0; i < 5; i++) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });
      await assertStats(page, 1, 3, 'start');
      await page.locator('#past-simple').press('Enter');
      await assertStats(page, 1, 3, 'start');
      assert.ok(await page.locator('#past-simple').evaluate((input) => input.readOnly));
      await page.getByRole('button', { name: 'Next verb' }).click();
      assert.equal(await page.evaluate(() => document.activeElement.id), 'past-simple');
      await page.locator('#past-simple').press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'past-participle');
      await page.locator('#past-participle').press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'check-answer');
      await page.locator('#past-simple').fill('wrong');
      await page.locator('#past-participle').fill('woken');
      await page.getByRole('button', { name: 'Check answer' }).click();
      await assertStats(page, 0, 2, 'first_error');
      assert.match(await page.locator('#past-simple-feedback').textContent(), /Incorrect.*woke/);
      assert.match(await page.locator('#past-participle-feedback').textContent(), /Correct.*woken/);
      const feedback = await page.locator('#feedback').textContent();
      await page.locator('#answer-form').evaluate((form) => form.dispatchEvent(new Event('submit', { cancelable: true })));
      assert.equal(await page.locator('#feedback').textContent(), feedback);
      await assertStats(page, 0, 2, 'first_error');
      await page.getByRole('button', { name: 'Next verb' }).click();
      await answer(page);
      await assertStats(page, 1, 2, 'first_error');
      await page.getByRole('button', { name: 'Next verb' }).click();
      await answer(page, false);
      await assertStats(page, 0, 1, 'second_error');
      await page.getByRole('button', { name: 'Next verb' }).click();
      await answer(page, false);
      await assertStats(page, -1, 0, 'game_lost');
      assert.equal(await page.locator('#ending-heading').textContent(), 'You died!');
      assert.ok(await page.locator('#next-verb').isHidden());
      assert.ok(await page.locator('#past-simple').isDisabled());
      await page.screenshot({ path: 'test-results/defeat.png', fullPage: true });
      await page.locator('#answer-form').evaluate((form) => form.dispatchEvent(new Event('submit', { cancelable: true })));
      await assertStats(page, -1, 0, 'game_lost');
      await restart(page);
      await answer(page);
      await assertStats(page, 1, 3, 'start');
      assert.deepEqual(errors, []);
      await context.close();
    });

    await t.test('real shuffled bank reaches victory at exactly ten, then fully restarts', async () => {
      const { page, context, errors } = await openGame({ viewport: { width: 1440, height: 1000 } });
      const seen = new Set();
      for (let i = 1; i <= 10; i++) {
        const key = `${await page.locator('#verb').textContent()}|${await page.locator('#verb-hint').textContent()}`;
        assert.ok(!seen.has(key)); seen.add(key);
        await answer(page, true, true);
        await assertStats(page, i, 3, i === 10 ? 'game_won' : 'start');
        if (i < 10) {
          assert.ok(await page.locator('#ending').isHidden());
          await page.getByRole('button', { name: 'Next verb' }).press('Enter');
        }
      }
      assert.equal(await page.locator('#ending-heading').textContent(), 'You win!');
      assert.ok(await page.locator('#check-answer').isHidden());
      assert.ok(await page.locator('#next-verb').isHidden());
      await page.screenshot({ path: 'test-results/victory.png', fullPage: true });
      await page.locator('#answer-form').evaluate((form) => form.dispatchEvent(new Event('submit', { cancelable: true })));
      await assertStats(page, 10, 3, 'game_won');
      await restart(page);
      await answer(page, false);
      await assertStats(page, -1, 2, 'first_error');
      assert.deepEqual(errors, []);
      await context.close();
    });

    await t.test('accepts learned / learnt in the actual form', async () => {
      const { page, context } = await openGame({}, 'learn');
      await page.locator('#past-simple').fill('LEARNED');
      await page.locator('#past-participle').fill(' learnt ');
      await page.getByRole('button', { name: 'Check answer' }).click();
      await assertStats(page, 1, 3, 'start');
      await context.close();
    });

    await t.test('desktop and phone layouts preserve full artwork, usable controls and reduced motion', async () => {
      for (const width of [1440, 1024, 768, 390, 320]) {
        const { page, context, errors } = await openGame({
          viewport: { width, height: 844 }, reducedMotion: 'reduce',
        });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `No overflow at ${width}px`);
        const artwork = await page.locator('#scene-image').boundingBox();
        const panel = await page.locator('.play-panel').boundingBox();
        assert.ok(Math.abs(artwork.width / artwork.height - 1.5) < .01, 'Full 3:2 artwork');
        assert.ok(panel.x >= artwork.x + artwork.width || panel.y >= artwork.y + artwork.height, 'Controls do not obscure artwork');
        assert.equal(await page.locator('#scene-image').evaluate((image) => getComputedStyle(image).objectFit), 'contain');
        for (const id of ['past-simple', 'past-participle', 'check-answer']) {
          const bounds = await page.locator(`#${id}`).boundingBox();
          assert.ok(bounds.width >= 44 && bounds.height >= 44, `Usable ${id} at ${width}px`);
        }
        await page.locator('#past-simple').focus();
        assert.notEqual(await page.locator('#past-simple').evaluate((input) => getComputedStyle(input).outlineStyle), 'none');
        assert.equal(await page.locator('#feedback').getAttribute('aria-live'), 'polite');
        assert.equal(await page.locator('link[rel="preload"][as="image"]').count(), 5);
        if (width === 390) await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
        await answer(page, true, true);
        await assertStats(page, 1, 3, 'start');
        assert.deepEqual(errors, []);
        await context.close();
      }
    });

    await t.test('works under a GitHub Pages repository subpath', async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.route('**/Grammar-or-death/**', async (route) => {
        const original = new URL(route.request().url());
        original.pathname = original.pathname.replace('/Grammar-or-death', '');
        const response = await route.fetch({ url: original.href });
        await route.fulfill({ response });
      });
      await page.goto(`${url}/Grammar-or-death/`);
      await page.waitForFunction(() => document.querySelector('#verb').textContent !== '…');
      await answer(page);
      await assertStats(page, 1, 3, 'start');
      await context.close();
    });
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
