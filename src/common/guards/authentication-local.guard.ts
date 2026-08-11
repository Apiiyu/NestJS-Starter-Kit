// NestJS Libraries
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * @description Activates the username-and-password strategy, used only on the login route.
 *
 * Passing the credential check attaches the authenticated user to the request, which is how
 * the login handler gets a user without querying for one itself.
 */
@Injectable()
export class AuthenticationLocalGuard extends AuthGuard('local-auth') {}
