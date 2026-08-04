// Constants
import type { UserRole } from '../constants/role.constant';

// NestJS Libraries
import { SetMetadata } from '@nestjs/common';
import type { CustomDecorator } from '@nestjs/common';

/**
 * @description Metadata key `RolesGuard` reads. Exported so the guard and the tests
 * refer to the same string rather than two copies of a literal that can drift apart.
 */
export const ROLES_KEY = 'roles';

/**
 * @description Restrict a route, or a whole controller, to the listed roles.
 *
 * This only declares intent — nothing is enforced unless `RolesGuard` is also applied,
 * which is the one sharp edge of the pattern: a route carrying `@Roles()` and no guard
 * is wide open while looking protected. Attach both together, and prefer putting
 * `@UseGuards(JwtAuthGuard, RolesGuard)` on the controller so a newly added handler
 * cannot miss them.
 */
export const Roles = (...roles: UserRole[]): CustomDecorator<string> =>
  SetMetadata(ROLES_KEY, roles);
