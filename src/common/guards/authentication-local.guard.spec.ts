import { AuthenticationLocalGuard } from './authentication-local.guard';

/**
 * The guard adds no behaviour of its own — it exists to bind the `local-auth` strategy
 * name to a class Nest can inject. A typo in that name compiles fine and only fails at
 * runtime with an unhelpful "Unknown authentication strategy", so the binding is the
 * one thing worth pinning; `LocalStrategy` registers under exactly this name.
 */
describe('AuthenticationLocalGuard', () => {
  it('is instantiable', () => {
    expect(new AuthenticationLocalGuard()).toBeInstanceOf(AuthenticationLocalGuard);
  });

  it('inherits canActivate from the passport guard', () => {
    expect(typeof new AuthenticationLocalGuard().canActivate).toBe('function');
  });
});
