/**
 * @description Enforces the three readability conventions this codebase commits to: every
 * declaration carries a JSDoc `@description`, class members are ordered private-then-public
 * with each group alphabetical, and constants and types live in their own folders rather
 * than at the top of a service or repository.
 *
 * It is a script rather than ESLint rules on purpose. `import/order` is already disabled in
 * eslint.config.mjs because eslint-plugin-import does not work under ESLint 10, and adding
 * another plugin would put these rules behind the same risk. The TypeScript compiler API is
 * already a dependency and does not move.
 *
 * The `RATCHETED_PATHS` list below is the point of the design. A starter kit ships fully
 * converted, so the list covers all of `src`. In a project grown from this kit the same list
 * is how a partial conversion is held: a path in the list can never regress, and code outside
 * it cannot stay outside forever.
 */

// Node Libraries
import { globSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import process from 'node:process';

// TypeScript
import ts from 'typescript';

/**
 * @description The folders the conventions are enforced in. Add a glob here the moment a
 * domain is converted — never remove one.
 */
const RATCHETED_PATHS: readonly string[] = ['src/**/*.ts'];

/**
 * @description Folders whose files must contain business logic only. A module-scope constant
 * or type in one of these is what the `constants/` and `interfaces/` folders exist to hold.
 */
const LOGIC_ONLY_FOLDERS: readonly string[] = [
  '/controllers/',
  '/filters/',
  '/guards/',
  '/interceptors/',
  '/processors/',
  '/repositories/',
  '/services/',
  '/stores/',
  '/strategies/',
];

/**
 * @description Files exempt from the declaration-placement rule because declaring values is
 * the whole job of the file. Moving their contents elsewhere would leave an empty shell.
 */
const PLACEMENT_EXEMPT: readonly string[] = [
  'src/configurations/app/app-env.validation.ts',
  'src/database/postgres/postgres-data-source.ts',
  'src/instrumentation.ts',
];

/**
 * @description Folders exempt from the member-order rule because their class shape is decided
 * by a code generator rather than by an author.
 *
 * `migration:generate` emits `up` before `down`, which is also the order the pair reads in.
 * Alphabetical ordering would put `down` first, so every freshly generated migration would
 * fail this gate and have to be hand-edited back — friction on every schema change, for no
 * readability gain. The rule exists to stop a reader jumping around a long service; a
 * migration has exactly two methods and neither calls the other.
 */
const MEMBER_ORDER_EXEMPT_FOLDERS: readonly string[] = ['/database/postgres/migrations/'];

/**
 * @description One convention violation, ready to print.
 */
interface IViolation {
  file: string;
  line: number;
  rule: string;
  message: string;
}

/**
 * @description Reads the name of a class member as written in the source, or an empty string
 * for members whose name is computed and therefore cannot be ordered alphabetically.
 *
 * @param member The class member to name.
 */
function memberName(member: ts.ClassElement): string {
  return member.name !== undefined && ts.isIdentifier(member.name) ? member.name.text : '';
}

/**
 * @description Decides whether a declaration carries a JSDoc block containing an explicit
 * `@description` tag.
 *
 * A bare JSDoc comment is not enough. Requiring the tag is what stops the convention decaying
 * into one-line restatements of the member's own name, because writing `@description` makes
 * the author state what the thing is *for*.
 *
 * @param node The declaration to inspect.
 * @param text The full source text of the file.
 */
function hasDescription(node: ts.Node, text: string): boolean {
  const ranges = ts.getLeadingCommentRanges(text, node.pos) ?? [];

  return ranges.some((range) => {
    const comment = text.slice(range.pos, range.end);

    return comment.startsWith('/**') && comment.includes('@description');
  });
}

/**
 * @description Reports every declaration in a file that is missing a JSDoc `@description`.
 *
 * Constructors are skipped: a constructor's job is described by its class, and demanding a
 * separate block for it produces noise rather than explanation.
 *
 * @param source The parsed file.
 * @param text The full source text.
 * @param file The path to report violations against.
 */
function checkDescriptions(source: ts.SourceFile, text: string, file: string): IViolation[] {
  const violations: IViolation[] = [];

  const report = (node: ts.Node, what: string): void => {
    if (hasDescription(node, text)) {
      return;
    }

    violations.push({
      file,
      line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
      rule: 'require-description',
      message: `${what} has no JSDoc @description`,
    });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isClassDeclaration(node) && node.name) {
      report(node, `class ${node.name.text}`);
    }

    if (ts.isInterfaceDeclaration(node)) {
      report(node, `interface ${node.name.text}`);
    }

    if (ts.isTypeAliasDeclaration(node)) {
      report(node, `type ${node.name.text}`);
    }

    if (ts.isFunctionDeclaration(node) && node.name) {
      report(node, `function ${node.name.text}`);
    }

    if (ts.isMethodDeclaration(node)) {
      report(node, `method ${memberName(node)}`);
    }

    if (ts.isVariableStatement(node) && node.parent === source) {
      for (const declaration of node.declarationList.declarations) {
        report(node, `const ${declaration.name.getText(source)}`);
      }
    }

    ts.forEachChild(node, visit);
  };

  ts.forEachChild(source, visit);

  return violations;
}

/**
 * @description Reports class methods that are out of order.
 *
 * The required order is every private method, then every public one, each group sorted
 * alphabetically. Private-first is what puts a helper above the method that calls it, which
 * is how the code reads top to bottom instead of forcing the reader to jump ahead.
 *
 * @param source The parsed file.
 * @param file The path to report violations against.
 */
function checkMemberOrder(source: ts.SourceFile, file: string): IViolation[] {
  const normalized = `/${file.replaceAll('\\', '/')}`;

  if (MEMBER_ORDER_EXEMPT_FOLDERS.some((folder) => normalized.includes(folder))) {
    return [];
  }

  const violations: IViolation[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isClassDeclaration(node)) {
      const methods = node.members.filter(ts.isMethodDeclaration);
      const isPrivate = (member: ts.MethodDeclaration): boolean =>
        member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.PrivateKeyword) ??
        false;
      const expected = [
        ...methods.filter(isPrivate).sort((a, b) => memberName(a).localeCompare(memberName(b))),
        ...methods
          .filter((member) => !isPrivate(member))
          .sort((a, b) => memberName(a).localeCompare(memberName(b))),
      ];

      for (const [index, method] of methods.entries()) {
        const expectedMethod = expected.at(index);

        if (method === expectedMethod) {
          continue;
        }

        violations.push({
          file,
          line: source.getLineAndCharacterOfPosition(method.getStart(source)).line + 1,
          rule: 'member-order',
          message: `${memberName(method)} is out of order — expected ${expectedMethod ? memberName(expectedMethod) : 'nothing'}. Private methods first, then public, each alphabetical`,
        });
      }
    }

    ts.forEachChild(node, visit);
  };

  ts.forEachChild(source, visit);

  return violations;
}

/**
 * @description Where a misplaced declaration should go, and what to call it in the message.
 */
interface IMisplaced {
  what: string;
  target: string;
}

/** @description Destination for values and enums lifted out of a logic file. */
const CONSTANTS_TARGET = 'constants/<domain>.constant.ts';

/** @description Destination for types and interfaces lifted out of a logic file. */
const INTERFACES_TARGET = 'interfaces/<domain>.interface.ts';

/**
 * @description Classifies one module-scope statement, returning where each declaration it
 * introduces ought to live. Returns an empty array for statements that are allowed at module
 * scope, such as imports and the class itself.
 *
 * @param statement The top-level statement to classify.
 * @param source The parsed file, needed to read declaration names as written.
 */
function misplacedIn(statement: ts.Statement, source: ts.SourceFile): IMisplaced[] {
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations.map((declaration) => {
      const initializer = declaration.initializer;
      // A const holding a function is not a constant at all — it is a helper, and a helper
      // belongs on the class it helps rather than in a file of values.
      const holdsFunction =
        initializer !== undefined &&
        (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer));

      return {
        what: `const ${declaration.name.getText(source)}`,
        target: holdsFunction ? 'a private method on the class' : CONSTANTS_TARGET,
      };
    });
  }

  if (ts.isTypeAliasDeclaration(statement)) {
    return [{ what: `type ${statement.name.text}`, target: INTERFACES_TARGET }];
  }

  if (ts.isInterfaceDeclaration(statement)) {
    return [{ what: `interface ${statement.name.text}`, target: INTERFACES_TARGET }];
  }

  if (ts.isEnumDeclaration(statement)) {
    return [{ what: `enum ${statement.name.text}`, target: CONSTANTS_TARGET }];
  }

  return [];
}

/**
 * @description Reports constants and types declared at the top of a file whose job is
 * business logic.
 *
 * Only module scope is checked. A `const` inside a function or a method body is genuinely
 * local and stays exactly where it is — moving those would cost the reader locality and buy
 * nothing.
 *
 * @param source The parsed file.
 * @param file The path to report violations against.
 */
function checkPlacement(source: ts.SourceFile, file: string): IViolation[] {
  const normalized = `/${file.replaceAll('\\', '/')}`;

  if (
    !LOGIC_ONLY_FOLDERS.some((folder) => normalized.includes(folder)) ||
    PLACEMENT_EXEMPT.includes(file)
  ) {
    return [];
  }

  return source.statements.flatMap((statement) =>
    misplacedIn(statement, source).map((misplaced) => ({
      file,
      line: source.getLineAndCharacterOfPosition(statement.getStart(source)).line + 1,
      rule: 'declaration-placement',
      message: `${misplaced.what} is declared here — move it to ${misplaced.target}`,
    })),
  );
}

/**
 * @description Entry point. Checks every ratcheted file and prints each violation with the
 * file, line, rule, and what to do about it, then exits non-zero if there were any.
 */
function main(): void {
  const files = RATCHETED_PATHS.flatMap((pattern) => globSync(pattern))
    .filter((file) => !file.endsWith('.spec.ts'))
    .sort();
  const violations: IViolation[] = [];

  for (const file of files) {
    const text = readFileSync(resolve(file), 'utf8');
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true);
    const relativePath = relative(process.cwd(), resolve(file));

    violations.push(
      ...checkDescriptions(source, text, relativePath),
      ...checkMemberOrder(source, relativePath),
      ...checkPlacement(source, relativePath),
    );
  }

  if (violations.length === 0) {
    return;
  }

  const lines = violations.map(
    (violation) => `  ${violation.file}:${violation.line}  ${violation.rule}  ${violation.message}`,
  );

  process.stderr.write(
    `Convention check failed with ${violations.length} violation(s):\n${lines.join('\n')}\n\n` +
      'See CLAUDE.md "Code conventions" for what each rule means.\n',
  );
  process.exit(1);
}

main();
