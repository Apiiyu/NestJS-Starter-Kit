/**
 * @description The envelope every successful response is wrapped in.
 *
 * One shape for all endpoints means a client writes one parser. The error envelope mirrors
 * these three fields deliberately, so success and failure differ in content rather than in
 * structure.
 */
export class BaseResponseDto<T> {
  public statusCode: number;
  public message: string;
  public data: T;

  constructor(data: IConstructBaseResponse<T>) {
    this.statusCode = data.statusCode;
    this.message = data.message;
    this.data = data.data;
  }
}
