import { Injectable } from '@nestjs/common';
import { gatesFor, SECTIONS, type Locale } from '@last-lesson/scenario';
import { PrismaService } from '../common/prisma.service';
import { AccessService } from '../common/access.service';
import { studentOrg, type Actor } from '../common/actor';
import { CampaignsService } from '../campaigns/campaigns.service';
import { PlayService } from '../game-sessions/play.service';

@Injectable()
export class StudentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly campaigns: CampaignsService,
    private readonly play: PlayService,
  ) {}

  async home(actor: Actor, locale: Locale) {
    const organizationId = studentOrg(actor);
    const org = await this.access.operational(organizationId);
    await this.play.finalizeExpired({ userId: actor.id });
    const membership = await this.prisma.membership.findUniqueOrThrow({ where: { userId_organizationId: { userId: actor.id, organizationId } }, include: { group: true } });
    const settings = this.access.settings(org);
    const platform = await this.access.platform();
    const [items, sessions] = await Promise.all([
      this.prisma.campaign.findMany({ where: this.campaigns.availableWhere(organizationId, membership.groupId, settings.allowOfficialCampaigns), orderBy: [{ organizationId: 'desc' }, { publishedAt: 'desc' }] }),
      this.prisma.gameSession.findMany({ where: { userId: actor.id, organizationId }, orderBy: { startedAt: 'desc' }, take: 200, select: { id: true, campaignId: true, lobbyId: true, status: true, outcome: true, score: true, maxScore: true, accuracy: true, startedAt: true, durationSeconds: true } }),
    ]);
    const subjects = await this.prisma.subject.findMany({ where: { isActive: true }, select: { id: true, name: true, slug: true, color: true, topics: { where: { isActive: true }, select: { id: true, name: true, slug: true }, orderBy: { name: 'asc' } } }, orderBy: { name: 'asc' } });
    const campaigns = await Promise.all(
      items.map(async (c) => {
        const config = this.campaigns.config(c);
        const tr = (c.translations as Record<string, { title?: string; description?: string; objectives?: string[] }>)?.[locale];
        const own = sessions.filter((s) => s.campaignId === c.id);
        const done = own.filter((s) => s.status === 'COMPLETED');
        const best = [...done].sort((a, b) => b.score - a.score)[0] ?? null;
        const gameplay = await this.access.gameplay(org, config.gameplay);
        const topicNames = subjects.flatMap((s) => s.topics).filter((t) => config.source.topicIds.includes(t.id)).map((t) => t.name);
        return {
          id: c.id,
          title: tr?.title || c.title,
          description: tr?.description || c.description,
          official: c.organizationId === null,
          theme: config.theme ?? settings.branding.theme,
          difficulty: config.difficulty,
          objectives: tr?.objectives?.length ? tr.objectives : config.objectives,
          sections: SECTIONS.filter((s) => config.sections.includes(s.id)).map((s) => s.name),
          questionCount: gatesFor(config.sections).length,
          subjects: subjects.filter((s) => !config.source.subjectIds.length || config.source.subjectIds.includes(s.id)).map((s) => ({ id: s.id, name: s.name })),
          topics: topicNames,
          gameplay: { mode: gameplay.mode, tension: gameplay.tension, lives: gameplay.lives, sessionMinutes: gameplay.sessionMinutes },
          availableTo: c.availableTo,
          attempts: own.length,
          best: best && { score: best.score, maxScore: best.maxScore, accuracy: best.accuracy, outcome: best.outcome },
          inProgress: own.find((s) => s.status === 'IN_PROGRESS' && !s.lobbyId)?.id ?? null,
        };
      }),
    );
    const finished = sessions.filter((s) => s.status === 'COMPLETED');
    return {
      student: { firstName: actor.firstName, lastName: actor.lastName, group: membership.group?.name ?? null, accessExpiresAt: membership.accessExpiresAt },
      center: await this.access.branding(org),
      announcement: settings.content.announcement,
      maintenance: platform.gameEnabled ? null : platform.maintenanceMessage || 'The game is closed for maintenance',
      features: await this.access.features(org),
      campaigns,
      subjects,
      summary: { played: sessions.length, finished: finished.length, averageAccuracy: finished.length ? Math.round(finished.reduce((s, r) => s + r.accuracy, 0) / finished.length) : null, last: sessions[0] ?? null },
    };
  }
}
