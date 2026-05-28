import { IsIn, IsString } from 'class-validator';
import { ROOM_SLOTS, RoomSlot } from '../../common/constants/room';

export class EquipFurnitureDto {
  @IsIn(ROOM_SLOTS as unknown as string[])
  slot!: RoomSlot;

  @IsString()
  shopItemId!: string;
}

export class UnequipFurnitureDto {
  @IsIn(ROOM_SLOTS as unknown as string[])
  slot!: RoomSlot;
}
