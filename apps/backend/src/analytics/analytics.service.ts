import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';

interface TopicRow {
  topic: string;
  subject: string;
  answered: number;
  correct: number;
}
/** Guests of a room belong to no center, so they never count as its students. */
const NOT_GUEST = Prisma.sql`NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = s."userId" AND u."isGuest")`;
const round = (n: number | null | undefined) => Math.round((n ?? 0) * 10) / 10;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/** Aggregations run in SQL so the cost does not grow with the number of rows sent to Node. */
@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async platform() {
    const since = new Date(Date.now() - 29 * 86_400_000);
    const weekAgo = new Date(Date.now() - 7 * 86_400_000);
    const [centers, students, sessions, outcomes, aggregate, questions, campaigns, perDay, top, activeStudents, flagged] = await Promise.all([
      this.prisma.organization.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.membership.count({ where: { status: 'ACTIVE' } }),
      this.prisma.gameSession.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.gameResult.groupBy({ by: ['outcome'], _count: { id: true } }),
      this.prisma.gameResult.aggregate({ _avg: { accuracy: true, durationSeconds: true } }),
      this.prisma.question.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.campaign.count({ where: { status: 'PUBLISHED' } }),
      this.sessionsPerDay(Prisma.sql`s."startedAt" >= ${since}`),
      this.prisma.gameSession.groupBy({ by: ['organizationId'], where: { startedAt: { gte: since }, organizationId: { not: null } }, _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 5 }),
      this.prisma.gameSession.findMany({ where: { startedAt: { gte: weekAgo }, user: { isGuest: false } }, distinct: ['userId'], select: { userId: true } }),
      this.prisma.gameSession.count({ where: { NOT: { flags: { isEmpty: true } }, startedAt: { gte: since } } }),
    ]);
    const names = new Map((await this.prisma.organization.findMany({ where: { id: { in: top.map((t) => t.organizationId!) } }, select: { id: true, name: true } })).map((o) => [o.id, o.name]));
    const by = <T extends string>(rows: Array<{ _count: { id: number } } & Record<T, unknown>>, key: T) => Object.fromEntries(rows.map((r) => [String(r[key]), r._count.id]));
    return {
      centers: { total: centers.reduce((s, c) => s + c._count.id, 0), ...by(centers, 'status') },
      students,
      activeStudents7d: activeStudents.length,
      sessions: { total: sessions.reduce((s, c) => s + c._count.id, 0), ...by(sessions, 'status') },
      outcomes: by(outcomes, 'outcome'),
      averageAccuracy: round(aggregate._avg.accuracy),
      averageDurationSeconds: Math.round(aggregate._avg.durationSeconds ?? 0),
      publishedQuestions: questions,
      publishedCampaigns: campaigns,
      flaggedSessions30d: flagged,
      sessionsPerDay: this.fillDays(perDay, 30),
      topCenters: top.map((t) => ({ id: t.organizationId, name: names.get(t.organizationId!) ?? '', sessions: t._count.id })),
    };
  }

  /** Education centers side by side. Rooms with guests count as games, guests never as students. */
  async centers() {
    return this.prisma.$queryRaw<Array<{ id: string; name: string; city: string | null; status: string; students: number; active: number; sessions: number; completed: number; accuracy: number | null; seconds: number | null; levels: number }>>`
      SELECT o.id, o.name, o.city, o.status::text AS status,
        (SELECT count(*) FROM "Membership" m WHERE m."organizationId" = o.id AND m.status = 'ACTIVE')::int AS students,
        count(DISTINCT s."userId") FILTER (WHERE s."startedAt" > now() - interval '7 days' AND ${NOT_GUEST})::int AS active,
        count(s.id)::int AS sessions,
        count(s.id) FILTER (WHERE s.status = 'COMPLETED')::int AS completed,
        round(avg(s.accuracy) FILTER (WHERE s.status = 'COMPLETED'))::int AS accuracy,
        round(avg(s."durationSeconds") FILTER (WHERE s.status = 'COMPLETED'))::int AS seconds,
        count(DISTINCT s."campaignId") FILTER (WHERE s.status = 'COMPLETED' AND c.config #>> '{level,number}' IS NOT NULL)::int AS levels
      FROM "Organization" o
      LEFT JOIN "GameSession" s ON s."organizationId" = o.id
      LEFT JOIN "Campaign" c ON c.id = s."campaignId"
      GROUP BY o.id ORDER BY accuracy DESC NULLS LAST, completed DESC LIMIT 100`;
  }

  async organization(organizationId: string, filter: { groupId?: string; days: number }) {
    const since = new Date(Date.now() - (filter.days - 1) * 86_400_000);
    const where: Prisma.GameSessionWhereInput = { organizationId, user: { isGuest: false }, startedAt: { gte: since }, ...(filter.groupId ? { groupId: filter.groupId } : {}) };
    const scope = filter.groupId ? Prisma.sql`s."organizationId" = ${organizationId}::uuid AND s."startedAt" >= ${since} AND ${NOT_GUEST} AND s."groupId" = ${filter.groupId}::uuid` : Prisma.sql`s."organizationId" = ${organizationId}::uuid AND s."startedAt" >= ${since} AND ${NOT_GUEST}`;
    const [statuses, aggregate, perDay, topics, mistakes, groups, campaigns, students] = await Promise.all([
      this.prisma.gameSession.groupBy({ by: ['status'], where, _count: { id: true } }),
      this.prisma.gameSession.aggregate({ where: { ...where, status: 'COMPLETED' }, _avg: { accuracy: true, durationSeconds: true, score: true } }),
      this.sessionsPerDay(scope),
      this.topics(scope),
      this.mistakes(scope),
      this.prisma.gameSession.groupBy({ by: ['groupId'], where: { organizationId, user: { isGuest: false }, startedAt: { gte: since }, status: 'COMPLETED' }, _avg: { accuracy: true, durationSeconds: true }, _count: { id: true } }),
      this.prisma.gameSession.groupBy({ by: ['campaignId', 'status'], where, _avg: { accuracy: true }, _count: { id: true } }),
      this.prisma.gameSession.groupBy({ by: ['userId'], where: { ...where, status: 'COMPLETED' }, _avg: { accuracy: true }, _max: { score: true }, _sum: { durationSeconds: true }, _count: { id: true }, orderBy: { _avg: { accuracy: 'desc' } }, take: 100 }),
    ]);
    const [groupNames, campaignNames, users] = await Promise.all([
      this.prisma.group.findMany({ where: { organizationId }, select: { id: true, name: true, _count: { select: { memberships: { where: { status: 'ACTIVE' } } } } } }),
      this.prisma.campaign.findMany({ where: { id: { in: [...new Set(campaigns.map((c) => c.campaignId).filter((id): id is string => Boolean(id)))] } }, select: { id: true, title: true } }),
      this.prisma.user.findMany({ where: { id: { in: students.map((s) => s.userId) } }, select: { id: true, firstName: true, lastName: true } }),
    ]);
    const total = statuses.reduce((s, r) => s + r._count.id, 0);
    const completed = statuses.find((s) => s.status === 'COMPLETED')?._count.id ?? 0;
    const campaignRows = new Map<string, { id: string; title: string; started: number; completed: number; accuracy: number }>();
    for (const c of campaigns) {
      const id = c.campaignId ?? '';
      const row = campaignRows.get(id) ?? { id, title: campaignNames.find((n) => n.id === id)?.title ?? 'Removed campaign', started: 0, completed: 0, accuracy: 0 };
      row.started += c._count.id;
      if (c.status === 'COMPLETED') Object.assign(row, { completed: c._count.id, accuracy: round(c._avg.accuracy) });
      campaignRows.set(id, row);
    }
    return {
      days: filter.days,
      sessions: { total, completed, abandoned: statuses.find((s) => s.status === 'ABANDONED')?._count.id ?? 0, inProgress: statuses.find((s) => s.status === 'IN_PROGRESS')?._count.id ?? 0 },
      completionRate: total ? Math.round((completed / total) * 100) : null,
      averageAccuracy: completed ? round(aggregate._avg.accuracy) : null,
      averageDurationSeconds: completed ? Math.round(aggregate._avg.durationSeconds ?? 0) : null,
      perDay: this.fillDays(perDay, filter.days),
      topics,
      weakTopics: topics.filter((t) => t.answered >= 2 && t.accuracy < 70).sort((a, b) => a.accuracy - b.accuracy).slice(0, 8),
      mistakes,
      groups: groupNames.map((g) => {
        const row = groups.find((r) => r.groupId === g.id);
        return { id: g.id, name: g.name, students: g._count.memberships, completed: row?._count.id ?? 0, accuracy: row ? round(row._avg.accuracy) : null, averageDurationSeconds: Math.round(row?._avg.durationSeconds ?? 0) };
      }),
      campaigns: [...campaignRows.values()].sort((a, b) => b.started - a.started),
      students: students.map((s) => {
        const u = users.find((x) => x.id === s.userId);
        return { id: s.userId, name: `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim(), completed: s._count.id, accuracy: round(s._avg.accuracy), bestScore: s._max.score ?? 0, timeSeconds: s._sum.durationSeconds ?? 0 };
      }),
    };
  }

  async student(userId: string, organizationId?: string) {
    const org = organizationId ? { organizationId } : {};
    const scope = organizationId ? Prisma.sql`s."userId" = ${userId}::uuid AND s."organizationId" = ${organizationId}::uuid` : Prisma.sql`s."userId" = ${userId}::uuid`;
    const [sessions, topics] = await Promise.all([
      this.prisma.gameSession.findMany({
        where: { userId, ...org, status: { not: 'IN_PROGRESS' } },
        orderBy: { startedAt: 'asc' },
        take: 200,
        select: { id: true, startedAt: true, accuracy: true, score: true, maxScore: true, durationSeconds: true, outcome: true, status: true, campaign: { select: { title: true } } },
      }),
      this.topics(scope),
    ]);
    const done = sessions.filter((s) => s.status === 'COMPLETED');
    return {
      sessions: sessions.length,
      completed: done.length,
      averageAccuracy: done.length ? Math.round(done.reduce((s, r) => s + r.accuracy, 0) / done.length) : null,
      timeSeconds: sessions.reduce((s, r) => s + r.durationSeconds, 0),
      bestScore: done.length ? Math.max(...done.map((d) => d.score)) : null,
      topics,
      weakTopics: topics.filter((t) => t.accuracy < 70).sort((a, b) => a.accuracy - b.accuracy).slice(0, 6),
      timeline: sessions.map((s) => ({ id: s.id, date: s.startedAt, accuracy: s.accuracy, score: s.score, maxScore: s.maxScore, outcome: s.outcome, campaign: s.campaign?.title ?? '', durationSeconds: s.durationSeconds })),
    };
  }

  private async topics(scope: Prisma.Sql) {
    const rows = await this.prisma.$queryRaw<TopicRow[]>`
      SELECT COALESCE(t.name, sub.name) AS topic, sub.name AS subject, COUNT(*)::int AS answered, SUM(CASE WHEN a."isCorrect" THEN 1 ELSE 0 END)::int AS correct
      FROM "GameAnswer" a
      JOIN "GameSession" s ON s.id = a."sessionId"
      JOIN "Question" q ON q.id = a."questionId"
      JOIN "Subject" sub ON sub.id = q."subjectId"
      LEFT JOIN "Topic" t ON t.id = q."topicId"
      WHERE ${scope}
      GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 60`;
    return rows.map((r) => ({ ...r, accuracy: Math.round((r.correct / r.answered) * 100) }));
  }

  private async mistakes(scope: Prisma.Sql) {
    return this.prisma.$queryRaw<Array<{ id: string; prompt: string; topic: string | null; answered: number; wrong: number }>>`
      SELECT q.id, q.prompt, t.name AS topic, COUNT(*)::int AS answered, SUM(CASE WHEN a."isCorrect" THEN 0 ELSE 1 END)::int AS wrong
      FROM "GameAnswer" a
      JOIN "GameSession" s ON s.id = a."sessionId"
      JOIN "Question" q ON q.id = a."questionId"
      LEFT JOIN "Topic" t ON t.id = q."topicId"
      WHERE ${scope}
      GROUP BY q.id, q.prompt, t.name
      HAVING SUM(CASE WHEN a."isCorrect" THEN 0 ELSE 1 END) > 0
      ORDER BY wrong DESC, answered ASC LIMIT 8`;
  }

  private sessionsPerDay(where: Prisma.Sql) {
    return this.prisma.$queryRaw<Array<{ day: Date; started: number; completed: number }>>`
      SELECT date_trunc('day', s."startedAt") AS day, COUNT(*)::int AS started, SUM(CASE WHEN s.status = 'COMPLETED' THEN 1 ELSE 0 END)::int AS completed
      FROM "GameSession" s WHERE ${where} GROUP BY 1 ORDER BY 1`;
  }

  private fillDays(rows: Array<{ day: Date; started: number; completed: number }>, days: number) {
    const map = new Map(rows.map((r) => [dayKey(new Date(r.day)), r]));
    return Array.from({ length: days }, (_, i) => {
      const day = dayKey(new Date(Date.now() - (days - 1 - i) * 86_400_000));
      return { day, started: map.get(day)?.started ?? 0, completed: map.get(day)?.completed ?? 0 };
    });
  }
}
