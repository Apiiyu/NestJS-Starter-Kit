// Constants
import { API_KEY_STRATEGY } from '../constants/api-key.constant';

// NestJS Libraries
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class ApiKeyGuard extends AuthGuard(API_KEY_STRATEGY) {}
