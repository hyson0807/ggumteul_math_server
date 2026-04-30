import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { USER_PUBLIC_SELECT } from '../common/constants/user-select';
import { semesterToStage } from '../common/constants/worm';
import { UpdateMeDto } from './dto/update-me.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_PUBLIC_SELECT,
    });
    if (!user) {
      throw new NotFoundException();
    }
    return user;
  }

  async updateMe(userId: string, data: UpdateMeDto) {
    const dataToWrite: Prisma.UserUpdateInput = { ...data };

    if (data.grade !== undefined) {
      const current = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { wormStage: true },
      });
      if (!current) throw new NotFoundException();

      const gradeStartStage = semesterToStage(data.grade, 1);
      if (gradeStartStage > current.wormStage) {
        dataToWrite.wormStage = gradeStartStage;
        dataToWrite.wormProgress = 0;
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: dataToWrite,
      select: USER_PUBLIC_SELECT,
    });
  }

  async deleteMe(userId: string) {
    await this.prisma.user.delete({ where: { id: userId } });
  }
}
