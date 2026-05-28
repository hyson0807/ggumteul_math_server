import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { RoomService } from './room.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  EquipFurnitureDto,
  UnequipFurnitureDto,
} from './dto/equip-furniture.dto';

@Controller('room')
@UseGuards(JwtAuthGuard)
export class RoomController {
  constructor(private readonly room: RoomService) {}

  @Get()
  get(@CurrentUser('sub') userId: string) {
    return this.room.getRoomState(userId);
  }

  @Post('equip')
  equip(@CurrentUser('sub') userId: string, @Body() dto: EquipFurnitureDto) {
    return this.room.equip(userId, dto.slot, dto.shopItemId);
  }

  @Post('unequip')
  unequip(
    @CurrentUser('sub') userId: string,
    @Body() dto: UnequipFurnitureDto,
  ) {
    return this.room.unequip(userId, dto.slot);
  }
}
