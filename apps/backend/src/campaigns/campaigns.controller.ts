import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@last-lesson/shared-types';
import { campaignConfigSchema, campaignSchema, type CampaignConfig, type CampaignInput } from '@last-lesson/validation';
import { Auth } from '../common/guards';
import { CurrentUser } from '../common/decorators';
import { IdPipe, OptionalIdPipe, zodPipe } from '../common/zod-validation.pipe';
import type { Actor } from '../common/actor';
import { CampaignsService } from './campaigns.service';

@ApiTags('campaigns')
@Auth(Role.SUPER_ADMIN, Role.CENTER_ADMIN)
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly service: CampaignsService) {}

  @Get()
  findAll(@CurrentUser() user: Actor, @Query('organizationId', OptionalIdPipe) organizationId?: string) {
    return this.service.findAll(user, organizationId);
  }

  @Post('check')
  @HttpCode(200)
  @ApiOperation({ summary: 'How many questions match a configuration, per difficulty and type' })
  check(@Body(zodPipe(campaignConfigSchema)) body: CampaignConfig, @CurrentUser() user: Actor, @Query('organizationId', OptionalIdPipe) organizationId?: string) {
    return this.service.check(body, user, organizationId);
  }

  @Get(':id')
  findOne(@Param('id', IdPipe) id: string, @CurrentUser() user: Actor) {
    return this.service.findOne(id, user);
  }

  @Get(':id/preview')
  @ApiOperation({ summary: 'A sample run: one question per gate, chosen with the live rules' })
  preview(@Param('id', IdPipe) id: string, @CurrentUser() user: Actor) {
    return this.service.preview(id, user);
  }

  @Post()
  create(@Body(zodPipe(campaignSchema)) body: CampaignInput, @CurrentUser() user: Actor, @Query('organizationId', OptionalIdPipe) organizationId?: string) {
    return this.service.create(body, user, organizationId);
  }

  @Put(':id')
  update(@Param('id', IdPipe) id: string, @Body(zodPipe(campaignSchema)) body: CampaignInput, @CurrentUser() user: Actor) {
    return this.service.update(id, body, user);
  }

  @Post(':id/publish')
  @HttpCode(200)
  publish(@Param('id', IdPipe) id: string, @CurrentUser() user: Actor) {
    return this.service.publish(id, user);
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  unpublish(@Param('id', IdPipe) id: string, @CurrentUser() user: Actor) {
    return this.service.setStatus(id, 'DRAFT', user);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id', IdPipe) id: string, @CurrentUser() user: Actor, @Query('organizationId', OptionalIdPipe) organizationId?: string) {
    return this.service.duplicate(id, user, organizationId);
  }

  @Delete(':id')
  remove(@Param('id', IdPipe) id: string, @CurrentUser() user: Actor) {
    return this.service.remove(id, user);
  }
}
