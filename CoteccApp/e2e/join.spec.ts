// Guest join journey (Phase 1A §3.2/§3.3, QA-002). The /join route + JoinScreen land in
// Task 7; these scenarios are authored as fixme so the intended coverage is visible and
// fails loudly (not silently absent) until that UI exists.
import {expect, test} from '@playwright/test';

test.fixme(
  'deep-link join carries only the room token and reaches the lobby (T7)',
  async ({page}) => {
    await page.goto('/join?room=ROOMTOKEN');
    await page.getByTestId('display-name-input').fill('Ann');
    await page.getByTestId('join-submit').click();
    await expect(page.getByTestId('lobby-screen')).toBeVisible();
  },
);

test.fixme('manual-entry fallback for a camera-less guest (T7/RC3-UX-003)', async ({
  page,
}) => {
  await page.goto('/join');
  await expect(page.getByTestId('manual-join-fallback')).toBeVisible();
});
