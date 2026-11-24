/**
 * Plays the official campaign through the real API as the seeded demo students, so dashboards have
 * something to show. Every record is produced by the normal game endpoints; only start dates are
 * spread over the last weeks. Development only.
 *
 *   node scripts/demo-activity.mjs            (API must be running)
 */
import { createHmac } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

process.loadEnvFile('.env');
if (process.env.NODE_ENV === 'production') throw new Error('Demo activity is disabled in production');
const API = `${process.env.API_URL ?? 'http://localhost:3000'}/api/v1`;
const prisma = new PrismaClient();
const post = async (path, body, token) => {
  const res = await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new Error(`${path}: ${json.error?.message}`);
  return json;
};
const org = await prisma.organization.findUniqueOrThrow({ where: { slug: 'demo-academy' } });
const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@lastlesson.dev' } });
const campaign = await prisma.campaign.findFirstOrThrow({ where: { organizationId: null, title: 'The Last Lesson' } });
const students = await prisma.user.findMany({ where: { homeOrganizationId: org.id, lastName: { in: ['Student', 'Yusupova', 'Rahimov', 'Aliyeva', 'Tursunov'] } } });
const skill = { Sam: 0.82, Malika: 0.93, Jasur: 0.58, Nilufar: 0.74, Bekzod: 0.66 };
const hash = (c) => createHmac('sha256', process.env.CODE_PEPPER).update(c.replace(/[^A-Z0-9]/g, '')).digest('hex');
let n = 0;
for (const student of students) {
  const code = `LL-BOT${n}-${Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, 'X')}`;
  const row = await prisma.invitationCode.create({ data: { codeHash: hash(code), hint: 'demo', kind: 'PERSONAL', organizationId: org.id, studentId: student.id, createdById: admin.id, expiresAt: new Date(Date.now() + 3_600_000), maxUses: 100 } });
  const { accessToken } = await post('/auth/code', { code });
  for (let game = 0; game < 5; game += 1) {
    const { launchUrl, sessionId } = await post('/game-sessions/launch', { campaignId: campaign.id }, accessToken);
    const { token, session } = await post('/play/exchange', { ticket: launchUrl.split('#ticket=')[1] });
    const bank = new Map((await prisma.question.findMany({ where: { id: { in: session.questions.map((q) => q.id) } } })).map((q) => [q.id, q]));
    const leaves = Math.random() < 0.14;
    for (const q of leaves ? session.questions.slice(0, 3) : session.questions) {
      const { correctAnswer, difficulty } = bank.get(q.id);
      const good = q.type === 'TEXT' ? correctAnswer[0] : correctAnswer;
      const chance = skill[student.firstName] + game * 0.03 - (difficulty === 'HARD' ? 0.18 : difficulty === 'EASY' ? -0.08 : 0);
      for (let t = 0; t < 2; t += 1) {
        const r = await post('/play/answers', { gateId: q.gateId, questionId: q.id, answer: Math.random() < chance ? good : null, requestId: `demo-${sessionId.slice(0, 8)}-${q.gateId}-${t}`, elapsedMs: 6000 + Math.floor(Math.random() * 20000) }, token);
        if (r.resolved) break;
      }
    }
    await post('/play/complete', { requestId: `demo-${sessionId}`, outcome: leaves ? 'LEFT' : Math.random() < 0.2 ? 'DISMISSED' : 'ESCAPED', stats: { pages: 0, caught: 0 } }, token);
    const at = new Date(Date.now() - (24 - game * 5 - Math.random() * 4) * 86_400_000);
    const seconds = leaves ? 90 + Math.floor(Math.random() * 120) : 420 + Math.floor(Math.random() * 420);
    const dates = { startedAt: at, endedAt: new Date(at.getTime() + seconds * 1000), durationSeconds: seconds, flags: [] };
    await prisma.gameSession.update({ where: { id: sessionId }, data: dates });
    await prisma.gameResult.update({ where: { sessionId }, data: { createdAt: dates.endedAt, durationSeconds: seconds, flags: [] } });
    n += 1;
  }
  await prisma.invitationCode.delete({ where: { id: row.id } });
}
await prisma.auditLog.deleteMany({ where: { action: 'GAME_RESULT_FLAGGED', organizationId: org.id } });
console.log(`Played ${n} demo sessions for ${students.length} students.`);
await prisma.$disconnect();
