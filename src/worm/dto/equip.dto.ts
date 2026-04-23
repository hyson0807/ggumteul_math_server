import { IsIn, IsString } from 'class-validator';
import { EQUIP_SLOTS, EquipSlot } from '../../common/constants/worm';

export class EquipDto {
  @IsIn(EQUIP_SLOTS as unknown as string[])
  slot!: EquipSlot;

  @IsString()
  shopItemId!: string;
}

export class UnequipDto {
  @IsIn(EQUIP_SLOTS as unknown as string[])
  slot!: EquipSlot;
}
