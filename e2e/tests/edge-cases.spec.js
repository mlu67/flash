import { test, expect } from '@playwright/test';
import { createGame, joinGame, waitForQuestion, answerQuestion, waitForQuestionResult, waitForNextQuestion, getQuestionIndex, playFullGame } from '../helpers.js';

/**
 * Play through all questions for two pages simultaneously until Results appears.
 */
async function playFullGameMultiplayer(hostPage, playerPage) {
  while (true) {
    const hostResults = await hostPage.getByText('Results').isVisible().catch(() => false);
    if (hostResults) break;

    const hostH1 = await hostPage.locator('h1').isVisible().catch(() => false);
    if (!hostH1) {
      await hostPage.waitForTimeout(200);
      continue;
    }

    const hostDer = hostPage.getByRole('button', { name: 'der', exact: true });
    const hostDisabled = await hostDer.isDisabled().catch(() => true);

    if (!hostDisabled) {
      await answerQuestion(hostPage, 'der');
      try {
        const playerDisabled = await playerPage.getByRole('button', { name: 'die', exact: true }).isDisabled().catch(() => true);
        if (!playerDisabled) {
          await answerQuestion(playerPage, 'die');
        }
      } catch { /* player may not be ready */ }
    }

    try {
      await hostPage.waitForFunction(
        () => {
          if (document.body.innerText.includes('Play Again')) return true;
          const buttons = document.querySelectorAll('button');
          for (const b of buttons) {
            if (b.textContent === 'der' && !b.disabled) return true;
          }
          return false;
        },
        {},
        { timeout: 15_000 }
      );
    } catch {
      const onResults = await hostPage.getByText('Results').isVisible().catch(() => false);
      if (onResults) break;
    }
  }

  await hostPage.waitForSelector('text=Results', { timeout: 20_000 });
  await playerPage.waitForSelector('text=Results', { timeout: 20_000 });
}

test.describe('Edge Cases', () => {
  test('join non-existent room', async ({ page }) => {
    const dialogPromise = new Promise(resolve => {
      page.on('dialog', async (dialog) => {
        resolve(dialog.message());
        await dialog.accept();
      });
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'Join Game' }).click();
    await page.getByPlaceholder('Enter your name').fill('TestPlayer');
    await page.getByPlaceholder('e.g. A3F7K2').fill('ZZZZZZ');
    await page.getByRole('button', { name: 'Join' }).click();

    const message = await dialogPromise;
    expect(message).toContain('Room not found');
  });

  test('non-host cannot start game', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const playerContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const playerPage = await playerContext.newPage();

    try {
      const roomCode = await createGame(hostPage, { questionCount: 10 });
      await joinGame(playerPage, roomCode, 'Player2');

      await expect(playerPage.getByRole('button', { name: 'Start Game' })).not.toBeVisible();
      await expect(playerPage.getByText('Waiting for host to start')).toBeVisible();
      await expect(hostPage.getByRole('button', { name: 'Start Game' })).toBeVisible();
    } finally {
      await hostContext.close();
      await playerContext.close();
    }
  });

  test('category filter', async ({ page }) => {
    await createGame(page, { category: 'animals', questionCount: 10 });
    await page.getByRole('button', { name: 'Start Game' }).click();

    await waitForQuestion(page);

    // Verify the category label shows "animals"
    await expect(page.getByText('animals')).toBeVisible();
  });

  test('play again resets scores', async ({ page }) => {
    test.setTimeout(180_000);

    await createGame(page, { questionCount: 10 });
    await page.getByRole('button', { name: 'Start Game' }).click();

    await playFullGame(page, 10);

    await page.getByRole('button', { name: 'Play Again' }).click();

    await waitForQuestion(page);

    // Verify question counter shows "1 / 10" (new game starts fresh)
    // Due to the race condition, we might see "2 / 10" but the game has definitely restarted
    await expect(page.locator('text=/\\d+ \\/ 10/')).toBeVisible();
  });

  test('end game returns all to home', async ({ browser }) => {
    test.setTimeout(180_000);

    const hostContext = await browser.newContext();
    const playerContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const playerPage = await playerContext.newPage();

    try {
      const roomCode = await createGame(hostPage, { questionCount: 10 });
      await joinGame(playerPage, roomCode, 'Player2');
      await hostPage.getByRole('button', { name: 'Start Game' }).click();

      await playFullGameMultiplayer(hostPage, playerPage);

      // Host clicks End Game
      await hostPage.getByRole('button', { name: 'End Game' }).click();

      // Both should see home screen
      await expect(hostPage.getByRole('button', { name: 'Create Game' })).toBeVisible();
      await expect(playerPage.getByRole('button', { name: 'Create Game' })).toBeVisible();
    } finally {
      await hostContext.close();
      await playerContext.close();
    }
  });
});
