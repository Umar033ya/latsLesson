import { Injectable } from '@nestjs/common';
import { FEATURES, type Branding, type ContentConfig, type Feature, type GameplayConfig } from '@last-lesson/scenario';
import { centerSettingsSchema, platformSettingsSchema, type CenterSettings, type PlatformSettings } from '@last-lesson/validation';
import { PrismaService } from './prisma.service';
import { ApiException, notFound } from './errors';

export const TRIAL_LIMITS = { maxStudents: 30, maxGroups: 3, maxCampaigns: 2, maxQuestions: 100 };

export type OrgWithPlan = NonNullable<Awaited<ReturnType<AccessService['findOrg']>>>;
type Countable = 'students' | 'groups' | 'campaigns' | 'questions';
const LIMIT_KEY: Record<Countable, keyof typeof TRIAL_LIMITS> = { students: 'maxStudents', groups: 'maxGroups', campaigns: 'maxCampaigns', questions: 'maxQuestions' };

/** Subscription, plan limits, feature switches and effective configuration for a center. */
@Injectable()
export class AccessService {
  private cache: { at: number; value: PlatformSettings } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async platform(): Promise<PlatformSettings> {
    if (this.cache && Date.now() - this.cache.at < 5000) return this.cache.value;
    const row = await this.prisma.platformSetting.findUnique({ where: { key: 'platform' } });
    const value = platformSettingsSchema.parse(row?.value ?? {});
    this.cache = { at: Date.now(), value };
    return value;
  }

  clearCache() {
    this.cache = null;
  }

  findOrg(id: string) {
    return this.prisma.organization.findUnique({ where: { id }, include: { plan: true } });
  }

  async org(id: string): Promise<OrgWithPlan> {
    const org = await this.findOrg(id);
    if (!org) throw notFound('Education center');
    return org;
  }

  /** Throws when the center is suspended, closed or its subscription has ended. */
  assertOperational(org: { status: string; subscriptionEndsAt: Date | null }) {
    if (org.status === 'SUSPENDED') throw new ApiException('CENTER_SUSPENDED', 'This education center is suspended', 403);
    if (org.status === 'INACTIVE') throw new ApiException('CENTER_INACTIVE', 'This education center is closed', 403);
    if (org.subscriptionEndsAt && org.subscriptionEndsAt < new Date()) throw new ApiException('SUBSCRIPTION_ENDED', 'The subscription of this education center has ended', 403);
  }

  async operational(id: string) {
    const org = await this.org(id);
    this.assertOperational(org);
    return org;
  }

  async features(org: OrgWithPlan): Promise<Record<Feature, boolean>> {
    const platform = await this.platform();
    const plan = (org.plan?.features ?? {}) as Partial<Record<Feature, boolean>>;
    return Object.fromEntries(FEATURES.map((f) => [f, platform.features[f] !== false && plan[f] !== false])) as Record<Feature, boolean>;
  }

  async assertFeature(org: OrgWithPlan, feature: Feature) {
    if (!(await this.features(org))[feature]) throw new ApiException('FEATURE_DISABLED', 'This feature is not included in your plan', 403, { feature });
  }

  limits(org: OrgWithPlan) {
    if (!org.plan) return TRIAL_LIMITS;
    const { maxStudents, maxGroups, maxCampaigns, maxQuestions } = org.plan;
    return { maxStudents, maxGroups, maxCampaigns, maxQuestions };
  }

  async usage(organizationId: string): Promise<Record<Countable, number>> {
    const [students, groups, campaigns, questions] = await Promise.all([
      this.prisma.membership.count({ where: { organizationId, status: 'ACTIVE' } }),
      this.prisma.group.count({ where: { organizationId } }),
      this.prisma.campaign.count({ where: { organizationId, status: { not: 'ARCHIVED' } } }),
      this.prisma.question.count({ where: { organizationId, status: { not: 'ARCHIVED' } } }),
    ]);
    return { students, groups, campaigns, questions };
  }

  async assertCapacity(org: OrgWithPlan, kind: Countable, adding = 1) {
    const limit = this.limits(org)[LIMIT_KEY[kind]];
    const used = (await this.usage(org.id))[kind];
    if (used + adding > limit) throw new ApiException('PLAN_LIMIT', `Your plan allows ${limit} ${kind}, ${used} in use`, 403, { kind, limit, used });
  }

  settings(org: { settings: unknown }): CenterSettings {
    return centerSettingsSchema.parse(org.settings ?? {});
  }

  async branding(org: OrgWithPlan): Promise<Branding> {
    const s = this.settings(org).branding;
    const platform = await this.platform();
    const allowed = (await this.features(org)).branding;
    return {
      displayName: (allowed && s.displayName) || org.name,
      logoUrl: allowed ? org.logoUrl : null,
      accent: allowed ? s.accent : '#d9a441',
      theme: platform.allowedThemes.includes(s.theme) ? s.theme : platform.allowedThemes[0],
    };
  }

  /** Center defaults, then campaign overrides, then platform policy. Policy always wins. */
  async gameplay(org: { settings: unknown }, override: Partial<GameplayConfig> = {}): Promise<GameplayConfig> {
    const platform = await this.platform();
    const merged: GameplayConfig = { ...this.settings(org).gameplay, ...override };
    if (!platform.allowedTensions.includes(merged.tension)) merged.tension = platform.allowedTensions[0];
    merged.sessionMinutes = Math.min(merged.sessionMinutes, platform.maxSessionMinutes);
    return merged;
  }

  async content(org: OrgWithPlan, override: Partial<ContentConfig> = {}): Promise<ContentConfig> {
    const base = this.settings(org).content;
    const notesAllowed = (await this.features(org)).customNotes;
    return {
      openingLine: override.openingLine || base.openingLine,
      announcement: override.announcement || base.announcement,
      closingLine: override.closingLine || base.closingLine,
      notes: notesAllowed ? (override.notes?.length ? override.notes : base.notes) : [],
    };
  }
}
