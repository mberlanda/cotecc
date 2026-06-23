// Lobby & seating journey (Phase 1A §3.1/§3.4, QA-002). LobbyScreen + hostController land
// in Task 8; authored as fixme until that UI exists.
import {expect, test} from '@playwright/test';

test.fixme('host can lock a seat, add a bot, and start at >=2 occupants (T8)', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('lobby-screen')).toBeVisible();
  await page.getByTestId('add-bot-seat').click();
  await expect(page.getByTestId('start-game')).toBeEnabled();
});

test.fixme('a guest sees host-only controls disabled, not hidden (T8/UX-012)', async ({
  page,
}) => {
  await page.goto('/join?room=ROOMTOKEN');
  await expect(page.getByTestId('start-game')).toBeDisabled();
});
