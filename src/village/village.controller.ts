import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { VillageService } from './village.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('buildings')
@UseGuards(JwtAuthGuard)
export class VillageController {
  constructor(private readonly village: VillageService) {}

  @Get()
  list(@CurrentUser('sub') userId: string) {
    return this.village.listForUser(userId);
  }

  @Post(':type/upgrade')
  upgrade(
    @CurrentUser('sub') userId: string,
    @Param('type') type: string,
  ) {
    return this.village.upgrade(userId, type);
  }
}
