export enum BatchType {
  blob = "blob",
  table = "table"
}

export default class BatchOperation {
  public batchType: BatchType;

  public constructor(_batchType: BatchType) {
    this.batchType = _batchType;
  }
}
