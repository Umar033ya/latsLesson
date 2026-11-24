import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Role } from '@last-lesson/shared-types';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles } from '../common/decorators';
import { zodPipe } from '../common/zod-validation.pipe';
import { SubjectsService } from './subjects.service';

const createSubjectSchema = z.object({
  name: z.string().trim().min(2),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
});

@ApiTags('subjects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly service: SubjectsService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.CENTER_ADMIN, Role.GAMER)
  findAll() {
    return this.service.findAll();
  }

  @Get(':id/topics')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_ADMIN, Role.GAMER)
  topics(@Param('id') id: string) {
    return this.service.topics(id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN)
  create(@Body(zodPipe(createSubjectSchema)) body: any) {
    return this.service.create(body);
  }

  @Patch(':id/active')
  @Roles(Role.SUPER_ADMIN)
  setActive(@Param('id') id: string, @Body(zodPipe(z.object({ isActive: z.boolean() }))) body: any) {
    return this.service.setActive(id, body.isActive);
  }
}
