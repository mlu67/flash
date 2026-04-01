import { test, expect } from '@playwright/test';
import { createGame, joinGame, waitForQuestion, answerQuestion, waitForQuestionResult, waitForNextQuestion, getQuestionIndex } from '../helpers.js';

test.describe('Reconnection', () => {
  test('player reconnects mid-game by refreshing', async ({ browser }) => {
    test.setTimeout(180_000);

    const hostContext = await browser.newContext();
    const playerContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const playerPage = await playerContext.newPage();

    try {
      const roomCode = await createGame(hostPage, { questionCount: 10 });
      await joinGame(playerPage, roomCode, 'Player2');

      await hostPage.getByRole('button', { name: 'Start Game' }).click();

      // Wait for a question to appear on both
      await waitForQuestion(hostPage);
      await waitForQuestion(playerPage);
      const qIdx1 = await getQuestionIndex(hostPage);

      // Both answer Q1
      await answerQuestion(hostPage, 'der');
      await answerQuestion(playerPage, 'die');
      await waitForQuestionResult(hostPage);
      await waitForQuestionResult(playerPage);

      // Player refreshes the page (sessionStorage persists across refresh)
      await playerPage.reload();

      // Player should auto-rejoin and see the game
      await waitForQuestion(playerPage);
      await waitForQuestion(hostPage);

      // Both can answer the next question
      await answerQuestion(hostPage, 'der');
      await answerQuestion(playerPage, 'die');
      await waitForQuestionResult(hostPage);
      await waitForQuestionResult(playerPage);
    } finally {
      await hostContext.close();
      await playerContext.close();
    }
  });

  test('host reconnects mid-game by refreshing', async ({ browser }) => {
    test.setTimeout(180_000);

    const hostContext = await browser.newContext();
    const playerContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const playerPage = await playerContext.newPage();

    try {
      const roomCode = await createGame(hostPage, { questionCount: 10 });
      await joinGame(playerPage, roomCode, 'Player2');

      await hostPage.getByRole('button', { name: 'Start Game' }).click();

      // Wait for question on both
      await waitForQuestion(hostPage);
      await waitForQuestion(playerPage);

      // Both answer Q1
      await answerQuestion(hostPage, 'der');
      await answerQuestion(playerPage, 'die');
      await waitForQuestionResult(hostPage);
      await waitForQuestionResult(playerPage);

      // Host refreshes the page
      await hostPage.reload();

      // Host should auto-rejoin and see the game
      await waitForQuestion(hostPage);
      await waitForQuestion(playerPage);

      // Both can continue playing
      await answerQuestion(hostPage, 'der');
      await answerQuestion(playerPage, 'die');
      await waitForQuestionResult(hostPage);
      await waitForQuestionResult(playerPage);
    } finally {
      await hostContext.close();
      await playerContext.close();
    }
  });

  test('all disconnect = room cleanup', async ({ browser }) => {
    test.setTimeout(60_000);

    const hostContext = await browser.newContext();
    const playerContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const playerPage = await playerContext.newPage();

    const roomCode = await createGame(hostPage, { questionCount: 10 });
    await joinGame(playerPage, roomCode, 'Player2');

    // Both disconnect
    await hostPage.close();
    await playerPage.close();

    // Wait for server to clean up (5s grace period + buffer)
    await new Promise(resolve => setTimeout(resolve, 7000));

    // Try joining same room code from new context
    const newContext = await browser.newContext();
    const newPage = await newContext.newPage();

    try {
      // Set up dialog handler for the alert
      const dialogPromise = new Promise(resolve => {
        newPage.on('dialog', async (dialog) => {
          resolve(dialog.message());
          await dialog.accept();
        });
      });

      await newPage.goto('http://localhost:5173');
      await newPage.getByRole('button', { name: 'Join Game' }).click();
      await newPage.getByPlaceholder('Enter your name').fill('NewPlayer');
      await newPage.getByPlaceholder('e.g. A3F7K2').fill(roomCode);
      await newPage.getByRole('button', { name: 'Join' }).click();

      const message = await dialogPromise;
      expect(message).toContain('Room not found');
    } finally {
      await newContext.close();
      await hostContext.close();
      await playerContext.close();
    }
  });
});
