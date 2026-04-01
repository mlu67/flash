import { test, expect } from '@playwright/test';
import { createGame, joinGame, waitForQuestion, answerQuestion, waitForQuestionResult, waitForNextQuestion, getQuestionIndex, playFullGame } from '../helpers.js';

/**
 * Play through all questions for two pages simultaneously until Results appears.
 */
async function playFullGameMultiplayer(hostPage, playerPage) {
  while (true) {
    // Check if either is already on results
    const hostResults = await hostPage.getByText('Results').isVisible().catch(() => false);
    if (hostResults) break;

    // Wait for question to be visible on host
    const hostH1 = await hostPage.locator('h1').isVisible().catch(() => false);
    if (!hostH1) {
      await hostPage.waitForTimeout(200);
      continue;
    }

    // Check if host buttons are clickable
    const hostDer = hostPage.getByRole('button', { name: 'der', exact: true });
    const hostDisabled = await hostDer.isDisabled().catch(() => true);

    if (!hostDisabled) {
      const hostNoun = await hostPage.locator('h1').textContent();
      const playerNoun = await playerPage.locator('h1').textContent().catch(() => '');

      // Verify both see the same noun (when player is also showing the question)
      if (playerNoun && playerNoun === hostNoun) {
        // Both answer
        await answerQuestion(hostPage, 'der');
        await answerQuestion(playerPage, 'die');
      } else {
        // Just host answers
        await answerQuestion(hostPage, 'der');
        // Try player too
        try {
          const playerDisabled = await playerPage.getByRole('button', { name: 'die', exact: true }).isDisabled().catch(() => true);
          if (!playerDisabled) {
            await answerQuestion(playerPage, 'die');
          }
        } catch { /* player may not be ready */ }
      }
    }

    // Wait for next state change
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

test.describe('Main Flow', () => {
  test('first question is not missed on game start', async ({ page }) => {
    test.setTimeout(60_000);

    await createGame(page, { questionCount: 10 });
    await page.getByRole('button', { name: 'Start Game' }).click();

    // The first question should appear immediately — not "Waiting for first question..."
    await waitForQuestion(page);

    // Verify question counter shows "1 / 10" — meaning Q1 was received
    await expect(page.getByText('1 / 10')).toBeVisible({ timeout: 5_000 });

    // Verify the article buttons are enabled (not timed out)
    const derButton = page.getByRole('button', { name: 'der', exact: true });
    await expect(derButton).toBeEnabled();

    // Answer it to prove it's interactive
    await answerQuestion(page, 'der');
    await waitForQuestionResult(page);
  });

  test('single player happy path', async ({ page }) => {
    test.setTimeout(180_000);

    const roomCode = await createGame(page, { questionCount: 10 });
    expect(roomCode).toHaveLength(6);

    // Start the game (single player, host starts)
    await page.getByRole('button', { name: 'Start Game' }).click();

    // Play all 10 questions
    await playFullGame(page, 10);

    // Verify results screen
    await expect(page.getByRole('button', { name: 'Play Again' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'End Game' })).toBeVisible();

    // End game returns to home
    await page.getByRole('button', { name: 'End Game' }).click();
    await expect(page.getByRole('button', { name: 'Create Game' })).toBeVisible();
  });

  test('multiplayer happy path', async ({ browser }) => {
    test.setTimeout(180_000);

    const hostContext = await browser.newContext();
    const playerContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const playerPage = await playerContext.newPage();

    try {
      // Host creates game
      const roomCode = await createGame(hostPage, { questionCount: 10 });

      // Player joins
      await joinGame(playerPage, roomCode, 'Player2');

      // Both see 2 players in lobby
      await expect(hostPage.getByText('Players (2)')).toBeVisible();
      await expect(playerPage.getByText('Players (2)')).toBeVisible();

      // Player does NOT see Start Game button
      await expect(playerPage.getByRole('button', { name: 'Start Game' })).not.toBeVisible();
      await expect(playerPage.getByText('Waiting for host to start')).toBeVisible();

      // Host starts game
      await hostPage.getByRole('button', { name: 'Start Game' }).click();

      // Both play all questions
      await playFullGameMultiplayer(hostPage, playerPage);

      // Both players listed on results
      await expect(hostPage.getByText('Host')).toBeVisible();
      await expect(hostPage.getByText('Player2')).toBeVisible();

      // Player sees "Waiting for host..."
      await expect(playerPage.getByText('Waiting for host...')).toBeVisible();

      // Host clicks Play Again
      await hostPage.getByRole('button', { name: 'Play Again' }).click();

      // Both see a new game (new question)
      await waitForQuestion(hostPage);
      await waitForQuestion(playerPage);
    } finally {
      await hostContext.close();
      await playerContext.close();
    }
  });

  test('three players complete a game together', async ({ browser }) => {
    test.setTimeout(180_000);

    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const ctx3 = await browser.newContext();
    const hostPage = await ctx1.newPage();
    const player2Page = await ctx2.newPage();
    const player3Page = await ctx3.newPage();

    try {
      // Host creates game
      const roomCode = await createGame(hostPage, { playerName: 'Alice', questionCount: 10 });

      // Two players join
      await joinGame(player2Page, roomCode, 'Bob');
      await joinGame(player3Page, roomCode, 'Charlie');

      // All three see 3 players in lobby
      await expect(hostPage.getByText('Players (3)')).toBeVisible();
      await expect(player2Page.getByText('Players (3)')).toBeVisible();
      await expect(player3Page.getByText('Players (3)')).toBeVisible();

      // Only host sees Start Game button
      await expect(hostPage.getByRole('button', { name: 'Start Game' })).toBeVisible();
      await expect(player2Page.getByRole('button', { name: 'Start Game' })).not.toBeVisible();
      await expect(player3Page.getByRole('button', { name: 'Start Game' })).not.toBeVisible();

      // Host starts game
      await hostPage.getByRole('button', { name: 'Start Game' }).click();

      // Play all questions — all three answer each round
      while (true) {
        const onResults = await hostPage.getByText('Results').isVisible().catch(() => false);
        if (onResults) break;

        const h1Visible = await hostPage.locator('h1').isVisible().catch(() => false);
        if (!h1Visible) {
          await hostPage.waitForTimeout(200);
          continue;
        }

        const hostDer = hostPage.getByRole('button', { name: 'der', exact: true });
        const hostDisabled = await hostDer.isDisabled().catch(() => true);

        if (!hostDisabled) {
          // All three answer
          await answerQuestion(hostPage, 'der');
          try {
            const p2Disabled = await player2Page.getByRole('button', { name: 'die', exact: true }).isDisabled().catch(() => true);
            if (!p2Disabled) await answerQuestion(player2Page, 'die');
          } catch { /* not ready */ }
          try {
            const p3Disabled = await player3Page.getByRole('button', { name: 'das', exact: true }).isDisabled().catch(() => true);
            if (!p3Disabled) await answerQuestion(player3Page, 'das');
          } catch { /* not ready */ }
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
          const done = await hostPage.getByText('Results').isVisible().catch(() => false);
          if (done) break;
        }
      }

      // All three land on results
      await hostPage.waitForSelector('text=Results', { timeout: 20_000 });
      await player2Page.waitForSelector('text=Results', { timeout: 20_000 });
      await player3Page.waitForSelector('text=Results', { timeout: 20_000 });

      // All three names appear on the leaderboard
      await expect(hostPage.getByText('Alice')).toBeVisible();
      await expect(hostPage.getByText('Bob')).toBeVisible();
      await expect(hostPage.getByText('Charlie')).toBeVisible();

      // Non-hosts see "Waiting for host..."
      await expect(player2Page.getByText('Waiting for host...')).toBeVisible();
      await expect(player3Page.getByText('Waiting for host...')).toBeVisible();

      // Host ends game — all return to home
      await hostPage.getByRole('button', { name: 'End Game' }).click();
      await expect(hostPage.getByRole('button', { name: 'Create Game' })).toBeVisible();
      await expect(player2Page.getByRole('button', { name: 'Create Game' })).toBeVisible();
      await expect(player3Page.getByRole('button', { name: 'Create Game' })).toBeVisible();
    } finally {
      await ctx1.close();
      await ctx2.close();
      await ctx3.close();
    }
  });
});
