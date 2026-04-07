import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { USER_PUBLIC_SELECT } from '../common/constants/user-select';
import {
  BUILDING_TYPES,
  BuildingType,
  COIN_COST_PER_TAP,
  MAX_LEVEL,
  MAX_PROGRESS,
  PROGRESS_PER_TAP,
  isBuildingType,
} from '../common/constants/building';

@Injectable()
export class VillageService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string) {
    // 4개 type 모두 보장 — 누락된 행은 자동 시드
    const existing = await this.prisma.buildingProgress.findMany({
      where: { userId },
      select: { type: true, level: true, progress: true },
    });

    const existingTypes = new Set(existing.map((b) => b.type));
    const missing = BUILDING_TYPES.filter((t) => !existingTypes.has(t));

    if (missing.length > 0) {
      await this.prisma.buildingProgress.createMany({
        data: missing.map((type) => ({ userId, type, level: 1, progress: 0 })),
        skipDuplicates: true,
      });
    }

    const all = await this.prisma.buildingProgress.findMany({
      where: { userId },
      select: { type: true, level: true, progress: true },
    });

    // [house, school, park, shop] 순 정렬
    const order = new Map<string, number>(BUILDING_TYPES.map((t, i) => [t, i]));
    return all.sort((a, b) => (order.get(a.type) ?? 0) - (order.get(b.type) ?? 0));
  }

  async upgrade(userId: string, type: string) {
    if (!isBuildingType(type)) {
      throw new BadRequestException('알 수 없는 건물 종류입니다.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 빌딩 레코드 보장 (없으면 생성)
      let building = await tx.buildingProgress.findUnique({
        where: { userId_type: { userId, type } },
      });
      if (!building) {
        building = await tx.buildingProgress.create({
          data: { userId, type, level: 1, progress: 0 },
        });
      }

      // 최대 레벨 + 진행도 풀이면 차단
      if (building.level >= MAX_LEVEL && building.progress >= MAX_PROGRESS) {
        throw new BadRequestException('이미 최대 레벨입니다.');
      }

      // 사용자 코인 확인
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { coins: true },
      });
      if (!user) {
        throw new NotFoundException('사용자를 찾을 수 없습니다.');
      }
      if (user.coins < COIN_COST_PER_TAP) {
        throw new BadRequestException('코인이 부족합니다.');
      }

      // 진행도/레벨 계산
      let nextLevel = building.level;
      let nextProgress = building.progress + PROGRESS_PER_TAP;
      if (nextProgress >= MAX_PROGRESS) {
        if (nextLevel < MAX_LEVEL) {
          nextLevel += 1;
          nextProgress = 0;
        } else {
          // 최대 레벨인 경우 100에서 클램프
          nextProgress = MAX_PROGRESS;
        }
      }

      const [updatedUser, updatedBuilding] = await Promise.all([
        tx.user.update({
          where: { id: userId },
          data: { coins: { decrement: COIN_COST_PER_TAP } },
          select: USER_PUBLIC_SELECT,
        }),
        tx.buildingProgress.update({
          where: { userId_type: { userId, type } },
          data: { level: nextLevel, progress: nextProgress },
          select: { type: true, level: true, progress: true },
        }),
      ]);

      return { user: updatedUser, building: updatedBuilding };
    });
  }
}
