import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ROLE_VALUES } from '@last-lesson/constants';
import { JwtAuthGuard } from '../common/guards';

@ApiTags('roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('roles')
export class RolesController {
  @Get()
  list() {
    return { roles: ROLE_VALUES };
  }
}
