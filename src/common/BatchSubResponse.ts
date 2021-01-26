import BatchOperation, { BatchType } from "./BatchOperation";

export default class BatchSubResponse {
  public batchType: BatchType;
  public batchOperations: BatchOperation[];

  public constructor(_batchType: BatchType, headers: string) {
    this.batchType = _batchType;
    const operation = new BatchOperation(this.batchType, headers);
    this.batchOperations = [operation];
  }
}
