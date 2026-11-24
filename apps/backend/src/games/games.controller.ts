import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GAME, MONSTER_STATES } from '@last-lesson/constants';
import { JwtAuthGuard } from '../common/guards';

@ApiTags('games')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('games')
export class GamesController {
  /** Static gameplay configuration. AI is never involved in a running session. */
  @Get('config')
  config() {
    return { ...GAME, monsterStates: MONSTER_STATES };
  }
}
