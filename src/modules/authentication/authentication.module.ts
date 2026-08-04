// Controllers
import { AuthenticationController } from './controllers/authentication.controller';

// Types
import type ms from 'ms';

// Entities
import { RefreshTokenEntity } from './entities/refresh-token.entity';

// Modules
import { JwtConfigModule } from '../../configurations/jwt/jwt-configuration.module';
import { UsersModule } from '../users/users.module';

// NestJS Libraries
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

// Services
import { JwtConfigService } from '../../configurations/jwt/jwt-configuration.service';
import { AuthenticationService } from './services/authentication.service';
import { RefreshTokenService } from './services/refresh-token.service';

// Strategies
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { LocalStrategy } from '../../common/strategies/local.strategy';

@Module({
  imports: [
    JwtConfigModule,
    UsersModule,
    PassportModule,
    TypeOrmModule.forFeature([RefreshTokenEntity]),
    JwtModule.registerAsync({
      imports: [JwtConfigModule],
      useFactory: (configService: JwtConfigService) => ({
        secret: configService.jwtSecret,
        signOptions: {
          expiresIn: configService.jwtExp as ms.StringValue,
          issuer: configService.jwtIssuer,
        },
      }),
      inject: [JwtConfigService],
    }),
  ],
  controllers: [AuthenticationController],
  providers: [AuthenticationService, RefreshTokenService, LocalStrategy, JwtStrategy],
  exports: [RefreshTokenService],
})
export class AuthenticationModule {}
