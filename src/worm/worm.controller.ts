import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { WormService } from './worm.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { EquipDto, UnequipDto } from './dto/equip.dto';

@Controller('worm')
@UseGuards(JwtAuthGuard)
export class WormController {
  constructor(private readonly worm: WormService) {}

  @Get()
  get(@CurrentUser('sub') userId: string) {
    return this.worm.getWormState(userId);
  }

  @Post('equip')
  equip(@CurrentUser('sub') userId: string, @Body() dto: EquipDto) {
    return this.worm.equip(userId, dto.slot, dto.shopItemId);
  }

  @Post('unequip')
  unequip(@CurrentUser('sub') userId: string, @Body() dto: UnequipDto) {
    return this.worm.unequip(userId, dto.slot);
  }
}
