// Class Validator
import { IsNotEmpty } from 'class-validator';

// Interfaces
import { ILogin } from '../interfaces/authentication.interface';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

export class LoginUsernameDto {
  @ApiProperty()
  @IsNotEmpty()
  public username!: string;

  @ApiProperty()
  @IsNotEmpty()
  public password!: string;
}

export class LoginWithAccessToken implements ILogin {
  @ApiProperty()
  public accessToken!: string;
}
