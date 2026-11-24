import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Role } from '@last-lesson/shared-types';
import { bulkStudentsSchema, centerProfileSchema, centerSettingsSchema, groupSchema, paginationSchema, studentSchema, teacherSchema, updateStudentSchema, updateTeacherSchema, type CenterSettings, type StudentInput, type TeacherInput } from '@last-lesson/validation';
import { Auth } from '../common/guards';
import { CurrentUser } from '../common/decorators';
import { IdPipe, OptionalIdPipe, zodPipe } from '../common/zod-validation.pipe';
import { resolveOrg, type Actor } from '../common/actor';
import { CenterService } from './center.service';
import { StudentsService } from './students.service';
import { TeachersService } from './teachers.service';

const id = z.union([z.string().uuid(), z.literal('').transform(() => undefined)]).optional();
const studentQuery = paginationSchema.extend({ organizationId: id, groupId: id, status: z.enum(['ACTIVE', 'INACTIVE']).optional() });
export type StudentQuery = z.infer<typeof studentQuery>;

/** Everything a center manages about itself. The tenant always comes from resolveOrg(). */
@ApiTags('center')
@Auth(Role.CENTER_ADMIN, Role.SUPER_ADMIN)
@Controller('center')
export class CenterController {
  constructor(
    private readonly service: CenterService,
    private readonly students: StudentsService,
    private readonly teachers: TeachersService,
  ) {}

  @Get('dashboard')
  dashboard(@CurrentUser() user: Actor, @Query('organizationId', OptionalIdPipe) org?: string) {
    return this.service.dashboard(resolveOrg(user, org));
  }

  @Get('profile')
  profile(@CurrentUser() user: Actor, @Query('organizationId', OptionalIdPipe) org?: string) {
    return this.service.profile(resolveOrg(user, org));
  }

  @Patch('profile')
  updateProfile(@Body(zodPipe(centerProfileSchema)) body: z.infer<typeof centerProfileSchema>, @CurrentUser() user: Actor, @Query('organizationId', OptionalIdPipe) org?: string) {
    return this.service.updateProfile(resolveOrg(user, org), body, user);
  }

  @Put('settings')
  updateSettings(@Body(zodPipe(centerSettingsSchema)) body: CenterSettings, @CurrentUser() user: Actor, @Query('organizationId', OptionalIdPipe) org?: string) {
    return this.service.updateSettings(resolveOrg(user, org), body, user);
  }

  @Get('groups')
  groups(@CurrentUser() user: Actor, @Query('organizationId', OptionalIdPipe) org?: string) {
    return this.service.groups(resolveOrg(user, org));
  }

  @Post('groups')
  createGroup(@Body(zodPipe(groupSchema)) body: z.infer<typeof groupSchema>, @CurrentUser() user: Actor, @Query('organizationId', OptionalIdPipe) org?: string) {
    return this.service.createGroup(resolveOrg(user, org), body, user);
  }

  @Get('groups/:id')
  group(@Param('id', IdPipe) groupId: string, @CurrentUser() user: Actor, @Query('organizationId', OptionalIdPipe) org?: string) {
    return this.service.group(resolveOrg(user, org), groupId);
  }

  @Patch('groups/:id')
  updateGroup(@Param('id', IdPipe) groupId: string, @Body(zodPipe(groupSchema.partial())) body: Partial<z.infer<typeof groupSchema>>, @CurrentUser() user: Actor, @Query('organizationId', OptionalIdPipe) org?: string) {
    return this.service.updateGroup(resolveOrg(user, org), groupId, body, user);
  }

  @Delete('groups/:id')
  removeGroup(@Param('id', IdPipe) groupId: string, @CurrentUser() user: Actor, @Query('organizationId', OptionalIdPipe) org?: string) {
    return this.service.removeGroup(resolveOrg(user, org), groupId, user);
  }

  @Put('groups/:id/campaigns')
  assignCampaigns(@Param('id', IdPipe) groupId: string, @Body(zodPipe(z.object({ campaignIds: z.array(z.string().uuid()).max(100) }))) body: { campaignIds: string[] }, @CurrentUser() user: Actor, @Query('organizationId', OptionalIdPipe) org?: string) {
    return this.service.assignCampaigns(resolveOrg(user, org), groupId, body.campaignIds, user);
  }

  @Get('teachers')
  listTeachers(@CurrentUser() user: Actor, @Query('organizationId', OptionalIdPipe) org?: string) {
    return this.teachers.list(resolveOrg(user, org));
  }

  @Post('teachers')
  createTeacher(@Body(zodPipe(teacherSchema)) body: TeacherInput, @CurrentUser() user: Actor, @Query('organizationId', OptionalIdPipe) org?: string) {
    return this.teachers.create(resolveOrg(user, org), body, user);
  }

  @Patch('teachers/:id')
  updateTeacher(@Param('id', IdPipe) teacherId: string, @Body(zodPipe(updateTeacherSchema)) body: z.infer<typeof updateTeacherSchema>, @CurrentUser() user: Actor, @Query('organizationId', OptionalIdPipe) org?: string) {
    return this.teachers.update(resolveOrg(user, org), teacherId, body, user);
  }

  @Post('teachers/:id/password')
  @HttpCode(200)
  teacherPassword(@Param('id', IdPipe) teacherId: string, @CurrentUser() user: Actor, @Query('organizationId', OptionalIdPipe) org?: string) {
    return this.teachers.newPassword(resolveOrg(user, org), teacherId, user);
  }

  @Get('students')
  list(@Query(zodPipe(studentQuery)) q: StudentQuery, @CurrentUser() user: Actor) {
    return this.students.list(resolveOrg(user, q.organizationId), q);
  }

  @Post('students')
  create(@Body(zodPipe(studentSchema)) body: StudentInput, @CurrentUser() user: Actor, @Query('organizationId', OptionalIdPipe) org?: string) {
    return this.students.create(resolveOrg(user, org), [body], true, user);
  }

  @Post('students/bulk')
  bulk(@Body(zodPipe(bulkStudentsSchema)) body: z.infer<typeof bulkStudentsSchema>, @CurrentUser() user: Actor, @Query('organizationId', OptionalIdPipe) org?: string) {
    return this.students.create(resolveOrg(user, org), body.students, body.generateCodes, user);
  }

  @Get('students/:id')
  student(@Param('id', IdPipe) studentId: string, @CurrentUser() user: Actor, @Query('organizationId', OptionalIdPipe) org?: string) {
    return this.students.findOne(resolveOrg(user, org), studentId);
  }

  @Patch('students/:id')
  updateStudent(@Param('id', IdPipe) studentId: string, @Body(zodPipe(updateStudentSchema)) body: z.infer<typeof updateStudentSchema>, @CurrentUser() user: Actor, @Query('organizationId', OptionalIdPipe) org?: string) {
    return this.students.update(resolveOrg(user, org), studentId, body, user);
  }

  @Post('students/:id/code')
  @HttpCode(201)
  newCode(@Param('id', IdPipe) studentId: string, @CurrentUser() user: Actor, @Query('organizationId', OptionalIdPipe) org?: string) {
    return this.students.newCode(resolveOrg(user, org), studentId, user);
  }

  @Delete('students/:id')
  removeStudent(@Param('id', IdPipe) studentId: string, @CurrentUser() user: Actor, @Query('organizationId', OptionalIdPipe) org?: string) {
    return this.students.remove(resolveOrg(user, org), studentId, user);
  }
}
