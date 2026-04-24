import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ShopService } from './shop.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PurchaseDto } from './dto/purchase.dto';

@Controller('shop')
@UseGuards(JwtAuthGuard)
export class ShopController {
  constructor(private readonly shop: ShopService) {}

  @Get('items')
  items(@CurrentUser('sub') userId: string) {
    return this.shop.listItems(userId);
  }

  @Get('inventory')
  inventory(@CurrentUser('sub') userId: string) {
    return this.shop.listInventory(userId);
  }

  @Post('purchase')
  purchase(@CurrentUser('sub') userId: string, @Body() dto: PurchaseDto) {
    return this.shop.purchase(userId, dto.shopItemId);
  }
}
