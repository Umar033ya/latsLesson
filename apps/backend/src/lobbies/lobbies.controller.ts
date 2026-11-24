import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@last-lesson/shared-types';
import type { Locale } from '@last-lesson/scenario';
import { createLobbySchema, joinLobbySchema, type CreateLobbyInput, type JoinLobbyInput } from '@last-lesson/validation';
import { Auth } from '../common/guards';
import { ClientIp, CurrentUser, Lang } from '../common/decorators';
import { RateLimit, RateLimitGuard, RateLimitService } from '../common/rate-limit';
import { IdPipe, OptionalIdPipe, zodPipe } from '../common/zod-validation.pipe';
import type { Actor } from '../common/actor';
import { LobbiesService, type LobbyClaims } from './lobbies.service';
import { LobbyMember, LobbyTokenGuard } from './lobby-token.guard';

@ApiTags('lobbies')
@Auth(Role.TEACHER, Role.CENTER_ADMIN)
@UseGuards(RateLimitGuard)
@Controller('lobbies')
export class LobbiesController {
  constructor(private readonly service: LobbiesService) {}

  @Get()
  list(@CurrentUser() user: Actor, @Lang() lang: Locale, @Query('organizationId', OptionalIdPipe) org?: string) {
    return this.service.list(user, lang, org);
  }

  @Get('campaigns')
  campaigns(@CurrentUser() user: Actor, @Lang() lang: Locale, @Query('organizationId', OptionalIdPipe) org?: string) {
    return this.service.campaignChoices(user, lang, org);
  }

  @Post()
  @RateLimit('lobby-create', 30, 3600)
  @ApiOperation({ summary: 'Open a room. Players join it with the returned six-digit code.' })
  create(@Body(zodPipe(createLobbySchema)) body: CreateLobbyInput, @CurrentUser() user: Actor, @Lang() lang: Locale, @Query('organizationId', OptionalIdPipe) org?: string) {
    return this.service.create(body, user, lang, org);
  }

  @Get(':id')
  one(@Param('id', IdPipe) id: string, @CurrentUser() user: Actor, @Lang() lang: Locale) {
    return this.service.one(id, user, lang);
  }

  @Post(':id/start')
  @HttpCode(200)
  start(@Param('id', IdPipe) id: string, @CurrentUser() user: Actor, @Lang() lang: Locale) {
    return this.service.start(id, user, lang);
  }

  @Post(':id/end')
  @HttpCode(200)
  end(@Param('id', IdPipe) id: string, @CurrentUser() user: Actor, @Lang() lang: Locale) {
    return this.service.end(id, user, lang);
  }

  @Delete(':id/players/:playerId')
  kick(@Param('id', IdPipe) id: string, @Param('playerId', IdPipe) playerId: string, @CurrentUser() user: Actor, @Lang() lang: Locale) {
    return this.service.kick(id, playerId, user, lang);
  }

  @Delete(':id')
  remove(@Param('id', IdPipe) id: string, @CurrentUser() user: Actor) {
    return this.service.remove(id, user);
  }
}

/** The player's side. A guest holds a token for one room and nothing else. */
@ApiTags('lobbies')
@UseGuards(RateLimitGuard)
@Controller('room')
export class RoomController {
  constructor(
    private readonly service: LobbiesService,
    private readonly limits: RateLimitService,
  ) {}

  @Post('join')
  @HttpCode(200)
  @RateLimit('room-join', 120, 600)
  @ApiOperation({ summary: 'Join with a code and a nickname. No account is needed.' })
  join(@Body(zodPipe(joinLobbySchema)) body: JoinLobbyInput, @ClientIp() ip: string) {
    return this.limits.guardFailures('room-code', ip, 40, 600, () => this.service.join(body, ip));
  }

  @Post('join-as-student')
  @HttpCode(200)
  @Auth(Role.GAMER)
  @ApiOperation({ summary: 'Join with a signed-in student profile; the result is kept in it.' })
  joinAsStudent(@Body(zodPipe(joinLobbySchema)) body: JoinLobbyInput, @CurrentUser() user: Actor, @ClientIp() ip: string) {
    return this.limits.guardFailures('room-code', ip, 40, 600, () => this.service.join(body, ip, user));
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(LobbyTokenGuard)
  room(@LobbyMember() member: LobbyClaims, @Lang() lang: Locale) {
    return this.service.room(member, lang);
  }

  @Post('launch')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(LobbyTokenGuard)
  launch(@LobbyMember() member: LobbyClaims) {
    return this.service.launch(member);
  }

  @Post('leave')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(LobbyTokenGuard)
  leave(@LobbyMember() member: LobbyClaims) {
    return this.service.leave(member);
  }
}
