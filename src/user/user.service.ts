import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const USER_PUBLIC_FIELDS = {
  id: true,
  email: true,
  name: true,
  grade: true,
  level: true,
  coins: true,
  stars: true,
  tutorType: true,
  createdAt: true,
} as const;

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_PUBLIC_FIELDS,
    });
    if (!user) {
      throw new NotFoundException();
    }
    return user;
  }

  async updateMe(userId: string, data: { name?: string; tutorType?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: USER_PUBLIC_FIELDS,
    });
  }

  async deleteMe(userId: string) {
    await this.prisma.user.delete({ where: { id: userId } });
  }
}
