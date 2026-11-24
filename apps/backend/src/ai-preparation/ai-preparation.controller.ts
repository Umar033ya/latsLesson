import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@last-lesson/shared-types';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { zodPipe } from '../common/zod-validation.pipe';
import { preparationSchema } from '@last-lesson/validation';
import { AiPreparationService } from './ai-preparation.service';

@ApiTags('ai-preparation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai-preparation')
export class AiPreparationController {
  constructor(private readonly service: AiPreparationService) {}

  @Post()
  @Roles(Role.GAMER)
  @ApiOperation({ summary: 'Prepare for a game. AI is never called during gameplay.' })
  create(@Body(zodPipe(preparationSchema)) body: any, @CurrentUser() user: any) {
    return this.service.create(body, user);
  }

  @Get('mine')
  @Roles(Role.GAMER)
  mine(@CurrentUser() user: any) {
    return this.service.mine(user.id);
  }

  @Get(':id')
  @Roles(Role.GAMER, Role.CENTER_ADMIN, Role.SUPER_ADMIN)
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user);
  }
}
