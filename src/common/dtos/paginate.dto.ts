// DTOs
import { PageMetaDto } from './page-meta.dto';

// Swagger
import { ApiProperty } from '@nestjs/swagger';

/**
 * https://pietrzakadrian.com/blog/how-to-create-pagination-in-nestjs-with-typeorm-swagger
 */
/**
 * @description One page of results: the rows, plus the metadata describing where the page sits
 * in the whole set.
 *
 * Generic over the row type so a single shape serves every list endpoint and the generated
 * OpenAPI still names the concrete model under `content`.
 */
export class PaginateDto<T> {
  @ApiProperty({ isArray: true })
  public content: T[];

  @ApiProperty({ type: () => PageMetaDto })
  public meta: PageMetaDto;

  constructor(content: T[], meta: PageMetaDto) {
    this.content = content;
    this.meta = meta;
  }
}
