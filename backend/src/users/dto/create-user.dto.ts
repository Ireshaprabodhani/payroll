import { IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsIn(['Admin', 'Payroll Manager', 'Executive', 'End User'])
  role: string;

  @IsOptional()
  @IsString()
  department?: string;
}
