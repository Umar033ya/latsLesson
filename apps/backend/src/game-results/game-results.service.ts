import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@last-lesson/shared-types';
import { PrismaService } from '../common/prisma.service';

type Actor = { id: string; role: Role; organizationIds: string[] };

@Injectable()
export class GameResultsService {
  constructor(private readonly prisma: PrismaService) {}

  async myResults(userId: string) {
    return this.prisma.gameResult.findMany({
      where: { userId },
      include: { subject: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async organizationResults(actor: Actor, organizationId?: string) {
    if (actor.role === Role.GAMER) throw new ForbiddenException();
    const orgIds = actor.role === Role.SUPER_ADMIN ? (organizationId ? [organizationId] : actor.organizationIds) : actor.organizationIds;
    return this.prisma.gameResult.findMany({
      where: { organizationId: { in: orgIds } },
      include: {
        subject: { select: { id: true, name: true, slug: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  async leaderboard(actor: Actor, organizationId?: string) {
    const orgIds = actor.role === Role.GAMER ? actor.organizationIds : actor.role === Role.SUPER_ADMIN ? (organizationId ? [organizationId] : []) : actor.organizationIds;
    const grouped = await this.prisma.gameResult.groupBy({
      by: ['userId'],
      where: { organizationId: { in: orgIds } },
      _sum: { score: true },
      _avg: { accuracy: true },
      _count: { id: true },
      orderBy: { _sum: { score: 'desc' } },
      take: 20,
    });
    const users = await this.prisma.user.findMany({
      where: { id: { in: grouped.map((g) => g.userId) } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    return grouped.map((g, index) => ({
      rank: index + 1,
      score: g._sum.score ?? 0,
      accuracy: Math.round((g._avg.accuracy ?? 0) * 10) / 10,
      sessions: g._count.id,
      user: users.find((u) => u.id === g.userId),
    }));
  }
}
