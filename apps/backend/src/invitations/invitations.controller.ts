import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Role } from '@last-lesson/shared-types';
import { createInvitationSchema } from '@last-lesson/validation';
import { Auth } from '../common/guards';
import { CurrentUser } from '../common/decorators';
import { IdPipe, OptionalIdPipe, zodPipe } from '../common/zod-validation.pipe';
import type { Actor } from '../common/actor';
import { InvitationsService } from './invitations.service';

@ApiTags('access-codes')
@Auth(Role.SUPER_ADMIN, Role.CENTER_ADMIN)
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly service: InvitationsService) {}

  @Post()
  @ApiOperation({ summary: 'Generate a group or personal access code. The plaintext is returned once.' })
  create(@Body(zodPipe(createInvitationSchema)) body: z.infer<typeof createInvitationSchema>, @CurrentUser() user: Actor) {
    return this.service.create(body, user);
  }

  @Get()
  findAll(@CurrentUser() user: Actor, @Query('organizationId', OptionalIdPipe) organizationId?: string, @Query('kind') kind?: string) {
    return this.service.findAll(user, organizationId, kind === 'PERSONAL' || kind === 'GROUP' ? kind : undefined);
  }

  @Post(':id/regenerate')
  @ApiOperation({ summary: 'Revoke a code and issue a replacement with the same scope' })
  regenerate(@Param('id', IdPipe) id: string, @CurrentUser() user: Actor) {
    return this.service.regenerate(id, user);
  }

  @Post(':id/revoke')
  @HttpCode(200)
  revoke(@Param('id', IdPipe) id: string, @CurrentUser() user: Actor) {
    return this.service.revoke(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', IdPipe) id: string,
    @Body(zodPipe(z.object({ isActive: z.boolean().optional(), expiresAt: z.string().datetime({ offset: true }).optional(), label: z.string().trim().max(80).nullable().optional(), maxUses: z.number().int().min(1).max(10_000).optional() })))
    body: { isActive?: boolean; expiresAt?: string; label?: string | null; maxUses?: number },
    @CurrentUser() user: Actor,
  ) {
    return this.service.update(id, body, user);
  }
}
