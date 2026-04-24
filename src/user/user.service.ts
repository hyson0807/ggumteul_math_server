import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { USER_PUBLIC_SELECT } from '../common/constants/user-select';
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
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: USER_PUBLIC_SELECT,
    });
  }

  async deleteMe(userId: string) {
    await this.prisma.user.delete({ where: { id: userId } });
  }
}
