import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SHOP_ITEM_PUBLIC_SELECT } from '../common/constants/shop-select';
import {
  EquipSlot,
  MAX_WORM_STAGE,
  WORM_MAX_LEVEL,
  feedThreshold,
  levelForConsumed,
} from '../common/constants/worm';

const SLOT_TO_FIELD: Record<
  EquipSlot,
  'equippedHatId' | 'equippedBodyId' | 'equippedAccessoryId'
> = {
  hat: 'equippedHatId',
  body: 'equippedBodyId',
  accessory: 'equippedAccessoryId',
};

const WORM_STATE_SELECT = {
  wormStage: true,
  wormProgress: true,
  feed: true,
  feedConsumed: true,
  wormLevel: true,
  equippedHat: { select: SHOP_ITEM_PUBLIC_SELECT },
  equippedBody: { select: SHOP_ITEM_PUBLIC_SELECT },
  equippedAccessory: { select: SHOP_ITEM_PUBLIC_SELECT },
} as const satisfies Prisma.UserSelect;

type WormStateRow = Prisma.UserGetPayload<{ select: typeof WORM_STATE_SELECT }>;

function toWormStateResponse(row: WormStateRow) {
  const level = row.wormLevel;
  const isMax = level >= WORM_MAX_LEVEL;
  // 레벨 진행도/다음 레벨까지 먹이는 백엔드(임계값 소유)에서 계산해 그대로 내려준다.
  const currentAt = feedThreshold(level);
  const span = isMax ? 0 : feedThreshold(level + 1) - currentAt;
  const levelProgress =
    isMax || span <= 0
      ? 1
      : Math.max(0, Math.min(1, (row.feedConsumed - currentAt) / span));
  const feedToNextLevel = isMax
    ? 0
    : Math.max(0, feedThreshold(level + 1) - row.feedConsumed);

  return {
    stage: row.wormStage,
    progress: row.wormProgress,
    maxStage: MAX_WORM_STAGE,
    // 애벌레 레벨/먹이
    level,
    maxLevel: WORM_MAX_LEVEL,
    isMax,
    feed: row.feed,
    feedConsumed: row.feedConsumed,
    levelProgress, // 0~1 현재 레벨 진행도
    feedToNextLevel, // 다음 레벨까지 남은 먹이 수
    equipped: {
      hat: row.equippedHat,
      body: row.equippedBody,
      accessory: row.equippedAccessory,
    },
  };
}

@Injectable()
export class WormService {
  constructor(private readonly prisma: PrismaService) {}

  async getWormState(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: WORM_STATE_SELECT,
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return toWormStateResponse(user);
  }

  // 애벌레에게 먹이 1개를 먹인다 — feed -1, feedConsumed +1, 레벨 재계산.
  async feedWorm(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { feed: true, feedConsumed: true },
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    if (user.feed <= 0) {
      throw new BadRequestException(
        '먹이가 없어요. 개념을 클리어해 먹이를 모아보세요.',
      );
    }

    const feedConsumed = user.feedConsumed + 1;
    const wormLevel = levelForConsumed(feedConsumed);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        feed: { decrement: 1 },
        feedConsumed,
        wormLevel,
      },
      select: WORM_STATE_SELECT,
    });

    return toWormStateResponse(updated);
  }

  async equip(userId: string, slot: EquipSlot, shopItemId: string) {
    const [item, owned, user] = await Promise.all([
      this.prisma.shopItem.findUnique({
        where: { id: shopItemId },
        select: { id: true, category: true, unlockStage: true },
      }),
      this.prisma.inventory.findUnique({
        where: { userId_shopItemId: { userId, shopItemId } },
        select: { id: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { wormStage: true },
      }),
    ]);

    if (!item) throw new NotFoundException('아이템을 찾을 수 없습니다.');
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    if (item.category !== slot) {
      throw new BadRequestException(
        '아이템 카테고리가 슬롯과 일치하지 않습니다.',
      );
    }
    if (!owned) throw new ForbiddenException('보유하지 않은 아이템입니다.');
    if (user.wormStage < item.unlockStage) {
      throw new ForbiddenException('아직 잠금 해제되지 않은 아이템입니다.');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { [SLOT_TO_FIELD[slot]]: shopItemId },
      select: WORM_STATE_SELECT,
    });

    return toWormStateResponse(updated);
  }

  async unequip(userId: string, slot: EquipSlot) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { [SLOT_TO_FIELD[slot]]: null },
      select: WORM_STATE_SELECT,
    });

    return toWormStateResponse(updated);
  }
}
