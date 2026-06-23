// In-game journey (Phase 1A §3.5/§3.7, QA-002/003). The in-game UI + command-state machine
// land in Task 8; authored as fixme until that UI exists.
import {expect, test} from '@playwright/test';

test.fixme('a legal move applies and advances the turn (T8)', async ({page}) => {
  await page.goto('/');
  await page.getByTestId('hand-card-0').click();
  await expect(page.getByTestId('move-state')).toHaveText('accepted');
});

test.fixme(
  'an illegal/out-of-turn tap surfaces MoveRejected with clear UI (T8/QA-003)',
  async ({page}) => {
    await page.goto('/');
    await page.getByTestId('hand-card-0').click();
    await expect(page.getByTestId('move-rejected-banner')).toBeVisible();
  },
);

test.fixme('game-over shows the podium and host rematch (T8/RC2-UX-002)', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('podium')).toBeVisible();
  await expect(page.getByTestId('rematch')).toBeVisible();
});
