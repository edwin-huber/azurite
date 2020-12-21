import { exception } from "console";
import { Stream } from "stream";
import IRequest, { HttpMethod } from "../table/generated/IRequest";
import BatchOperation from "./BatchOperation";
import BatchRequestHeaders from "./BatchRequestHeaders";

export default class BatchRequest implements IRequest {
  public constructor(batchOperation: BatchOperation) {
    this.batchOperation = batchOperation;
    this.headers = new BatchRequestHeaders(batchOperation.rawHeaders);
  }
  public response?: any;

  private headers: BatchRequestHeaders;

  private batchOperation: BatchOperation;

  getMethod(): HttpMethod {
    if (this.batchOperation.httpMethod != null) {
      return this.batchOperation.httpMethod;
    } else {
      throw exception("httpMethod invalid on batch operation");
    }
  }
  getUrl(): string {
    // ToDo: is this a valid assumption for the batch API?
    // ToDo: here we also assume https, which is also not true...
    // we need to parse this from the request
    // return `https://${this.accountName}.${this.batchOperation.batchType}.core.windows.net/$batch`;
    if (this.batchOperation.uri != null && this.batchOperation.path != null) {
      return this.batchOperation.uri.substring(
        0,
        this.batchOperation.uri.length - this.batchOperation.path.length
      );
    } else {
      throw exception("uri or path null when calling getUrl on BatchRequest");
    }
  }
  getEndpoint(): string {
    throw new Error("Method not implemented.");
  }
  getPath(): string {
    if (this.batchOperation.path != null) {
      return this.batchOperation.path;
    } else {
      throw exception("path null  when calling getPath on BatchRequest");
    }
  }
  getBodyStream(): NodeJS.ReadableStream {
    if (this.batchOperation.jsonRequestBody != null) {
      return Stream.Readable.from(this.batchOperation.jsonRequestBody);
    } else {
      throw exception("body null  when calling getBodyStream on BatchRequest");
    }
  }
  // hoping we dont need this right now!
  setBody(body: string | undefined): IRequest {
    throw new Error("Method not implemented.");
  }
  getBody(): string | undefined {
    if (this.batchOperation.jsonRequestBody != null) {
      return this.batchOperation.jsonRequestBody;
    } else {
      throw exception("body null  when calling getBody on BatchRequest");
    }
  }
  getHeader(field: string): string | undefined {
    return this.headers.header(field);
  }
  getHeaders(): { [header: string]: string | string[] | undefined } {
    throw new Error("Method not implemented.");
  }
  getRawHeaders(): string[] {
    return this.batchOperation.rawHeaders;
  }
  getQuery(key: string): string | undefined {
    throw new Error("Method not implemented.");
  }
  getProtocol(): string {
    if (this.batchOperation.protocol != null) {
      return this.batchOperation.protocol;
    } else {
      throw exception(
        "protocol null  when calling getProtocol on BatchRequest"
      );
    }
  }
}
