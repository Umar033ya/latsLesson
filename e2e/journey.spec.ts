import { expect, test, type Page } from '@playwright/test';

const PASSWORD = process.env.SEED_PASSWORD || 'LastLesson-2026';
const stamp = Date.now().toString(36);
const shots = process.env.E2E_SHOTS;
const shot = async (page: Page, name: string) => {
  if (shots) await page.screenshot({ path: `${shots}/${name}.png`, fullPage: false });
};
const staff = async (page: Page, email: string) => {
  await page.goto('/staff');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
};

test.describe.serial('the whole product', () => {
  let groupCode = '';
  let personalCode = '';

  test('a super admin reads statistics, creates a center and an administrator', async ({ page }) => {
    await staff(page, 'super@lastlesson.dev');
    await expect(page.getByRole('heading', { name: /^Welcome/ })).toBeVisible();
    await page.waitForTimeout(900);
    await shot(page, 'admin-overview');
    await page.getByRole('link', { name: 'Education centers' }).first().click();
    await page.getByRole('button', { name: 'New center' }).click();
    await page.getByLabel('Name', { exact: true }).fill(`E2E Center ${stamp}`);
    await page.getByLabel('City').fill('Bukhara');
    await page.getByRole('button', { name: 'Create center' }).click();
    await expect(page.getByRole('heading', { name: `E2E Center ${stamp}` })).toBeVisible();
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByLabel('First name').fill('Nodira');
    await page.getByLabel('Last name').fill('Test');
    await page.getByLabel('E-mail').fill(`nodira-${stamp}@example.org`);
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByText('The password is shown only now')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    await shot(page, 'admin-center');
    for (const [link, heading] of [['Plans', 'Plans'], ['Security', 'Security'], ['Subjects and topics', 'Subjects and topics'], ['Settings', 'Settings'], ['Question bank', 'Question bank'], ['Activity log', 'Activity log']]) {
      await page.getByRole('link', { name: link, exact: true }).click();
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await page.waitForTimeout(350);
      await shot(page, `admin-${link.split(' ')[0].toLowerCase()}`);
    }
  });

  test('a center admin builds a group, questions and a campaign, and issues a code', async ({ page }) => {
    await staff(page, 'admin@lastlesson.dev');
    await expect(page.getByRole('heading', { name: /^Welcome/ })).toBeVisible();
    await page.waitForTimeout(900);
    await shot(page, 'center-overview');
    await page.getByRole('link', { name: 'Groups', exact: true }).click();
    await page.getByLabel('New group name').fill(`E2E ${stamp}`);
    await page.getByRole('button', { name: 'Create' }).click();
    await page.getByRole('link', { name: `E2E ${stamp}` }).click();
    await page.getByRole('button', { name: 'Create code' }).click();
    groupCode = (await page.locator('dialog code').innerText()).trim();
    expect(groupCode).toMatch(/^LL-/);
    await shot(page, 'center-group-code');
    await page.getByRole('button', { name: 'Close' }).click();

    await page.getByRole('link', { name: 'Questions', exact: true }).click();
    await page.getByRole('button', { name: 'New question' }).click();
    await page.getByLabel('Subject', { exact: true }).last().selectOption({ label: 'Mathematics' });
    await page.getByLabel('Question', { exact: true }).fill(`E2E ${stamp}: zero is an even number.`);
    await page.getByLabel('Question type').selectOption('TRUE_FALSE');
    await page.getByLabel('Explanation shown after the answer').fill('0 = 2 × 0.');
    await shot(page, 'center-question');
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByText('Question saved')).toBeVisible();

    const rows = [1, 2, 3, 4].map((n) => ({ subject: 'Mathematics', topic: 'Algebra', type: 'TRUE_FALSE', difficulty: 'EASY', prompt: `E2E ${stamp}: statement ${n} is true.`, correctAnswer: true, explanation: 'It was true.' }));
    await page.getByRole('button', { name: 'Import' }).click();
    await page.getByLabel('Question file').setInputFiles({ name: 'q.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ questions: [...rows, { ...rows[0], subject: 'Alchemy' }] })) });
    await expect(page.getByText('Row 5: Unknown subject "Alchemy"')).toBeVisible();
    await page.getByLabel('Question file').setInputFiles({ name: 'q.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(rows)) });
    await page.getByRole('button', { name: 'Import 4 questions' }).click();
    await expect(page.getByText('Import finished')).toBeVisible();

    await page.getByRole('link', { name: 'Collections', exact: true }).click();
    await page.getByRole('button', { name: 'New collection' }).click();
    await page.getByLabel('Name').fill(`Set ${stamp}`);
    await page.getByPlaceholder('Search questions').fill(`E2E ${stamp}`);
    await expect(page.locator('dialog li')).toHaveCount(5);
    for (let i = 0; i < 5; i += 1) await page.locator('dialog li input').nth(i).check();
    await page.getByRole('button', { name: 'Save collection' }).click();
    await expect(page.getByText(`Set ${stamp}`)).toBeVisible();

    await page.getByRole('link', { name: 'Campaigns', exact: true }).first().click();
    await page.waitForTimeout(400);
    await shot(page, 'center-campaigns');
    await page.getByRole('button', { name: 'New campaign' }).click();
    await page.getByLabel('Title', { exact: true }).fill(`Night ${stamp}`);
    for (const room of ['Library', 'Biology lab', 'Boiler room', 'Maths room', 'Staff room', 'Optional finds']) await page.getByLabel(new RegExp(`^${room}`)).uncheck();
    await page.getByLabel(`Set ${stamp} (5)`).check();
    await page.getByLabel(`E2E ${stamp}`).check();
    await expect(page.getByText('5 matching questions, 4 needed.')).toBeVisible();
    await shot(page, 'center-campaign-editor');
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByText('Published').first()).toBeVisible();
    await page.getByRole('button', { name: 'Preview' }).click();
    await expect(page.getByText('The blackboard').last()).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    for (const [link, heading] of [['Students', 'Students'], ['Access codes', 'Access codes'], ['Game and branding', 'Game and branding'], ['Profile and plan', 'Profile and plan'], ['Learning notes', 'Learning notes']]) {
      await page.getByRole('link', { name: link, exact: true }).first().click();
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await page.waitForTimeout(350);
      await shot(page, `center-${link.split(' ')[0].toLowerCase()}`);
    }
  });

  test('a student joins, prepares, plays, recovers from a refresh and sees the result', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await page.getByLabel('Access code').fill('LL-ZZZZ-ZZZZ');
    await page.getByRole('button', { name: 'Enter' }).click();
    await expect(page.getByRole('alert')).toContainText('do not recognise');
    await shot(page, 'student-entrance');
    await page.getByLabel('Access code').fill(groupCode.toLowerCase());
    await page.getByRole('button', { name: 'Enter' }).click();
    await page.getByLabel('First name').fill('Aziza');
    await page.getByLabel('Last name').fill('Karim');
    await page.getByRole('button', { name: 'Sign the register' }).click();
    personalCode = (await page.locator('p.text-4xl').innerText()).trim();
    expect(personalCode).toMatch(/^LL-/);
    await page.getByRole('button', { name: 'I wrote it down' }).click();
    await expect(page.getByText('Good evening, Aziza.')).toBeVisible();
    await expect(page.getByText(`Night ${stamp}`)).toBeVisible();
    await shot(page, 'student-home');

    await page.getByRole('link', { name: 'Prepare', exact: true }).click();
    await page.getByRole('button', { name: 'Biology' }).click();
    await page.getByRole('button', { name: 'Cells' }).click();
    await page.getByRole('button', { name: 'Make my study guide' }).click();
    await expect(page.getByRole('heading', { name: 'Practice' })).toBeVisible();
    await shot(page, 'student-guide');
    await page.getByRole('link', { name: 'I am ready' }).click();

    await page.locator('article', { hasText: `Night ${stamp}` }).getByRole('button', { name: 'Start' }).click();
    await page.waitForURL(/5174/);
    await page.getByRole('button', { name: 'Take your seat' }).click({ timeout: 40_000 });
    expect(page.url()).not.toContain('ticket');
    const skip = async () => {
      for (let i = 0; i < 160; i += 1) {
        if (await page.locator('.talk').count()) await page.keyboard.press('e');
        else {
          await page.waitForTimeout(300);
          if (!(await page.locator('.talk').count())) return;
        }
        await page.waitForTimeout(120);
      }
    };
    const go = async (x: number, y: number) => {
      await page.evaluate(([a, b]) => {
        const s = (window as any).__school;
        s.player.setPosition(a * 16, b * 16);
        s.face.set(0, -1);
      }, [x, y]);
      await page.waitForTimeout(350);
    };
    const ready = () => page.waitForFunction(() => Boolean((window as any).__school?.player?.active));
    await ready();
    await page.waitForSelector('.talk');
    await skip();
    await expect(page.locator('#hud .goal')).toContainText('Find the torch');
    await go(14.7, 14.9);
    await page.keyboard.press('e');
    await page.waitForTimeout(400);
    await skip();
    await go(14, 13.3);
    await page.keyboard.press('e');
    await expect(page.locator('.lesson')).toContainText('A short lesson');
    await page.waitForTimeout(500);
    await page.keyboard.press('e');
    await expect(page.locator('.device h2')).toContainText(`E2E ${stamp}`);

    // The connection drops while the answer is on its way: nothing is lost, the answer counts once.
    let dropped = 0;
    await page.route('**/api/v1/play/answers', async (route) => {
      dropped += 1;
      if (dropped === 1) {
        await route.fetch();
        await route.abort();
      } else await route.continue();
    });
    await page.locator('.control button', { hasText: 'True' }).click();
    await page.locator('.submit').click();
    await expect(page.locator('#link')).toHaveClass(/on/);
    await page.getByRole('button', { name: 'Continue' }).click({ timeout: 15_000 });
    await page.unroute('**/api/v1/play/answers');
    await page.waitForTimeout(400);
    await skip();
    await page.evaluate(() => (window as any).__school.save());
    await page.waitForTimeout(800);

    await page.reload();
    await page.getByRole('button', { name: 'Return to the school' }).click({ timeout: 40_000 });
    await ready();
    await page.waitForTimeout(1800);
    await expect(page.locator('#hud .goal')).not.toContainText('blackboard');

    await go(84.5, 38.2);
    await skip();
    await go(84.5, 38.2);
    await page.keyboard.press('e');
    for (let i = 0; i < 3; i += 1) {
      if (await page.locator('.lesson').count()) {
        await page.waitForTimeout(500);
        await page.keyboard.press('e');
      }
      await page.locator('.control button', { hasText: 'True' }).click();
      await page.locator('.submit').click();
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.waitForTimeout(350);
    }
    await skip();
    await go(82, 33.6);
    await page.keyboard.press('e');
    await page.getByRole('button', { name: 'Go home' }).click();
    await page.waitForTimeout(1100);
    await skip();
    await expect(page.locator('.report')).toContainText('4 of 4 (100%)', { timeout: 20_000 });
    await expect(page.locator('.report')).toContainText('Your result has been recorded');
    await shot(page, 'game-report');
    await page.getByRole('button', { name: 'Back to my page' }).click();
    await page.waitForURL(/\/student/);
    await page.goto('/student/results');
    await expect(page.getByText('100% correct')).toBeVisible();
    await page.getByRole('link', { name: new RegExp(`Night ${stamp}`) }).click();
    await expect(page.getByText('It was true.').or(page.getByText('0 = 2 × 0.')).first()).toBeVisible();
    await shot(page, 'student-review');
    await page.goto('/student/progress');
    await expect(page.getByText('Finished nights')).toBeVisible();
    await shot(page, 'student-progress');
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.getByLabel('Access code').fill(personalCode);
    await page.getByRole('button', { name: 'Enter' }).click();
    await expect(page.getByText('Good evening, Aziza.')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('a student registers with a code, hides and answers, in Russian and Uzbek', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: 'ru', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Создать аккаунт' })).toBeVisible();
    await page.getByLabel('Код доступа от вашего центра').fill(groupCode);
    await page.getByLabel('Имя', { exact: true }).fill('Дилшод');
    await page.getByLabel('Фамилия').fill('Тест');
    await page.getByLabel('E-mail').fill(`dilshod-${stamp}@example.org`);
    await page.getByLabel('Пароль', { exact: true }).fill('Parol-12345');
    await page.getByLabel('Повторите пароль').fill('Parol-12345');
    await shot(page, 'register-ru');
    await page.getByRole('button', { name: 'Создать аккаунт ученика' }).click();
    await expect(page.getByText('Добрый вечер, Дилшод.')).toBeVisible();
    await shot(page, 'student-home-ru');
    await page.locator('article', { hasText: 'Последний урок' }).getByRole('button', { name: 'Начать' }).click();
    await page.waitForURL(/5174/);
    // The launch ticket is single-use: the first page has to finish exchanging it.
    await page.locator('.title nav button').first().waitFor({ timeout: 40_000 });
    await page.goto('http://localhost:5174/?lang=uz');
    await page.getByRole('button', { name: /Maktabga qaytish|Partaga o‘tirish/ }).click({ timeout: 40_000 });
    await page.waitForFunction(() => Boolean((window as any).__school?.player?.active));
    await page.waitForSelector('.talk');
    await expect(page.locator('.talk')).toContainText('Yomg‘ir');
    for (let i = 0; i < 60 && (await page.locator('.talk').count()); i += 1) {
      await page.keyboard.press('e');
      await page.waitForTimeout(130);
    }
    await page.evaluate(() => {
      const s = (window as any).__school;
      s.player.setPosition(6.8 * 16, 13.6 * 16);
      s.face.set(0, -1);
    });
    await page.waitForTimeout(400);
    await page.keyboard.press('e');
    await expect(page.locator('.hiding .device')).toContainText('Jim tur');
    await page.waitForTimeout(300);
    await shot(page, 'hiding-uz');
    await page.locator('.hiding .control button').first().click();
    await page.locator('.hiding .submit').click();
    await page.getByRole('button', { name: 'Davom etish' }).click();
    await expect(page.locator('.hiding')).toHaveCount(0);
    await page.keyboard.press('j');
    await expect(page.locator('.notebook')).toContainText('Daftar');
    await shot(page, 'notebook-uz');
  });

  test('the center sees the result, another center does not', async ({ page }) => {
    await staff(page, 'admin@lastlesson.dev');
    await page.getByRole('link', { name: 'Results', exact: true }).click();
    await page.getByRole('link', { name: 'Aziza Karim' }).first().click();
    await expect(page.getByText('Escaped').first()).toBeVisible();
    await shot(page, 'center-review');
    const url = page.url();
    await page.getByRole('link', { name: 'Analytics', exact: true }).click();
    await expect(page.getByText('Most missed questions')).toBeVisible();
    await page.waitForTimeout(300);
    await shot(page, 'center-analytics');
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await staff(page, 'riverside@lastlesson.dev');
    await expect(page.getByText('Riverside Learning Center').first()).toBeVisible();
    await page.goto(new URL(url).pathname);
    await expect(page.getByText('was not found')).toBeVisible();
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/center$/);
  });
});
