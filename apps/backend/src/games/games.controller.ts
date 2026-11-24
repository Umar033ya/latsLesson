import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GATES, SECTIONS, TENSIONS, THEMES, WRONG_ANSWER, MODES } from '@last-lesson/scenario';
import { Role } from '@last-lesson/shared-types';
import { AccessService } from '../common/access.service';
import { Auth } from '../common/guards';

@ApiTags('game-configuration')
@Auth(Role.SUPER_ADMIN, Role.CENTER_ADMIN, Role.GAMER)
@Controller('games')
export class GamesController {
  constructor(private readonly access: AccessService) {}

  @Get('config')
  @ApiOperation({ summary: 'What can be configured: sections, gates, themes and platform policy' })
  async config() {
    const { allowedTensions, allowedThemes, maxSessionMinutes, gameEnabled, maintenanceMessage } = await this.access.platform();
    return { sections: SECTIONS, gates: GATES, tensions: TENSIONS, modes: MODES, wrongAnswer: WRONG_ANSWER, themes: THEMES, policy: { allowedTensions, allowedThemes, maxSessionMinutes, gameEnabled, maintenanceMessage } };
  }
}
