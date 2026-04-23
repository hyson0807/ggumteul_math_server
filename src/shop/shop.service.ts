import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { USER_PUBLIC_SELECT } from '../common/constants/user-select';
import { SHOP_ITEM_PUBLIC_SELECT } from '../common/constants/shop-select';

@Injectable()
export class ShopService {
  constructor(private readonly prisma: PrismaService) {}

  async listItems(userId: string) {
    const [items, inventory, user] = await Promise.all([
      this.prisma.shopItem.findMany({
        select: SHOP_ITEM_PUBLIC_SELECT,
        orderBy: [{ category: 'asc' }, { unlockStage: 'asc' }, { price: 'asc' }],
      }),
      this.prisma.inventory.findMany({
        where: { userId },
        select: { shopItemId: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          equippedHatId: true,
          equippedBodyId: true,
          equippedAccessoryId: true,
        },
      }),
    ]);

    const ownedSet = new Set(inventory.map((i) => i.shopItemId));
    const equippedSet = new Set(
      [user?.equippedHatId, user?.equippedBodyId, user?.equippedAccessoryId].filter(
        (v): v is string => typeof v === 'string',
      ),
    );

    return items.map((item) => ({
      ...item,
      owned: ownedSet.has(item.id),
      equipped: equippedSet.has(item.id),
    }));
  }

  async listInventory(userId: string) {
    const [records, user] = await Promise.all([
      this.prisma.inventory.findMany({
        where: { userId },
        select: {
          id: true,
          purchasedAt: true,
          shopItem: { select: SHOP_ITEM_PUBLIC_SELECT },
        },
        orderBy: { purchasedAt: 'desc' },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          equippedHatId: true,
          equippedBodyId: true,
          equippedAccessoryId: true,
        },
      }),
    ]);

    const equippedSet = new Set(
      [user?.equippedHatId, user?.equippedBodyId, user?.equippedAccessoryId].filter(
        (v): v is string => typeof v === 'string',
      ),
    );

    return records.map((r) => ({
      inventoryId: r.id,
      purchasedAt: r.purchasedAt,
      equipped: equippedSet.has(r.shopItem.id),
      item: r.shopItem,
    }));
  }

  async purchase(userId: string, shopItemId: string) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.shopItem.findUnique({
        where: { id: shopItemId },
        select: { id: true, price: true, unlockStage: true },
      });
      if (!item) throw new NotFoundException('아이템을 찾을 수 없습니다.');

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { coins: true, wormStage: true },
      });
      if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

      if (user.wormStage < item.unlockStage) {
        throw new ForbiddenException('아직 잠금 해제되지 않은 아이템입니다.');
      }
      if (user.coins < item.price) {
        throw new BadRequestException('코인이 부족합니다.');
      }

      try {
        const [updatedUser] = await Promise.all([
          tx.user.update({
            where: { id: userId },
            data: { coins: { decrement: item.price } },
            select: USER_PUBLIC_SELECT,
          }),
          tx.inventory.create({
            data: { userId, shopItemId },
          }),
        ]);
        return { user: updatedUser };
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002'
        ) {
          throw new ConflictException('이미 보유한 아이템입니다.');
        }
        throw e;
      }
    });
  }
}
