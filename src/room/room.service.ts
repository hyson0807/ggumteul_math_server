import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SHOP_ITEM_PUBLIC_SELECT } from '../common/constants/shop-select';
import { ROOM_SLOT_TO_FIELD, RoomSlot } from '../common/constants/room';

const ROOM_STATE_SELECT = {
  equippedDesk: { select: SHOP_ITEM_PUBLIC_SELECT },
  equippedShelf: { select: SHOP_ITEM_PUBLIC_SELECT },
  equippedClock: { select: SHOP_ITEM_PUBLIC_SELECT },
  equippedBed: { select: SHOP_ITEM_PUBLIC_SELECT },
  equippedLight: { select: SHOP_ITEM_PUBLIC_SELECT },
  equippedRug: { select: SHOP_ITEM_PUBLIC_SELECT },
  equippedWallpaper: { select: SHOP_ITEM_PUBLIC_SELECT },
} as const satisfies Prisma.UserSelect;

type RoomStateRow = Prisma.UserGetPayload<{ select: typeof ROOM_STATE_SELECT }>;

function toRoomStateResponse(row: RoomStateRow) {
  return {
    equipped: {
      desk: row.equippedDesk,
      shelf: row.equippedShelf,
      clock: row.equippedClock,
      bed: row.equippedBed,
      light: row.equippedLight,
      rug: row.equippedRug,
      wallpaper: row.equippedWallpaper,
    },
  };
}

@Injectable()
export class RoomService {
  constructor(private readonly prisma: PrismaService) {}

  async getRoomState(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: ROOM_STATE_SELECT,
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return toRoomStateResponse(user);
  }

  async equip(userId: string, slot: RoomSlot, shopItemId: string) {
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
      data: { [ROOM_SLOT_TO_FIELD[slot]]: shopItemId },
      select: ROOM_STATE_SELECT,
    });

    return toRoomStateResponse(updated);
  }

  async unequip(userId: string, slot: RoomSlot) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { [ROOM_SLOT_TO_FIELD[slot]]: null },
      select: ROOM_STATE_SELECT,
    });

    return toRoomStateResponse(updated);
  }
}
