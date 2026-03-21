import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly user: UserService) {}

  @Get('me')
  getMe(@CurrentUser('sub') userId: string) {
    return this.user.getMe(userId);
  }

  @Patch('me')
  updateMe(
    @CurrentUser('sub') userId: string,
    @Body() data: { name?: string; tutorType?: string },
  ) {
    return this.user.updateMe(userId, data);
  }

  @Delete('me')
  deleteMe(@CurrentUser('sub') userId: string) {
    return this.user.deleteMe(userId);
  }
}
