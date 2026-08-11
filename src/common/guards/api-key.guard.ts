// Constants
import { API_KEY_STRATEGY } from '../constants/api-key.constant';

// NestJS Libraries
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * @description Activates the API-key strategy on the routes it guards.
 *
 * An empty subclass because `AuthGuard` already does the work; it exists so the strategy name
 * is written once and routes refer to a class rather than a string literal.
 */
@Injectable()
export class ApiKeyGuard extends AuthGuard(API_KEY_STRATEGY) {}
