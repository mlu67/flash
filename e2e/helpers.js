export async function createGame(page, { playerName = 'Host', category = 'all', questionCount = 10 } = {}) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create Game' }).click();
  await page.getByPlaceholder('Enter your name').fill(playerName);

  if (category !== 'all') {
    await page.getByRole('combobox').selectOption(category);
  }

  // Click the question count button
  const countButtons = page.locator('button').filter({ hasText: String(questionCount) });
  await countButtons.click();

  await page.getByRole('button', { name: 'Create Room' }).click();

  await page.waitForSelector('text=Game Lobby');
  const codeEl = page.locator('[title="Click to copy"]');
  const roomCode = await codeEl.textContent();
  return roomCode.trim();
}

export async function joinGame(page, roomCode, playerName = 'Player2') {
  await page.goto('/');
  await page.getByRole('button', { name: 'Join Game' }).click();
  await page.getByPlaceholder('Enter your name').fill(playerName);
  await page.getByPlaceholder('e.g. A3F7K2').fill(roomCode);
  await page.getByRole('button', { name: 'Join' }).click();
  await page.waitForSelector('text=Game Lobby');
}

export async function answerQuestion(page, article) {
  await page.getByRole('button', { name: article, exact: true }).click();
}

export async function waitForQuestion(page) {
  await page.locator('h1').waitFor({ state: 'visible', timeout: 15_000 });
  const noun = await page.locator('h1').textContent();
  return noun;
}

export async function getQuestionIndex(page) {
  // The question counter is like "3 / 10" — extract the current number
  const text = await page.locator('text=/\\d+ \\/ \\d+/').first().textContent();
  const match = text.match(/(\d+)\s*\/\s*(\d+)/);
  return match ? parseInt(match[1]) : null;
}

export async function waitForQuestionResult(page) {
  // Wait for the result animation or correct-highlight outline to appear
  await page.locator('.anim-correct, .anim-wrong, .anim-timeout, [style*="outline"]').first().waitFor({ timeout: 15_000 });
}

export async function waitForNextQuestion(page, previousIndex) {
  // Wait until the question index changes from the previous one
  await page.waitForFunction(
    (prevIdx) => {
      const el = document.body.innerText;
      const match = el.match(/(\d+)\s*\/\s*\d+/);
      if (!match) return false;
      return parseInt(match[1]) !== prevIdx;
    },
    previousIndex,
    { timeout: 20_000 }
  );
  return await page.locator('h1').textContent();
}

/**
 * Play through the game until Results screen appears.
 * This handles the race condition where Q1 may be missed due to
 * the socket event arriving before the React component mounts its listener.
 * We just keep answering questions until the game ends.
 */
export async function playFullGame(page, questionCount = 10) {
  // Keep answering until we see the Results screen
  while (true) {
    // Check if we're already on results
    const resultsVisible = await page.getByText('Results').isVisible().catch(() => false);
    if (resultsVisible) break;

    // Check if a question is visible (h1 with a noun)
    const h1Visible = await page.locator('h1').isVisible().catch(() => false);
    if (!h1Visible) {
      await page.waitForTimeout(200);
      continue;
    }

    // Check if buttons are clickable (not in result state)
    const derButton = page.getByRole('button', { name: 'der', exact: true });
    const isDisabled = await derButton.isDisabled().catch(() => true);

    if (!isDisabled) {
      await answerQuestion(page, 'der');
    }

    // Wait for either next question or results
    try {
      await page.waitForFunction(
        () => {
          // Check if results screen appeared
          if (document.body.innerText.includes('Play Again')) return true;
          // Check if buttons are enabled again (new question)
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
      // Timeout - check if we're on results
      const onResults = await page.getByText('Results').isVisible().catch(() => false);
      if (onResults) break;
    }
  }

  // Ensure we're on results
  await page.waitForSelector('text=Results', { timeout: 20_000 });
}
