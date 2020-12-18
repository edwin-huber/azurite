import { HttpMethod } from "../blob/generated/IRequest";

export enum BatchType {
  blob = "blob",
  table = "table"
}

export enum BatchOperationType {
  unknown = "unknown",
  insert = "insert",
  delete = "delete",
  upsert = "upsert",
  query = "query",
  merge = "merge"
}

// Holder for batch operations
export default class BatchOperation {
  public rawHeaders: string[];
  public batchType: BatchType;
  public httpMethod?: HttpMethod;
  public url?: string;
  public path?: string;
  public batchOperationType?: BatchOperationType;
  public jsonRequestBody?: string; // maybe we want the entity operation to be stored in a parsed format?
  public constructor(_batchType: BatchType, headers: string) {
    this.batchType = _batchType;
    let dirtyHeaderArray = headers.split("\n");
    // filter out the blanks
    this.rawHeaders = dirtyHeaderArray.filter(
      candidate => candidate.search(/\S/) < 1
    );
  }
}
