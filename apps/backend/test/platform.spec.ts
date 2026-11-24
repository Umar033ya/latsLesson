import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { createHash } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { PrismaService } from '../src/common/prisma.service';
import { ApiException } from '../src/common/errors';
import { GoogleIdentity, type GoogleProfile } from '../src/auth/google-identity';

const PASSWORD = 'Correct-Horse-1';
/** Stands in for Google: the credential is the profile itself. */
const google = {
  clientId: 'test-client',
  verify: async (credential: string): Promise<GoogleProfile> => {
    if (!credential.startsWith('{')) throw new ApiException('GOOGLE_INVALID', 'Google could not confirm this account. Try again.', 401);
    return JSON.parse(credential);
  },
};
const credential = (sub: string, email: string) => JSON.stringify({ sub, email, firstName: 'Gulnora', lastName: 'T' }).padEnd(120);
let app: INestApplication;
let prisma: PrismaService;
const ids: Record<string, string> = {};
const tokens: Record<string, string> = {};

const api = () => request(app.getHttpServer());
const url = (p: string) => `/api/v1${p}`;
const call = (method: 'get' | 'post' | 'put' | 'patch' | 'delete', path: string, token?: string, body?: object) => {
  const r = api()[method](url(path));
  if (token) r.set('Authorization', `Bearer ${token}`);
  return body ? r.send(body) : r;
};
const login = async (email: string) => (await call('post', '/auth/login', undefined, { email, password: PASSWORD })).body.accessToken as string;
const resetLimits = () => prisma.rateLimit.deleteMany();

beforeAll(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(GoogleIdentity).useValue(google).compile();
  app = module.createNestApplication({ bodyParser: false, logger: false });
  setupApp(app);
  await app.init();
  prisma = app.get(PrismaService);
  const passwordHash = await argon2.hash(PASSWORD);
  await prisma.user.create({ data: { email: 'root@test.dev', passwordHash, firstName: 'Root', lastName: 'Admin', role: 'SUPER_ADMIN' } });
  const plan = await prisma.plan.create({ data: { key: 'p', name: 'P', maxStudents: 6, maxGroups: 2, maxCampaigns: 5, maxQuestions: 100 } });
  for (const k of ['a', 'b']) {
    const org = await prisma.organization.create({ data: { name: `Center ${k}`, slug: `center-${k}`, planId: plan.id } });
    ids[k] = org.id;
    await prisma.user.create({ data: { email: `${k}@test.dev`, passwordHash, firstName: k, lastName: 'Admin', role: 'CENTER_ADMIN', adminOf: { create: { organizationId: org.id } } } });
  }
  const subject = await prisma.subject.create({ data: { name: 'Mathematics', slug: 'mathematics', topics: { create: [{ name: 'Algebra', slug: 'algebra' }] } }, include: { topics: true } });
  ids.subject = subject.id;
  ids.topic = subject.topics[0].id;
  for (let i = 0; i < 14; i += 1) {
    await prisma.question.create({ data: { subjectId: subject.id, topicId: ids.topic, type: i % 2 ? 'TRUE_FALSE' : 'MULTIPLE_CHOICE', difficulty: (['EASY', 'MEDIUM', 'HARD'] as const)[i % 3], prompt: `Official ${i}`, options: i % 2 ? {} : [{ id: 'x', text: 'yes' }, { id: 'y', text: 'no' }], correctAnswer: i % 2 ? true : 'x', hint: 'Think', explanation: `Because ${i}`, points: 10 } });
  }
  tokens.root = await login('root@test.dev');
  tokens.a = await login('a@test.dev');
  tokens.b = await login('b@test.dev');
});
afterAll(() => app.close());
beforeEach(resetLimits);

describe('authentication', () => {
  it('rejects bad credentials with one message and locks after repeated failures', async () => {
    const unknown = await call('post', '/auth/login', undefined, { email: 'nobody@test.dev', password: 'wrong-pass' });
    const known = await call('post', '/auth/login', undefined, { email: 'b@test.dev', password: 'wrong-pass' });
    expect(unknown.status).toBe(401);
    expect(known.body.error.message).toBe(unknown.body.error.message);
    for (let i = 0; i < 8; i += 1) await call('post', '/auth/login', undefined, { email: 'b@test.dev', password: 'wrong-pass' });
    await resetLimits();
    expect((await call('post', '/auth/login', undefined, { email: 'b@test.dev', password: PASSWORD })).body.error.code).toBe('ACCOUNT_LOCKED');
    await prisma.user.update({ where: { email: 'b@test.dev' }, data: { lockedUntil: null, failedLogins: 0 } });
  });

  it('keeps the refresh token in an httpOnly cookie, rotates it and detects reuse', async () => {
    const res = await call('post', '/auth/login', undefined, { email: 'a@test.dev', password: PASSWORD });
    expect(res.body.refreshToken).toBeUndefined();
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    const first = cookie.split(';')[0];
    expect((await api().post(url('/auth/refresh')).set('Cookie', first)).body.error.code).toBe('CSRF');
    expect((await api().post(url('/auth/refresh')).set('Cookie', first).set('X-LL-Client', 'web').set('Origin', 'https://evil.example')).status).toBe(403);
    const refreshed = await api().post(url('/auth/refresh')).set('Cookie', first).set('X-LL-Client', 'web');
    expect(refreshed.status).toBe(200);
    const second = refreshed.headers['set-cookie'][0].split(';')[0];
    await prisma.refreshToken.updateMany({ where: { tokenHash: createHash('sha256').update(decodeURIComponent(first.split('=')[1])).digest('hex') }, data: { revokedAt: new Date(Date.now() - 120_000) } });
    expect((await api().post(url('/auth/refresh')).set('Cookie', first).set('X-LL-Client', 'web')).status).toBe(401);
    expect((await api().post(url('/auth/refresh')).set('Cookie', second).set('X-LL-Client', 'web')).status).toBe(401);
  });

  it('does not lock out a class that shares one address', async () => {
    const statuses = await Promise.all(Array.from({ length: 24 }, () => call('post', '/auth/login', undefined, { email: 'a@test.dev', password: PASSWORD })));
    expect(statuses.every((r) => r.status === 200)).toBe(true);
  });

  it('rate limits failed sign-in attempts per address', async () => {
    let last = 0;
    for (let i = 0; i < 17; i += 1) last = (await call('post', '/auth/login', undefined, { email: 'nobody@test.dev', password: 'x' })).status;
    expect(last).toBe(429);
  });

  it('needs a real code to register and never leaks internals', async () => {
    expect((await call('post', '/auth/register', undefined, { email: 'x@y.dev', password: PASSWORD, firstName: 'X', lastName: 'Y', invitationCode: 'LL-AAAA-BBBB', role: 'SUPER_ADMIN' })).body.error.code).toBe('CODE_INVALID');
    const bad = await api().post(url('/auth/login')).set('Content-Type', 'application/json').send('{"email":');
    expect(bad.status).toBe(400);
    expect(JSON.stringify(bad.body)).not.toMatch(/stack|node_modules|prisma/i);
  });
});

describe('registration', () => {
  it('lets an education center sign up on the trial plan, isolated from the others', async () => {
    const r = await call('post', '/auth/register-center', undefined, { centerName: 'Зарафшан', firstName: 'Olim', lastName: 'Q', email: 'olim@test.dev', password: PASSWORD, locale: 'uz', role: 'SUPER_ADMIN', organizationId: ids.a });
    expect(r.status).toBe(201);
    const me = await call('get', '/auth/me', r.body.accessToken);
    expect(me.body).toMatchObject({ role: 'CENTER_ADMIN', locale: 'uz' });
    expect(me.body.organizations).toHaveLength(1);
    expect(me.body.organizations[0].id).not.toBe(ids.a);
    expect(new Date(me.body.organizations[0].subscriptionEndsAt).getTime()).toBeGreaterThan(Date.now());
    expect((await call('get', `/center/dashboard?organizationId=${ids.a}`, r.body.accessToken)).status).toBe(403);
    expect((await call('post', '/auth/register-center', undefined, { centerName: 'Copy', firstName: 'A', lastName: 'B', email: 'olim@test.dev', password: PASSWORD })).status).toBe(409);
    await prisma.organization.delete({ where: { id: me.body.organizations[0].id } });
  });

  it('can be closed by the platform, and weak passwords are refused', async () => {
    const body = { centerName: 'Closed', firstName: 'A', lastName: 'B', email: 'closed@test.dev', password: PASSWORD };
    expect((await call('post', '/auth/register-center', undefined, { ...body, password: '123' })).body.error.code).toBe('VALIDATION_FAILED');
    await call('put', '/admin/settings', tokens.root, { centerSignup: false, studentSignup: false });
    expect((await call('post', '/auth/register-center', undefined, body)).body.error.code).toBe('REGISTRATION_CLOSED');
    expect((await call('get', '/auth/options')).body).toMatchObject({ centerSignup: false, studentSignup: false });
    await call('put', '/admin/settings', tokens.root, {});
  });

  it('saves the language of the account', async () => {
    expect((await call('patch', '/auth/me', tokens.a, { locale: 'ru' })).body).toEqual({ locale: 'ru' });
    expect((await call('get', '/auth/me', tokens.a)).body.locale).toBe('ru');
    expect((await call('patch', '/auth/me', tokens.a, { locale: 'xx' })).status).toBe(400);
    expect((await call('patch', '/auth/me', tokens.a, { locale: 'en', role: 'SUPER_ADMIN' })).body).toEqual({ locale: 'en' });
  });
});

describe('super admin', () => {
  it('creates a center and an administrator, changes permissions and sees statistics', async () => {
    const org = await call('post', '/organizations', tokens.root, { name: 'New Center', slug: 'new-center', city: 'Bukhara' });
    expect(org.status).toBe(201);
    const admin = await call('post', '/users/admins', tokens.root, { email: 'new@test.dev', firstName: 'New', lastName: 'Admin', organizationId: org.body.id });
    expect(admin.body.initialPassword).toBeTruthy();
    const session = await call('post', '/auth/login', undefined, { email: 'new@test.dev', password: admin.body.initialPassword });
    expect((await call('get', '/center/dashboard', session.body.accessToken)).status).toBe(200);
    await call('patch', `/organizations/${org.body.id}/status`, tokens.root, { status: 'SUSPENDED' });
    expect((await call('get', '/center/dashboard', session.body.accessToken)).body.error.code).toBe('CENTER_SUSPENDED');
    const stats = await call('get', '/analytics/platform', tokens.root);
    expect(stats.body.centers).toMatchObject({ total: 3, SUSPENDED: 1 });
    const log = await call('get', '/audit-logs?category=ADMIN', tokens.root);
    expect(log.body.items.map((i: any) => i.action)).toEqual(expect.arrayContaining(['CENTER_SUSPENDED', 'ADMIN_CREATED', 'CENTER_CREATED']));
  });

  it('is off limits to everyone else', async () => {
    for (const path of ['/organizations', '/admin/settings', '/admin/security', '/users/admins', '/analytics/platform']) {
      expect((await call('get', path)).status).toBe(401);
      expect((await call('get', path, tokens.a)).status).toBe(403);
    }
    expect((await call('post', '/users/admins', tokens.a, { email: 'z@test.dev', firstName: 'Z', lastName: 'Z', organizationId: ids.a })).status).toBe(403);
    expect((await call('put', '/admin/settings', tokens.a, {})).status).toBe(403);
  });
});

describe('education center', () => {
  it('creates a group, questions, a campaign and access codes', async () => {
    const group = await call('post', '/center/groups', tokens.a, { name: '9-A' });
    ids.group = group.body.id;
    expect((await call('post', '/center/groups', tokens.a, { name: '9-A' })).status).toBe(409);
    const q = { subjectId: ids.subject, topicId: ids.topic, type: 'TEXT', difficulty: 'EASY', prompt: 'Center question: 2 + 2?', correctAnswer: ['4'], points: 10 };
    const created = await call('post', '/questions', tokens.a, q);
    expect(created.status).toBe(201);
    ids.question = created.body.id;
    expect((await call('post', '/questions', tokens.a, { ...q, correctAnswer: [] })).body.error.code).toBe('VALIDATION_FAILED');
    const draft = await call('post', '/questions', tokens.a, { ...q, prompt: 'Draft', correctAnswer: [], status: 'DRAFT' });
    expect(draft.status).toBe(201);
    expect((await call('patch', `/questions/${draft.body.id}/status`, tokens.a, { status: 'PUBLISHED' })).status).toBe(400);
    const campaign = await call('post', '/campaigns', tokens.a, { title: 'Algebra night', config: { source: { subjectIds: [ids.subject] }, overrides: { blackboard: { questionId: ids.question } }, gameplay: { attemptsPerQuestion: 2 } }, groupIds: [ids.group] });
    expect(campaign.status).toBe(201);
    ids.campaign = campaign.body.id;
    expect((await call('post', `/campaigns/${ids.campaign}/publish`, tokens.a)).body.status).toBe('PUBLISHED');
    const preview = await call('get', `/campaigns/${ids.campaign}/preview`, tokens.a);
    expect(preview.body.gates.find((g: any) => g.gate.id === 'blackboard').question.id).toBe(ids.question);
    const code = await call('post', '/invitations', tokens.a, { groupId: ids.group, maxUses: 2 });
    expect(code.body.code).toMatch(/^LL-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    ids.groupCode = code.body.code;
    expect(JSON.stringify((await call('get', '/invitations', tokens.a)).body)).not.toContain(code.body.code);
    const students = await call('post', '/center/students/bulk', tokens.a, { students: [{ firstName: 'Lola', groupId: ids.group }, { firstName: 'Aziz' }] });
    ids.lola = students.body.students[0].id;
    ids.lolaCode = students.body.students[0].code;
    expect((await call('get', '/center/students?search=lol', tokens.a)).body.total).toBe(1);
  });

  it('refuses to publish a campaign without enough questions', async () => {
    const collection = await call('post', '/collections', tokens.a, { name: 'One', questionIds: [ids.question] });
    const campaign = await call('post', '/campaigns', tokens.a, { title: 'Too small', config: { source: { collectionIds: [collection.body.id] } } });
    expect((await call('post', `/campaigns/${campaign.body.id}/publish`, tokens.a)).body.error.code).toBe('NOT_ENOUGH_QUESTIONS');
  });

  it('validates imports row by row and enforces plan limits', async () => {
    const good = { subject: 'Mathematics', topic: 'Algebra', type: 'TRUE_FALSE', difficulty: 'EASY', prompt: 'Imported', correctAnswer: true };
    const dry = await call('post', '/questions/import', tokens.a, { dryRun: true, questions: [good, { ...good, subject: 'Alchemy' }, { ...good, correctAnswer: 'x' }] });
    expect(dry.body).toMatchObject({ imported: 0, valid: 1 });
    expect(dry.body.errors.map((e: any) => e.row)).toEqual([2, 3]);
    expect((await call('post', '/questions/import', tokens.a, { questions: [good] })).body.imported).toBe(1);
    expect((await call('get', '/questions/export', tokens.a)).body.questions.map((q: any) => q.prompt)).toContain('Imported');
    expect((await call('post', '/center/groups', tokens.a, { name: '9-B' })).status).toBe(201);
    expect((await call('post', '/center/groups', tokens.a, { name: '9-C' })).body.error.code).toBe('PLAN_LIMIT');
  });

  it('rejects script-like logos and out-of-policy settings', async () => {
    expect((await call('patch', '/center/profile', tokens.a, { logoUrl: 'javascript:alert(1)' })).status).toBe(400);
    expect((await call('patch', '/center/profile', tokens.a, { logoUrl: 'data:image/svg+xml;base64,AAAA' })).status).toBe(400);
    await call('put', '/admin/settings', tokens.root, { allowedTensions: ['CALM'] });
    expect((await call('put', '/center/settings', tokens.a, { gameplay: { tension: 'TENSE' } })).status).toBe(400);
    await call('put', '/admin/settings', tokens.root, {});
  });
});

describe('tenant isolation', () => {
  it('never shows or changes another center’s data', async () => {
    const t = tokens.b;
    expect((await call('get', `/center/dashboard?organizationId=${ids.a}`, t)).status).toBe(403);
    expect((await call('get', `/center/students?organizationId=${ids.a}`, t)).status).toBe(403);
    expect((await call('get', `/analytics/organization?organizationId=${ids.a}`, t)).status).toBe(403);
    expect((await call('get', `/game-results/organization?organizationId=${ids.a}`, t)).status).toBe(403);
    expect((await call('get', `/center/students/${ids.lola}`, t)).status).toBe(404);
    expect((await call('patch', `/center/students/${ids.lola}`, t, { firstName: 'Hacked' })).status).toBe(404);
    expect((await call('get', `/center/groups/${ids.group}`, t)).status).toBe(404);
    expect((await call('get', `/questions/${ids.question}`, t)).status).toBe(404);
    expect((await call('delete', `/questions/${ids.question}`, t)).status).toBe(404);
    expect((await call('get', `/campaigns/${ids.campaign}`, t)).status).toBe(404);
    expect((await call('post', `/campaigns/${ids.campaign}/publish`, t)).status).toBe(404);
    expect((await call('post', '/invitations', t, { groupId: ids.group })).status).toBe(404);
    expect((await call('post', '/invitations', t, { organizationId: ids.a })).status).toBe(403);
    expect((await call('post', '/collections', t, { name: 'Steal', questionIds: [ids.question] })).status).toBe(400);
    expect((await call('post', '/campaigns', t, { title: 'Steal', config: { overrides: { blackboard: { questionId: ids.question } } } })).status).toBe(400);
    expect((await call('get', '/questions?scope=own', t)).body.total).toBe(0);
    const codes = (await call('get', '/invitations', tokens.a)).body;
    expect((await call('post', `/invitations/${codes[0].id}/revoke`, t)).status).toBe(404);
  });

  it('lets centers read official content but not change it', async () => {
    const official = (await call('get', '/questions?scope=official', tokens.b)).body.items[0];
    expect((await call('patch', `/questions/${official.id}/status`, tokens.b, { status: 'ARCHIVED' })).status).toBe(403);
    expect((await call('delete', `/questions/${official.id}`, tokens.b)).status).toBe(403);
  });

  it('gives no extra rights to a center admin who is also a student elsewhere', async () => {
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'b@test.dev' } });
    await prisma.membership.create({ data: { userId: admin.id, organizationId: ids.a } });
    expect((await call('get', `/center/dashboard?organizationId=${ids.a}`, tokens.b)).status).toBe(403);
    await prisma.membership.deleteMany({ where: { userId: admin.id } });
  });

  it('answers malformed ids without a server error', async () => {
    expect((await call('get', '/center/students/not-a-uuid', tokens.a)).status).toBe(404);
    expect((await call('get', '/center/dashboard?organizationId=1%27%20OR%201=1', tokens.a)).status).toBe(400);
  });
});

describe('student access codes', () => {
  it('asks group-code visitors for a name, creates a profile and respects the use limit', async () => {
    const ask = await call('post', '/auth/code', undefined, { code: ids.groupCode.toLowerCase() });
    expect(ask.body).toMatchObject({ needsProfile: true, group: '9-A' });
    const join = await call('post', '/auth/code', undefined, { code: ids.groupCode, firstName: 'Guest', lastName: 'One' });
    expect(join.body.personalCode).toMatch(/^LL-/);
    tokens.guest = join.body.accessToken;
    expect((await call('post', '/auth/code', undefined, { code: join.body.personalCode })).body.accessToken).toBeTruthy();
    const race = await Promise.all([1, 2, 3].map((i) => call('post', '/auth/code', undefined, { code: ids.groupCode, firstName: `Racer ${i}` })));
    expect(race.filter((r) => r.status === 200)).toHaveLength(1);
  });

  it('signs a known student in with a personal code, and stops when access is turned off', async () => {
    const res = await call('post', '/auth/code', undefined, { code: ids.lolaCode });
    tokens.lola = res.body.accessToken;
    expect((await call('get', '/student/home', tokens.lola)).body.student.firstName).toBe('Lola');
    await call('patch', `/center/students/${ids.lola}`, tokens.a, { status: 'INACTIVE' });
    expect((await call('get', '/student/home', tokens.lola)).body.error.code).toBe('ACCESS_DISABLED');
    expect((await call('post', '/auth/code', undefined, { code: ids.lolaCode })).body.error.code).toBe('ACCESS_DISABLED');
    await call('patch', `/center/students/${ids.lola}`, tokens.a, { status: 'ACTIVE' });
  });

  it('turns a personal code into an account without losing results, once', async () => {
    const aziz = await prisma.user.findFirstOrThrow({ where: { firstName: 'Aziz' } });
    const { code } = (await call('post', `/center/students/${aziz.id}/code`, tokens.a)).body;
    const body = { firstName: 'Mallory', lastName: 'X', email: 'aziz@test.dev', password: PASSWORD, invitationCode: code };
    const r = await call('post', '/auth/register', undefined, body);
    expect(r.status).toBe(201);
    expect((await call('get', '/auth/me', r.body.accessToken)).body).toMatchObject({ id: aziz.id, firstName: 'Aziz', role: 'GAMER' });
    expect((await call('post', '/auth/login', undefined, { email: 'aziz@test.dev', password: PASSWORD })).status).toBe(200);
    expect((await call('post', '/auth/register', undefined, { ...body, email: 'second@test.dev' })).status).toBe(409);
  });

  it('rejects unknown, expired, revoked and regenerated codes', async () => {
    expect((await call('post', '/auth/code', undefined, { code: 'LL-ZZZZ-ZZZZ' })).body.error.code).toBe('CODE_INVALID');
    const a = (await call('post', '/invitations', tokens.a, { groupId: ids.group })).body;
    await prisma.invitationCode.update({ where: { id: a.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await call('post', '/auth/code', undefined, { code: a.code })).body.error.code).toBe('CODE_EXPIRED');
    const c = (await call('post', '/invitations', tokens.a, { groupId: ids.group })).body;
    const fresh = (await call('post', `/invitations/${c.id}/regenerate`, tokens.a)).body;
    expect((await call('post', '/auth/code', undefined, { code: c.code })).body.error.code).toBe('CODE_REVOKED');
    expect((await call('post', '/auth/code', undefined, { code: fresh.code })).body.needsProfile).toBe(true);
  });

  it('keeps students away from center and admin endpoints', async () => {
    for (const path of ['/center/dashboard', '/questions', '/campaigns', '/invitations', '/organizations', '/audit-logs', '/analytics/organization']) expect((await call('get', path, tokens.lola)).status).toBe(403);
  });
});

describe('preparation', () => {
  it('builds a guide without AI, hides answers and grades practice', async () => {
    const prep = await call('post', '/ai-preparation', tokens.lola, { subjectId: ids.subject, topics: ['Algebra'], difficulty: 'EASY' });
    expect(prep.status).toBe(201);
    expect(prep.body.provider).toBe('local');
    expect(prep.body.practice.length).toBeGreaterThan(0);
    expect(JSON.stringify(prep.body)).not.toContain('correctAnswer');
    const graded = await call('post', `/ai-preparation/${prep.body.id}/practice`, tokens.lola, { questionId: prep.body.practice[0].id, answer: 'nope' });
    expect(graded.body).toHaveProperty('correct');
    expect((await call('get', `/ai-preparation/${prep.body.id}`, tokens.guest)).status).toBe(404);
    ids.prep = prep.body.id;
  });
});

describe('game session', () => {
  let game: string;
  let session: any;
  const answerOf = (q: any) => (q.type === 'TRUE_FALSE' ? true : q.type === 'TEXT' ? '4' : 'x');
  const submit = (q: any, answer: unknown, requestId: string) => call('post', '/play/answers', game, { gateId: q.gateId, questionId: q.id, answer, requestId, elapsedMs: 5000 });
  const gate = (id: string) => session.questions.find((q: any) => q.gateId === id);

  it('refuses campaigns that are not assigned to the student', async () => {
    const other = await call('post', '/campaigns', tokens.b, { title: 'B only', config: {} });
    await call('post', `/campaigns/${other.body.id}/publish`, tokens.b);
    expect((await call('post', '/game-sessions/launch', tokens.lola, { campaignId: other.body.id })).body.error.code).toBe('CAMPAIGN_UNAVAILABLE');
    const aziz = await prisma.user.findFirstOrThrow({ where: { firstName: 'Aziz' } });
    const code = (await call('post', `/center/students/${aziz.id}/code`, tokens.a)).body.code;
    const token = (await call('post', '/auth/code', undefined, { code })).body.accessToken;
    expect((await call('post', '/game-sessions/launch', token, { campaignId: ids.campaign })).body.error.code).toBe('CAMPAIGN_UNAVAILABLE');
  });

  it('hands over one session through a one-time ticket, without any answers', async () => {
    const launch = await call('post', '/game-sessions/launch', tokens.lola, { campaignId: ids.campaign, preparationId: ids.prep });
    const ticket = launch.body.launchUrl.split('#ticket=')[1];
    const both = await Promise.all([call('post', '/play/exchange', undefined, { ticket }), call('post', '/play/exchange', undefined, { ticket })]);
    expect(both.map((r) => r.status).sort()).toEqual([200, 401]);
    const ok = both.find((r) => r.status === 200)!;
    game = ok.body.token;
    session = ok.body.session;
    expect(session.questions.filter((q: any) => !q.gateId.startsWith('hide'))).toHaveLength(11);
    expect(session.questions.filter((q: any) => q.gateId.startsWith('hide')).length).toBeGreaterThan(0);
    expect(gate('blackboard').id).toBe(ids.question);
    expect(JSON.stringify(session)).not.toMatch(/correctAnswer|explanation|Because|Think/);
    expect((await call('get', '/student/home', game)).status).toBe(401);
    expect((await call('get', '/play/session', tokens.lola)).status).toBe(401);
    const again = await call('post', '/game-sessions/launch', tokens.lola, { campaignId: ids.campaign });
    expect(again.body).toMatchObject({ resumed: true, sessionId: session.sessionId });
    expect((await call('get', `/game-results/${session.sessionId}/review`, tokens.lola)).body.error.code).toBe('SESSION_IN_PROGRESS');
  });

  it('gives one try per hiding question and never counts it towards the way out', async () => {
    const q = gate('hide1');
    expect(['TRUE_FALSE', 'MULTIPLE_CHOICE']).toContain(q.type);
    const wrong = await submit(q, q.type === 'TRUE_FALSE' ? false : 'y', 'req-hide-001');
    expect(wrong.body).toMatchObject({ correct: false, resolved: true, attemptsLeft: 0 });
    expect(wrong.body.explanation).toBeTruthy();
    expect((await submit(q, true, 'req-hide-002')).body.error.code).toBe('ALREADY_RESOLVED');
  });

  it('keeps the final paper closed and ignores a claimed escape', async () => {
    expect((await submit(gate('exam1'), answerOf(gate('exam1')), 'req-exam-early')).body.error.code).toBe('GATE_LOCKED');
  });

  it('grades on the server, is idempotent, and limits attempts', async () => {
    const q = gate('blackboard');
    const wrong = await submit(q, '5', 'req-board-1');
    expect(wrong.body).toMatchObject({ correct: false, resolved: false, attemptsLeft: 1, explanation: null });
    expect((await submit(q, '4', 'req-board-1')).body).toMatchObject({ correct: false, attemptsLeft: 1 });
    const right = await submit(q, '4', 'req-board-2');
    expect(right.body).toMatchObject({ correct: true, resolved: true, points: 6 });
    expect((await submit(q, '4', 'req-board-3')).body.error.code).toBe('ALREADY_RESOLVED');
    const used = gate('catalogue');
    const bad = used.type === 'TRUE_FALSE' ? false : 'y';
    await submit(used, bad, 'req-cat-0001');
    const last = await submit(used, bad, 'req-cat-0002');
    expect(last.body).toMatchObject({ correct: false, resolved: true, attemptsLeft: 0 });
    expect((await submit({ ...q, gateId: 'safe' }, '4', 'req-mismatch')).status).toBe(400);
    const parallel = await Promise.all(['p1p1p1p1', 'p2p2p2p2', 'p3p3p3p3'].map((r) => submit(gate('specimens'), answerOf(gate('specimens')), r)));
    expect(parallel.filter((r) => r.status === 200)).toHaveLength(1);
  });

  it('gives hints within the limit and reduces points', async () => {
    const q = gate('breakers');
    const hint = await call('post', '/play/hint', game, { questionId: q.id });
    expect(hint.body).toMatchObject({ hint: 'Think', hintsLeft: 2 });
    expect((await submit(q, answerOf(q), 'req-break-1')).body.points).toBe(8);
  });

  it('stores checkpoints and ignores late ones', async () => {
    expect((await call('put', '/play/checkpoint', game, { seq: 5, state: { x: 5 } })).body.saved).toBe(true);
    expect((await call('put', '/play/checkpoint', game, { seq: 3, state: { x: 3 } })).body.saved).toBe(false);
    const recovered = await call('get', '/play/session', game);
    expect(recovered.body.checkpoint).toEqual({ seq: 5, state: { x: 5 } });
    expect(recovered.body.progress.find((p: any) => p.gateId === 'blackboard')).toMatchObject({ correct: true, resolved: true });
    expect((await call('put', '/play/checkpoint', game, { seq: 9, state: { big: 'x'.repeat(20_000) } })).status).toBe(400);
  });

  it('completes once, computes the score itself and opens the review', async () => {
    for (const id of ['safe', 'typewriter', 'exam1', 'exam2', 'exam3']) await submit(gate(id), answerOf(gate(id)), `req-${id}-001`);
    const done = await call('post', '/play/complete', game, { requestId: 'finish-0001', outcome: 'ESCAPED', score: 99999, accuracy: 100 });
    expect(done.body).toMatchObject({ outcome: 'ESCAPED', correctAnswers: 8, incorrectAnswers: 2 });
    expect(done.body.mistakes).toHaveLength(2);
    expect(done.body.score).toBeLessThanOrEqual(done.body.maxScore);
    expect((await call('post', '/play/complete', game, { requestId: 'finish-0001', outcome: 'ESCAPED' })).body.score).toBe(done.body.score);
    expect((await call('post', '/play/complete', game, { requestId: 'finish-0002', outcome: 'ESCAPED' })).body.error.code).toBe('SESSION_FINISHED');
    expect((await submit(gate('locker'), true, 'req-too-late')).body.error.code).toBe('SESSION_FINISHED');
    expect(await prisma.gameResult.count({ where: { sessionId: session.sessionId } })).toBe(1);
    const row = await prisma.gameSession.findUniqueOrThrow({ where: { id: session.sessionId } });
    expect(row.flags).toContain('TOO_FAST');
    const review = await call('get', `/game-results/${session.sessionId}/review`, tokens.lola);
    expect(review.body.answers).toHaveLength(10);
    expect(review.body.flags).toEqual([]);
    expect((await call('get', `/game-results/${session.sessionId}/review`, tokens.guest)).status).toBe(404);
    expect((await call('get', `/game-results/${session.sessionId}/review`, tokens.b)).status).toBe(404);
    expect((await call('get', `/game-results/${session.sessionId}/review`, tokens.a)).body.flags).toContain('TOO_FAST');
  });

  it('downgrades an escape the server never saw', async () => {
    const launch = await call('post', '/game-sessions/launch', tokens.lola, { campaignId: ids.campaign });
    const { body } = await call('post', '/play/exchange', undefined, { ticket: launch.body.launchUrl.split('#ticket=')[1] });
    const done = await call('post', '/play/complete', body.token, { requestId: 'cheat-00001', outcome: 'ESCAPED' });
    expect(done.body.outcome).toBe('LEFT');
    expect((await prisma.gameSession.findUniqueOrThrow({ where: { id: body.session.sessionId } })).flags).toContain('OUTCOME_REJECTED');
  });

  it('closes expired sessions without losing their answers', async () => {
    const launch = await call('post', '/game-sessions/launch', tokens.lola, { campaignId: ids.campaign });
    const { body } = await call('post', '/play/exchange', undefined, { ticket: launch.body.launchUrl.split('#ticket=')[1] });
    const q = body.session.questions.find((x: any) => x.gateId === 'blackboard');
    await call('post', '/play/answers', body.token, { gateId: 'blackboard', questionId: q.id, answer: '4', requestId: 'req-exp-0001', elapsedMs: 4000 });
    await prisma.gameSession.update({ where: { id: body.session.sessionId }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await call('put', '/play/checkpoint', body.token, { seq: 1, state: {} })).body.error.code).toBe('SESSION_EXPIRED');
    await call('get', '/student/home', tokens.lola);
    expect(await prisma.gameResult.findUnique({ where: { sessionId: body.session.sessionId } })).toMatchObject({ completionStatus: 'ABANDONED', correctAnswers: 1 });
  });

  it('shows the results to the right center only', async () => {
    const own = await call('get', '/game-results/organization', tokens.a);
    expect(own.body.total).toBe(3);
    expect((await call('get', '/game-results/organization', tokens.b)).body.total).toBe(0);
    const analytics = await call('get', '/analytics/organization', tokens.a);
    expect(analytics.body.sessions).toMatchObject({ total: 3, completed: 1 });
    expect(analytics.body.mistakes.length).toBeGreaterThan(0);
    expect((await call('get', '/student/progress', tokens.lola)).body.completed).toBe(1);
    expect((await call('get', '/student/progress', tokens.guest)).body.sessions).toBe(0);
  });

  it('blocks play when the subscription ends or the game is closed', async () => {
    await prisma.organization.update({ where: { id: ids.a }, data: { subscriptionEndsAt: new Date(Date.now() - 1000) } });
    expect((await call('post', '/game-sessions/launch', tokens.lola, { campaignId: ids.campaign })).body.error.code).toBe('SUBSCRIPTION_ENDED');
    await prisma.organization.update({ where: { id: ids.a }, data: { subscriptionEndsAt: null } });
    await call('put', '/admin/settings', tokens.root, { gameEnabled: false, maintenanceMessage: 'Back at noon' });
    expect((await call('post', '/game-sessions/launch', tokens.lola, { campaignId: ids.campaign })).body.error).toMatchObject({ code: 'GAME_DISABLED', message: 'Back at noon' });
    await call('put', '/admin/settings', tokens.root, {});
  });
});

describe('teachers', () => {
  it('are created by the center, sign in, and reach nothing but rooms', async () => {
    const created = await call('post', '/center/teachers', tokens.a, { email: 'teacher@test.dev', firstName: 'Nodira', lastName: 'Y', role: 'SUPER_ADMIN' });
    expect(created.status).toBe(201);
    ids.teacher = created.body.teacher.id;
    const signIn = await call('post', '/auth/login', undefined, { email: 'teacher@test.dev', password: created.body.initialPassword });
    tokens.teacher = signIn.body.accessToken;
    expect((await call('get', '/auth/me', tokens.teacher)).body).toMatchObject({ role: 'TEACHER', organizations: [{ id: ids.a }] });
    for (const path of ['/center/dashboard', '/center/students', '/center/teachers', '/admin/overview', '/student/home', '/questions', '/game-results/organization', '/users/admins']) expect([403, 404]).toContain((await call('get', path, tokens.teacher)).status);
    expect((await call('get', `/lobbies?organizationId=${ids.b}`, tokens.teacher)).status).toBe(403);
  });

  it('belong to one center and can be suspended by it only', async () => {
    expect((await call('get', '/center/teachers', tokens.b)).body).toEqual([]);
    expect((await call('patch', `/center/teachers/${ids.teacher}`, tokens.b, { status: 'SUSPENDED' })).status).toBe(404);
    expect((await call('post', `/center/teachers/${ids.teacher}/password`, tokens.b)).status).toBe(404);
    await call('patch', `/center/teachers/${ids.teacher}`, tokens.a, { status: 'SUSPENDED' });
    expect((await call('get', '/lobbies', tokens.teacher)).status).toBe(401);
    await call('patch', `/center/teachers/${ids.teacher}`, tokens.a, { status: 'ACTIVE' });
    expect((await call('get', '/lobbies', tokens.teacher)).status).toBe(200);
  });
});

describe('rooms', () => {
  let room: any;
  const players: Record<string, { room: string; game: string; session: any }> = {};
  const join = (nickname: string, code = room.code) => call('post', '/room/join', undefined, { code, nickname });
  const sync = (name: string, body: object = {}) => call('post', '/play/lobby', players[name].game, { x: 100, y: 120, dir: 'left', moving: true, hidden: false, ...body });
  const solve = async (name: string) => {
    for (const q of players[name].session.questions.filter((x: any) => !x.gateId.startsWith('hide'))) {
      const answer = q.type === 'TRUE_FALSE' ? true : q.type === 'TEXT' ? '4' : 'x';
      await call('post', '/play/answers', players[name].game, { gateId: q.gateId, questionId: q.id, answer, requestId: `room-${name}-${q.gateId}`, elapsedMs: 5000 });
    }
  };

  it('open with a six-digit code and fill up with guests and students', async () => {
    expect((await call('post', '/lobbies', tokens.lola, { campaignId: ids.campaign })).status).toBe(403);
    const choices = await call('get', '/lobbies/campaigns', tokens.teacher);
    expect(choices.body.map((c: any) => c.id)).toContain(ids.campaign);
    room = (await call('post', '/lobbies', tokens.teacher, { campaignId: ids.campaign, maxPlayers: 3 })).body;
    expect(room).toMatchObject({ status: 'WAITING', standings: [] });
    expect(room.code).toMatch(/^\d{6}$/);
    expect((await call('post', `/lobbies/${room.id}/start`, tokens.teacher)).body.error.code).toBe('LOBBY_EMPTY');
    const before = await prisma.membership.count();
    const ali = await join('Ali', room.code.replace(/(\d{3})/, '$1 '));
    const twin = await join('ali');
    expect(ali.body.nickname).toBe('Ali');
    expect(twin.body.nickname).toBe('ali 2');
    const lola = await call('post', '/room/join-as-student', tokens.lola, { code: room.code, nickname: 'Lola' });
    expect(lola.status).toBe(200);
    expect((await call('post', '/room/join-as-student', tokens.lola, { code: room.code, nickname: 'Again' })).body.playerId).toBe(lola.body.playerId);
    expect((await join('Late')).body.error.code).toBe('LOBBY_FULL');
    expect(await prisma.membership.count()).toBe(before);
    for (const [name, r] of Object.entries({ ali, twin, lola })) players[name] = { room: r.body.token, game: '', session: null };
  });

  it('refuse wrong codes, bad names, foreign tokens and other hosts', async () => {
    expect((await join('Zed', '000000')).body.error.code).toBe('LOBBY_NOT_FOUND');
    expect((await join('<b>x</b>')).body.error.code).toBe('VALIDATION_FAILED');
    expect((await call('get', '/room', tokens.lola)).status).toBe(401);
    expect((await call('get', '/student/home', players.ali.room)).status).toBe(401);
    expect((await call('get', '/play/session', players.ali.room)).status).toBe(401);
    expect((await call('get', `/lobbies/${room.id}`, tokens.b)).status).toBe(404);
    expect((await call('post', `/lobbies/${room.id}/end`, tokens.b)).status).toBe(404);
    expect((await call('post', '/lobbies', tokens.b, { campaignId: ids.campaign })).body.error.code).toBe('CAMPAIGN_UNAVAILABLE');
    expect((await call('post', '/room/launch', players.ali.room)).body.error.code).toBe('LOBBY_NOT_RUNNING');
  });

  it('start once and give everybody the same questions', async () => {
    const both = await Promise.all([call('post', `/lobbies/${room.id}/start`, tokens.teacher), call('post', `/lobbies/${room.id}/start`, tokens.teacher)]);
    expect(both.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await prisma.gameSession.count({ where: { lobbyId: room.id } })).toBe(3);
    expect((await join('Late')).body.error.code).toBe('LOBBY_STARTED');
    for (const p of Object.values(players)) {
      expect((await call('get', '/room', p.room)).body.status).toBe('RUNNING');
      const { launchUrl } = (await call('post', '/room/launch', p.room)).body;
      const { body } = await call('post', '/play/exchange', undefined, { ticket: launchUrl.split('#ticket=')[1] });
      p.game = body.token;
      p.session = body.session;
    }
    const order = (n: string) => players[n].session.questions.map((q: any) => q.id);
    expect(order('ali')).toEqual(order('lola'));
    expect(players.ali.session.lobby).toMatchObject({ id: room.id, nickname: 'Ali' });
    // A room never blocks or replaces the student's own game.
    expect((await call('post', '/game-sessions/launch', tokens.lola, { campaignId: ids.campaign })).body.sessionId).not.toBe(players.lola.session.sessionId);
  });

  it('show the others on the map and pass on phrases from the fixed list only', async () => {
    await sync('ali', { x: 321, y: 222, phrase: 'follow' });
    const seen = (await sync('lola')).body;
    expect(seen).toMatchObject({ status: 'RUNNING', steps: 9 });
    expect(seen.peers).toHaveLength(2);
    const peer = seen.peers.find((p: any) => p.nickname === 'Ali');
    expect(peer).toMatchObject({ x: 321, y: 222, phrase: 'follow', moving: true });
    await sync('ali', { phrase: 'well' });
    expect((await sync('lola')).body.peers.find((p: any) => p.nickname === 'Ali').phrase).toBe('follow');
    expect((await sync('ali', { phrase: 'rude words' })).status).toBe(400);
    expect((await sync('ali', { x: -5 })).status).toBe(400);
    expect((await call('post', '/play/lobby', players.ali.room, {})).status).toBe(401);
  });

  it('do not lock a class out for late joins', async () => {
    for (let i = 0; i < 45; i += 1) await join(`Late ${i}`);
    expect((await join('Late', '000000')).body.error.code).toBe('LOBBY_NOT_FOUND');
  });

  it('rank by time on the server clock and close when everybody is done', async () => {
    await solve('lola');
    expect((await sync('ali')).body.standings.find((s: any) => s.nickname === 'Lola').progress).toBe(9);
    const done = await call('post', '/play/complete', players.lola.game, { requestId: 'room-done-lola', outcome: 'ESCAPED' });
    expect(done.body.outcome).toBe('ESCAPED');
    // Answers stay hidden from the first one out while the others are still playing.
    expect((await call('get', `/game-results/${players.lola.session.sessionId}/review`, tokens.lola)).status).toBe(409);
    await solve('ali');
    await call('post', '/play/complete', players.ali.game, { requestId: 'room-done-ali', outcome: 'ESCAPED' });
    expect((await call('get', `/lobbies/${room.id}`, tokens.teacher)).body.status).toBe('RUNNING');
    const cheat = await call('post', '/play/complete', players.twin.game, { requestId: 'room-done-twin', outcome: 'ESCAPED' });
    expect(cheat.body.outcome).toBe('LEFT');
    const { body } = await call('get', `/lobbies/${room.id}`, tokens.teacher);
    expect(body.status).toBe('FINISHED');
    expect(body.standings.map((s: any) => [s.place, s.nickname])).toEqual([[1, 'Lola'], [2, 'Ali'], [3, 'ali 2']]);
    expect(body.standings[0].durationMs).toBeLessThan(body.standings[1].durationMs);
    expect((await call('get', `/game-results/${players.lola.session.sessionId}/review`, tokens.lola)).status).toBe(200);
    expect((await call('get', '/play/lobby', players.ali.game)).body.standings).toHaveLength(3);
  });

  it('keep guests out of student lists', async () => {
    const perDay = (await call('get', '/analytics/organization', tokens.a)).body.perDay.reduce((n: number, d: any) => n + d.started, 0);
    expect((await call('get', '/analytics/organization', tokens.a)).body.sessions.total).toBe(perDay);
    const results = (await call('get', '/game-results/organization', tokens.a)).body.items;
    expect(results.some((r: any) => r.user.firstName === 'Ali')).toBe(false);
    const students = (await call('get', '/center/students', tokens.a)).body.items;
    expect(students.some((s: any) => s.firstName === 'Ali')).toBe(false);
  });

  it('let the host remove a player and end the game early', async () => {
    const next = (await call('post', '/lobbies', tokens.teacher, { campaignId: ids.campaign })).body;
    const one = (await join('One', next.code)).body;
    const two = (await join('Two', next.code)).body;
    await call('delete', `/lobbies/${next.id}/players/${two.playerId}`, tokens.teacher);
    expect((await call('get', '/room', two.token)).body.error.code).toBe('LOBBY_REMOVED');
    expect((await join('Two', next.code)).body.nickname).toBe('Two');
    await call('post', `/lobbies/${next.id}/start`, tokens.teacher);
    expect((await call('delete', `/lobbies/${next.id}`, tokens.teacher)).status).toBe(409);
    const ended = await call('post', `/lobbies/${next.id}/end`, tokens.teacher);
    expect(ended.body.status).toBe('FINISHED');
    expect(ended.body.standings.every((s: any) => s.outcome === 'TIMEOUT')).toBe(true);
    expect((await call('post', '/room/launch', one.token)).status).toBe(409);
    const guest = (await prisma.lobbyPlayer.findUniqueOrThrow({ where: { id: one.playerId } })).userId;
    expect((await call('delete', `/lobbies/${next.id}`, tokens.teacher)).status).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: guest } })).toBeNull();
  });
});

describe('profile ownership', () => {
  it('lets no foreign center or access code take a student’s account over', async () => {
    const student = (await call('post', '/center/students', tokens.a, { firstName: 'Shared', lastName: 'S' })).body.students[0];
    await prisma.membership.create({ data: { userId: student.id, organizationId: ids.b } });
    const { code } = (await call('post', `/center/students/${student.id}/code`, tokens.b)).body;
    const steal = { email: 'thief@test.dev', password: PASSWORD, firstName: 'T', lastName: 'T', invitationCode: code };
    expect((await call('post', '/auth/register', undefined, steal)).body.error.code).toBe('ACCESS_DISABLED');
    const token = (await call('post', '/auth/code', undefined, { code })).body.accessToken;
    expect((await call('post', '/auth/google/link', token, { credential: credential('g-9', 'thief@test.dev'), password: 'any' })).status).toBe(400);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: student.id } })).googleSub).toBeNull();
  });

  it('does not reveal registered e-mails to a made-up code', async () => {
    const body = { email: 'a@test.dev', password: PASSWORD, firstName: 'T', lastName: 'T', invitationCode: 'LL-NOPE-NOPE' };
    expect((await call('post', '/auth/register', undefined, body)).body.error.code).toBe('CODE_INVALID');
  });
});

describe('google sign-in', () => {
  const signIn = (body: object) => call('post', '/auth/google', undefined, body);

  it('never takes over an existing account by e-mail', async () => {
    expect((await signIn({ credential: 'x'.repeat(120) })).status).toBe(401);
    expect((await signIn({ credential: credential('g-1', 'a@test.dev') })).body.error.code).toBe('GOOGLE_LINK_REQUIRED');
  });

  it('links from the settings, signs in, and unlinks only when a password remains', async () => {
    expect((await call('post', '/auth/google/link', tokens.a, { credential: credential('g-1', 'a@test.dev'), password: 'wrong' })).status).toBe(400);
    expect((await call('post', '/auth/google/link', tokens.a, { credential: credential('g-1', 'a@test.dev'), password: PASSWORD })).body).toEqual({ google: true });
    expect((await call('post', '/auth/google/link', tokens.b, { credential: credential('g-1', 'a@test.dev'), password: PASSWORD })).status).toBe(409);
    const r = await signIn({ credential: credential('g-1', 'a@test.dev') });
    expect((await call('get', '/auth/me', r.body.accessToken)).body).toMatchObject({ email: 'a@test.dev', signIn: { google: true, password: true } });
    expect((await call('delete', '/auth/google/link', tokens.a)).body).toEqual({ google: false });
  });

  it('asks a new person for a code or a center name and then creates the account', async () => {
    const who = credential('g-2', 'gulnora@test.dev');
    expect((await signIn({ credential: who })).body).toMatchObject({ needsProfile: true, email: 'gulnora@test.dev' });
    expect(await prisma.user.findUnique({ where: { email: 'gulnora@test.dev' } })).toBeNull();
    expect((await signIn({ credential: who, invitationCode: 'LL-NOPE-NOPE' })).body.error.code).toBe('CODE_INVALID');
    const created = await signIn({ credential: who, centerName: 'Google Center', locale: 'uz' });
    const me = (await call('get', '/auth/me', created.body.accessToken)).body;
    expect(me).toMatchObject({ role: 'CENTER_ADMIN', locale: 'uz', signIn: { google: true, password: false } });
    expect((await call('delete', '/auth/google/link', created.body.accessToken)).status).toBe(409);
  });
});
