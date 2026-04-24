import { IsIn } from 'class-validator';

export class VersionCheckQueryDto {
  @IsIn(['ios', 'android'])
  platform: 'ios' | 'android';
}
