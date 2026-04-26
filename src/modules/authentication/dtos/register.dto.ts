// Class Validator
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

export class RegisterEmailDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  public username!: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  public email!: string;

  @ApiProperty()
  @IsNotEmpty()
  public password!: string;
}
