import { test, expect } from '@playwright/test';
import { createGame, joinGame, waitForQuestion, answerQuestion, waitForQuestionResult, waitForNextQuestion, getQuestionIndex } from '../helpers.js';

test.describe('Timeout', () => {
  test('single player timeout', async ({ page }) => {
    test.setTimeout(120_000);

    await createGame(page, { questionCount: 10 });
    await page.getByRole('button', { name: 'Start Game' }).click();

    // Wait for a question to appear (might be Q1 or Q2 due to race)
    await waitForQuestion(page);

    // Don't answer - wait for timeout (10s) + result animation
    await waitForQuestionResult(page);

    // Verify timeout animation appears - the non-correct buttons get anim-timeout class
    const timeoutBtn = page.locator('.anim-timeout');
    await expect(timeoutBtn.first()).toBeVisible();

    // Wait for next question to appear (3s pause then new question)
    const qIdx = await getQuestionIndex(page);
    await waitForNextQuestion(page, qIdx);

    // Answer next question normally to verify game continues
    await answerQuestion(page, 'der');
    await waitForQuestionResult(page);
  });

  test('multiplayer timeout - one player', async ({ browser }) => {
    test.setTimeout(120_000);

    const hostContext = await browser.newContext();
    const playerContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const playerPage = await playerContext.newPage();

    try {
      await createGame(hostPage, { questionCount: 10 });
      await joinGame(playerPage, await hostPage.locator('[title="Click to copy"]').textContent().then(t => t.trim()), 'Player2');

      await hostPage.getByRole('button', { name: 'Start Game' }).click();

      // Wait for question on both
      await waitForQuestion(hostPage);
      await waitForQuestion(playerPage);
      const qIdx = await getQuestionIndex(hostPage);

      // Host answers, player does NOT
      await answerQuestion(hostPage, 'der');

      // Wait for server timeout (10s) + result
      await waitForQuestionResult(hostPage);
      await waitForQuestionResult(playerPage);

      // Player should see timeout animation
      const timeoutBtn = playerPage.locator('.anim-timeout');
      await expect(timeoutBtn.first()).toBeVisible();

      // Wait for next question
      await waitForNextQuestion(hostPage, qIdx);
      await waitForNextQuestion(playerPage, qIdx);

      // Both answer next question normally
      await answerQuestion(hostPage, 'der');
      await answerQuestion(playerPage, 'die');

      await waitForQuestionResult(hostPage);
      await waitForQuestionResult(playerPage);
    } finally {
      await hostContext.close();
      await playerContext.close();
    }
  });
});
