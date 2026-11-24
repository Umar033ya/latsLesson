import { expect, test, type Browser, type Page } from '@playwright/test';

const PASSWORD = process.env.SEED_PASSWORD ?? 'LastLesson-2026';
const shots = process.env.E2E_SHOTS;
const shot = async (page: Page, name: string) => {
  if (shots) await page.screenshot({ path: `${shots}/${name}.png` });
};

async function open(browser: Browser, options: Parameters<Browser['newContext']>[0]) {
  const context = await browser.newContext(options);
  await context.addInitScript(() => localStorage.setItem('last-lesson-lang', 'en'));
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return { page, errors };
}

async function join(page: Page, code: string, name: string) {
  await page.goto('/');
  // Six digits on the entrance lead to the room.
  await page.locator('#code').fill(code);
  await page.getByRole('button', { name: 'Enter' }).click();
  await page.getByLabel('Your name in the game').fill(name);
  await page.getByRole('button', { name: 'Enter the room' }).click();
  await expect(page.getByText('The game opens by itself')).toBeVisible();
}

async function intoSchool(page: Page) {
  await page.waitForURL(/5174|\/play/, { timeout: 30_000 });
  await page.getByRole('button', { name: 'Take your seat' }).click({ timeout: 60_000 });
  await expect(page.locator('.talk')).toBeVisible({ timeout: 20_000 });
  for (let i = 0; i < 60 && (await page.locator('.talk').count()); i += 1) {
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(120);
  }
}

test('a class plays together in a room', async ({ browser }) => {
  test.setTimeout(180_000);
  const teacher = await open(browser, { viewport: { width: 1280, height: 800 } });
  const ali = await open(browser, { viewport: { width: 1280, height: 720 } });
  const zoe = await open(browser, { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });

  await teacher.page.goto('/login');
  await teacher.page.getByLabel('E-mail').fill('teacher@lastlesson.dev');
  await teacher.page.getByLabel('Password').fill(PASSWORD);
  await teacher.page.getByLabel('Password').press('Enter');
  await teacher.page.waitForURL(/\/teacher/);
  await teacher.page.getByRole('button', { name: 'New room' }).first().click();
  await teacher.page.getByLabel('Room name').fill('E2E room');
  await teacher.page.getByRole('button', { name: 'Open the room' }).click();
  const code = ((await teacher.page.locator('p.select-all').textContent()) ?? '').replace(/\D/g, '');
  expect(code).toHaveLength(6);
  await expect(teacher.page.getByRole('button', { name: 'Start the game' })).toBeDisabled();

  await join(ali.page, code, 'Ali');
  await join(zoe.page, code, 'Zoe');
  await expect(teacher.page.getByText('Zoe')).toBeVisible();
  await shot(teacher.page, 'room_waiting');
  await shot(zoe.page, 'room_phone_waiting');
  await teacher.page.getByRole('button', { name: 'Start the game' }).click();
  await expect(teacher.page.getByText('The game is on')).toBeVisible();

  await Promise.all([intoSchool(ali.page), intoSchool(zoe.page)]);
  // Both stand in the same classroom and see each other's name.
  await expect(ali.page.locator('#ui').getByText('Zoe').first()).toBeVisible({ timeout: 15_000 });
  await expect(zoe.page.locator('#ui').getByText('Ali').first()).toBeVisible({ timeout: 15_000 });

  await ali.page.keyboard.down('KeyV');
  await expect(ali.page.getByRole('listbox')).toBeVisible();
  await ali.page.keyboard.press('Digit1');
  await ali.page.keyboard.up('KeyV');
  await expect(zoe.page.locator('#ui').getByText('Follow me!').first()).toBeVisible({ timeout: 8_000 });

  await zoe.page.getByRole('button', { name: 'Say to the others' }).dispatchEvent('pointerdown');
  await zoe.page.getByRole('option', { name: /Well done/ }).dispatchEvent('pointerup');
  await expect(ali.page.locator('#ui').getByText('Well done!').first()).toBeVisible({ timeout: 8_000 });
  await shot(ali.page, 'room_game');
  await shot(zoe.page, 'room_game_phone');
  await shot(teacher.page, 'room_live');

  teacher.page.on('dialog', (d) => void d.accept());
  await teacher.page.getByRole('button', { name: 'End the game' }).click();
  await expect(teacher.page.getByRole('heading', { name: 'Final table' })).toBeVisible();
  await expect(ali.page.getByText('Final table')).toBeVisible({ timeout: 15_000 });
  await shot(ali.page, 'room_board');
  await ali.page.getByRole('button', { name: 'Back to the room' }).click();
  await ali.page.waitForURL(/\/room/);
  await expect(ali.page.getByRole('cell', { name: 'Zoe' })).toBeVisible();
  await shot(ali.page, 'room_board_web');
  await shot(teacher.page, 'room_final');

  await teacher.page.getByRole('link', { name: 'All rooms' }).click();
  await teacher.page.getByRole('row', { name: /E2E room/ }).first().getByRole('button', { name: 'Delete' }).click();
  await expect(teacher.page.getByText('Room deleted')).toBeVisible();
  for (const p of [teacher, ali, zoe]) expect(p.errors).toEqual([]);
});
