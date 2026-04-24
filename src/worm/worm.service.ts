import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SHOP_ITEM_PUBLIC_SELECT } from '../common/constants/shop-select';
import { EquipSlot, MAX_WORM_STAGE } from '../common/constants/worm';

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
  equippedHat: { select: SHOP_ITEM_PUBLIC_SELECT },
  equippedBody: { select: SHOP_ITEM_PUBLIC_SELECT },
  equippedAccessory: { select: SHOP_ITEM_PUBLIC_SELECT },
} as const satisfies Prisma.UserSelect;

type WormStateRow = Prisma.UserGetPayload<{ select: typeof WORM_STATE_SELECT }>;

function toWormStateResponse(row: WormStateRow) {
  return {
    stage: row.wormStage,
    progress: row.wormProgress,
    maxStage: MAX_WORM_STAGE,
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
