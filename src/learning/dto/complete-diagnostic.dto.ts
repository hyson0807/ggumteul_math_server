import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { DIAGNOSTIC_PROBLEM_COUNT } from '../../common/constants/diagnostic';

export class DiagnosticAnswerDto {
  @IsInt()
  problemId!: number;

  @IsString()
  @MaxLength(50)
  answer!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3600)
  timeSpent?: number;
}

export class CompleteDiagnosticDto {
  @IsInt()
  @Min(1)
  @Max(3)
  grade!: 1 | 2 | 3;

  @ValidateNested({ each: true })
  @Type(() => DiagnosticAnswerDto)
  @ArrayMinSize(DIAGNOSTIC_PROBLEM_COUNT)
  @ArrayMaxSize(DIAGNOSTIC_PROBLEM_COUNT)
  answers!: DiagnosticAnswerDto[];
}
