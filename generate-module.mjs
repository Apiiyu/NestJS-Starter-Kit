// Chalk
import chalk from 'chalk';

// File System
import fs from 'fs';

// Path
import path from 'path';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(chalk.red('Please provide a module name. For example: bun generate-module.mjs users'));
} else {
  const moduleName = args[0];
  const capitalizedModuleName = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
  const kebabCaseModuleName = moduleName.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
  const modulePath = path.join('src', 'modules', moduleName);

  try {
    fs.mkdirSync(modulePath, { recursive: true });

    // Folder order mirrors src/modules/users and src/modules/authentication: constants and
    // interfaces are their own folders so services, repositories, and controllers stay
    // business logic only, per CLAUDE.md "Code conventions".
    const listFolderNames = ['constants', 'controllers', 'dtos', 'entities', 'interfaces', 'services'];

    listFolderNames.forEach((folderName) => {
      fs.mkdirSync(path.join(modulePath, folderName));

      switch (folderName) {
        case 'constants':
          fs.writeFileSync(
            path.join(modulePath, folderName, `${kebabCaseModuleName}.constant.ts`),
            `/**\n * @description Module-scope constants for ${capitalizedModuleName}. Anything a\n * repository, service, or controller in this module would otherwise declare at the top of\n * its own file belongs here instead — see CLAUDE.md "Code conventions".\n */\nexport {};\n`,
          );
          break;
        case 'controllers':
          fs.writeFileSync(
            path.join(modulePath, folderName, `${kebabCaseModuleName}.controller.ts`),
            `// NestJS Libraries\nimport { Controller } from '@nestjs/common';\n\n/**\n * @description Describe what this controller exposes and why it exists.\n */\n@Controller('${kebabCaseModuleName}')\nexport class ${capitalizedModuleName}Controller {}\n`,
          );
          fs.writeFileSync(
            path.join(modulePath, folderName, `${kebabCaseModuleName}.controller.spec.ts`),
            `// Controllers\nimport { ${capitalizedModuleName}Controller } from './${kebabCaseModuleName}.controller';\n\n// NestJS Libraries\nimport { Test } from '@nestjs/testing';\nimport type { TestingModule } from '@nestjs/testing';\n\ndescribe('${capitalizedModuleName}Controller', () => {\n  let controller: ${capitalizedModuleName}Controller;\n\n  beforeEach(async () => {\n    const module: TestingModule = await Test.createTestingModule({\n      controllers: [${capitalizedModuleName}Controller],\n    }).compile();\n    controller = module.get<${capitalizedModuleName}Controller>(${capitalizedModuleName}Controller);\n  });\n\n  it('should be defined', () => {\n    expect(controller).toBeDefined();\n  });\n});\n`,
          );
          break;
        case 'entities':
          fs.writeFileSync(
            path.join(modulePath, folderName, `${kebabCaseModuleName}.entity.ts`),
            `// Entities\nimport { AppBaseEntity } from '../../../common/entities/base.entity';\n\n// TypeORM\nimport { Entity } from 'typeorm';\n\n/**\n * @description Describe what this entity represents.\n *\n * Extends \`AppBaseEntity\` (UUID primary key, camelCase native timestamptz audit columns,\n * and \`@DeleteDateColumn\` soft deletes). Mapping a table this application does not own? Map\n * every column explicitly instead, and follow src/modules/users/entities as the reference.\n */\n@Entity({ name: '${kebabCaseModuleName}' })\nexport class ${capitalizedModuleName}Entity extends AppBaseEntity {}\n`,
          );
          break;
        case 'interfaces':
          fs.writeFileSync(
            path.join(modulePath, folderName, `${kebabCaseModuleName}.interface.ts`),
            `/**\n * @description Module-scope types for ${capitalizedModuleName}. Anything a repository,\n * service, or controller in this module would otherwise declare at the top of its own file\n * belongs here instead — see CLAUDE.md "Code conventions".\n */\nexport {};\n`,
          );
          break;
        case 'services':
          fs.writeFileSync(
            path.join(modulePath, folderName, `${kebabCaseModuleName}.service.ts`),
            `// NestJS Libraries\nimport { Injectable } from '@nestjs/common';\n\n/**\n * @description Describe what this service is responsible for.\n */\n@Injectable()\nexport class ${capitalizedModuleName}Service {}\n`,
          );
          fs.writeFileSync(
            path.join(modulePath, folderName, `${kebabCaseModuleName}.service.spec.ts`),
            `// NestJS Libraries\nimport { Test } from '@nestjs/testing';\nimport type { TestingModule } from '@nestjs/testing';\n\n// Services\nimport { ${capitalizedModuleName}Service } from './${kebabCaseModuleName}.service';\n\ndescribe('${capitalizedModuleName}Service', () => {\n  let service: ${capitalizedModuleName}Service;\n\n  beforeEach(async () => {\n    const module: TestingModule = await Test.createTestingModule({\n      providers: [${capitalizedModuleName}Service],\n    }).compile();\n    service = module.get<${capitalizedModuleName}Service>(${capitalizedModuleName}Service);\n  });\n\n  it('should be defined', () => {\n    expect(service).toBeDefined();\n  });\n});\n`,
          );
          break;
        default:
          fs.closeSync(fs.openSync(path.join(modulePath, folderName, '.gitkeep'), 'w'));
          break;
      }
    });

    // After creating all the folders and files, create the module wiring file.
    fs.writeFileSync(
      path.join(modulePath, `${kebabCaseModuleName}.module.ts`),
      `// NestJS Libraries\nimport { Module } from '@nestjs/common';\n\n// Services\nimport { ${capitalizedModuleName}Service } from './services/${kebabCaseModuleName}.service';\n\n/**\n * @description Wires up the ${capitalizedModuleName} module. Update the controllers,\n * providers, and exports below once the module has something to expose — see\n * src/modules/users/users.module.ts for a straightforward feature module and\n * src/modules/authentication/authentication.module.ts for one with async configuration.\n */\n@Module({\n  providers: [${capitalizedModuleName}Service],\n  exports: [${capitalizedModuleName}Service],\n})\nexport class ${capitalizedModuleName}Module {}\n`,
    );

    // The public barrel every other module must import through instead of reaching inside
    // this folder — dependency-cruiser enforces the boundary, this file defines its shape.
    fs.writeFileSync(
      path.join(modulePath, 'index.ts'),
      `/**\n * @description The public surface of the ${capitalizedModuleName} module. Other feature\n * modules import from here and never reach inside the folder.\n */\nexport { ${capitalizedModuleName}Module } from './${kebabCaseModuleName}.module';\nexport { ${capitalizedModuleName}Service } from './services/${kebabCaseModuleName}.service';\n`,
    );

    console.log(
      chalk.green(`Module "${moduleName}" created successfully. Check the "src/modules/${moduleName}" folder.`),
    );
    console.log(
      chalk.yellow(
        `Reminder: this module is already gated by scripts/check-conventions.ts, so fill in constants/, interfaces/, and every @description placeholder before committing — 'bun run lint:check' will fail otherwise.`,
      ),
    );
  } catch (err) {
    console.error(chalk.red(`Error creating module "${moduleName}". Please check if it already exists.`));
  }
}
