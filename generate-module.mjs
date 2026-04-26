// Chalk
import chalk from 'chalk';

// File System
import fs from 'fs';

// Path
import path from 'path';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(chalk.red('Please provide a module name. For example: node generate-module.mjs users'));
} else {
  const moduleName = args[0];
  const capitalizedModuleName = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
  const kebabCaseModuleName = moduleName.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
  const modulePath = path.join('src', 'modules', moduleName);

  try {
    fs.mkdirSync(modulePath, { recursive: true });
    const listFolderNames = ['controllers', 'dtos', 'entities', 'interfaces', 'services'];

    // Create seperates folders and files
    listFolderNames.forEach(folderName => {
      fs.mkdirSync(path.join(modulePath, folderName));

      switch (folderName) {
        case 'controllers':
          fs.writeFileSync(
            path.join(modulePath, folderName, `${kebabCaseModuleName}.controller.ts`),
            `import { Controller } from '@nestjs/common'; \n\n@Controller('${kebabCaseModuleName}') \nexport class ${capitalizedModuleName}Controller {}`,
          );
          fs.writeFileSync(
            path.join(modulePath, folderName, `${kebabCaseModuleName}.controller.spec.ts`),
            `import { Test, TestingModule } from '@nestjs/testing';\nimport { ${capitalizedModuleName}Controller } from './${kebabCaseModuleName}.controller';\n\ndescribe('${capitalizedModuleName}Controller', () => {\n  let controller: ${capitalizedModuleName}Controller;\n\n  beforeEach(async () => {\n    const module: TestingModule = await Test.createTestingModule({\n      controllers: [${capitalizedModuleName}Controller],\n    }).compile();\n    controller = module.get<${capitalizedModuleName}Controller>(${capitalizedModuleName}Controller);\n  });\n\n  it('should be defined', () => {\n    expect(controller).toBeDefined();\n  });\n});\n`,
          );
          break;
        case 'entities':
          fs.writeFileSync(
            path.join(modulePath, folderName, `${kebabCaseModuleName}.entity.ts`),
            `import { AppBaseEntity } from '../../../common/entities/base.entity'; \n\nexport class ${capitalizedModuleName} extends AppBaseEntity {}`,
          );
          break;
        case 'interfaces':
          fs.closeSync(fs.openSync(path.join(modulePath, folderName, `${kebabCaseModuleName}.interface.ts`), 'w'));
          break;
        case 'services':
          fs.writeFileSync(
            path.join(modulePath, folderName, `${kebabCaseModuleName}.service.ts`),
            `import { Injectable } from '@nestjs/common'; \n\n@Injectable() \nexport class ${capitalizedModuleName}Service {}`,
          );
          fs.writeFileSync(
            path.join(modulePath, folderName, `${kebabCaseModuleName}.service.spec.ts`),
            `import { Test, TestingModule } from '@nestjs/testing';\nimport { ${capitalizedModuleName}Service } from './${kebabCaseModuleName}.service';\n\ndescribe('${capitalizedModuleName}Service', () => {\n  let service: ${capitalizedModuleName}Service;\n\n  beforeEach(async () => {\n    const module: TestingModule = await Test.createTestingModule({\n      providers: [${capitalizedModuleName}Service],\n    }).compile();\n    service = module.get<${capitalizedModuleName}Service>(${capitalizedModuleName}Service);\n  });\n\n  it('should be defined', () => {\n    expect(service).toBeDefined();\n  });\n});\n`,
          );
          break;
        default:
          fs.closeSync(fs.openSync(path.join(modulePath, folderName, '.gitkeep'), 'w'));
          break;
      }
    });

    // ? After creating all the folders and files, create the module index file
    fs.writeFileSync(
      path.join(modulePath, `${kebabCaseModuleName}.module.ts`),
      `import { Module } from '@nestjs/common'; \n\n@Module({}) \nexport class ${capitalizedModuleName}Module {}`,
    );

    console.log(
      chalk.green(`Module "${moduleName}" created successfully. Check the "src/modules/${moduleName}" folder.`),
    );
  } catch (err) {
    console.error(chalk.red(`Error creating module "${moduleName}". Please check if it already exists.`));
  }
}
