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
