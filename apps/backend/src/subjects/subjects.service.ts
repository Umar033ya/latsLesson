import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const subjects = await this.prisma.subject.findMany({
      where: { isActive: true },
      include: {
        topics: { select: { id: true, name: true, slug: true } },
        _count: { select: { questions: true } },
      },
      orderBy: { name: 'asc' },
    });
    return subjects.map((s) => ({
      ...s,
      questionCount: s._count.questions,
    }));
  }

  async topics(subjectId: string) {
    const subject = await this.prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) throw new NotFoundException('Subject not found');
    return this.prisma.topic.findMany({
      where: { subjectId },
      include: { _count: { select: { questions: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(data: { name: string; slug: string; description?: string | null; icon?: string | null; color?: string | null }) {
    if (await this.prisma.subject.findUnique({ where: { slug: data.slug } })) {
      throw new ConflictException('Subject slug already exists');
    }
    return this.prisma.subject.create({ data });
  }

  async setActive(id: string, isActive: boolean) {
    return this.prisma.subject.update({ where: { id }, data: { isActive } });
  }
}
