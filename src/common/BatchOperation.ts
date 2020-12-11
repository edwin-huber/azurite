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
  public batchType: BatchType;
  public verb?: string;
  public path?: string;
  public batchOperationType?: BatchOperationType;
  public jsonRequestBody?: string; // maybe we want the entity operation to be stored in a parsed format?
  public constructor(_batchType: BatchType) {
    this.batchType = _batchType;
  }
}
