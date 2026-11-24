import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@last-lesson/shared-types';
import { PrismaService } from '../common/prisma.service';

type Actor = { id: string; role: Role; organizationIds: string[] };

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async platform() {
    const [users, orgs, sessions, results, subjects] = await Promise.all([
      this.prisma.user.groupBy({ by: ['role'], _count: { id: true } }),
      this.prisma.organization.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.gameSession.count(),
      this.prisma.gameResult.aggregate({ _avg: { accuracy: true }, _sum: { score: true } }),
      this.prisma.subject.count({ where: { isActive: true } }),
    ]);
    return {
      usersByRole: users.map((u) => ({ role: u.role, count: u._count.id })),
      organizationsByStatus: orgs.map((o) => ({ status: o.status, count: o._count.id })),
      totalSessions: sessions,
      averageAccuracy: Math.round((results._avg.accuracy ?? 0) * 10) / 10,
      totalScore: results._sum.score ?? 0,
      activeSubjects: subjects,
    };
  }

  async organization(actor: Actor, organizationId?: string) {
    const ids = actor.role === Role.SUPER_ADMIN ? (organizationId ? [organizationId] : []) : actor.organizationIds;
    if (ids.length === 0) throw new ForbiddenException();
    const [students, results, bySubject, recent] = await Promise.all([
      this.prisma.membership.count({ where: { organizationId: { in: ids } } }),
      this.prisma.gameResult.findMany({ where: { organizationId: { in: ids } }, include: { subject: true }, take: 500 }),
      this.prisma.gameResult.groupBy({
        by: ['subjectId'],
        where: { organizationId: { in: ids } },
        _avg: { accuracy: true },
        _count: { id: true },
      }),
      this.prisma.gameResult.findMany({
        where: { organizationId: { in: ids } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { select: { firstName: true, lastName: true } }, subject: { select: { name: true } } },
      }),
    ]);
    const subjectNames = new Map(
      (await this.prisma.subject.findMany({ select: { id: true, name: true } })).map((s) => [s.id, s.name]),
    );
    return {
      students,
      completedSessions: results.length,
      averageAccuracy: results.length
        ? Math.round((results.reduce((s, r) => s + r.accuracy, 0) / results.length) * 10) / 10
        : 0,
      subjectPerformance: bySubject.map((s) => ({
        subjectId: s.subjectId,
        subject: subjectNames.get(s.subjectId) ?? 'Unknown',
        averageAccuracy: Math.round((s._avg.accuracy ?? 0) * 10) / 10,
        sessions: s._count.id,
      })),
      improvementTopics: this.topTopics(results.flatMap((r) => r.topicsNeedImprovement)),
      recent,
    };
  }

  async personal(userId: string) {
    const [results, sessions] = await Promise.all([
      this.prisma.gameResult.findMany({ where: { userId }, include: { subject: true }, orderBy: { createdAt: 'desc' }, take: 100 }),
      this.prisma.gameSession.count({ where: { userId } }),
    ]);
    const bySubject = new Map<string, { name: string; total: number; count: number }>();
    for (const r of results) {
      const current = bySubject.get(r.subjectId) ?? { name: r.subject.name, total: 0, count: 0 };
      current.total += r.accuracy;
      current.count += 1;
      bySubject.set(r.subjectId, current);
    }
    return {
      totalSessions: sessions,
      completedSessions: results.length,
      averageAccuracy: results.length
        ? Math.round((results.reduce((s, r) => s + r.accuracy, 0) / results.length) * 10) / 10
        : 0,
      totalScore: results.reduce((s, r) => s + r.score, 0),
      subjectPerformance: [...bySubject.entries()].map(([id, value]) => ({
        subjectId: id,
        subject: value.name,
        averageAccuracy: Math.round((value.total / value.count) * 10) / 10,
        sessions: value.count,
      })),
      improvementTopics: this.topTopics(results.flatMap((r) => r.topicsNeedImprovement)),
      history: results.map((r) => ({
        id: r.id,
        subject: r.subject.name,
        accuracy: r.accuracy,
        score: r.score,
        createdAt: r.createdAt,
        durationSeconds: r.durationSeconds,
      })),
    };
  }

  private topTopics(topics: string[]) {
    const counts = new Map<string, number>();
    for (const topic of topics) counts.set(topic, (counts.get(topic) ?? 0) + 1);
    return [...counts.entries()]
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }
}
