import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class WormPositionDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  x!: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  y!: number;
}

export class FurnitureSlotPositionDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  x!: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  y!: number;

  @IsNumber()
  @Min(-360)
  @Max(360)
  rotate!: number;

  @IsBoolean()
  flipX!: boolean;
}

export class RoomLayoutDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => WormPositionDto)
  worm?: WormPositionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FurnitureSlotPositionDto)
  desk?: FurnitureSlotPositionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FurnitureSlotPositionDto)
  shelf?: FurnitureSlotPositionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FurnitureSlotPositionDto)
  clock?: FurnitureSlotPositionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FurnitureSlotPositionDto)
  bed?: FurnitureSlotPositionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FurnitureSlotPositionDto)
  light?: FurnitureSlotPositionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FurnitureSlotPositionDto)
  rug?: FurnitureSlotPositionDto;
}

export class SaveRoomLayoutDto {
  @IsObject()
  @ValidateNested()
  @Type(() => RoomLayoutDto)
  layout!: RoomLayoutDto;
}
