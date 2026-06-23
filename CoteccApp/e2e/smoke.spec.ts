// Smoke: the embedded host serves the REAL exported bundle and a browser can boot the SPA.
// This is the load-bearing QA-002 assertion that the harness→bundle→browser path works
// end-to-end; the multiplayer journeys live in join/lobby/game.spec.ts (pending T7/T8 UI).
import {expect, test} from '@playwright/test';

test('embedded host answers /healthz', async ({request}) => {
  const res = await request.get('/healthz');
  expect(res.status()).toBe(200);
  expect(await res.text()).toBe('ok');
});

test('host-served bundle boots the SPA shell', async ({page}) => {
  const res = await page.goto('/');
  expect(res?.status()).toBeLessThan(400);
  // AuthScreen is the index route; its testIDs prove the bundle hydrated in the browser.
  await expect(page.getByTestId('play-as-guest-button')).toBeVisible({
    timeout: 15_000,
  });
});

test('an unknown route SPA-falls-back to the app shell (not a 404 page)', async ({
  page,
}) => {
  const res = await page.goto('/join');
  // The host returns index.html for unknown routes so client routing can take over.
  expect(res?.status()).toBe(200);
});
