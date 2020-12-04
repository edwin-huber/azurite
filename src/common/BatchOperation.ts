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

export default class BatchOperation {
  public batchType: BatchType;
  public batchOperationType: BatchOperationType;
  public constructor(
    _batchType: BatchType,
    _batchOperationType: BatchOperationType
  ) {
    this.batchType = _batchType;
    this.batchOperationType = _batchOperationType;
  }
}
