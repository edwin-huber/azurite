import BatchOperation, {
  BatchOperationType,
  BatchType
} from "./BatchOperation";

export default class BatchSubResponse {
  public batchType: BatchType;
  public batchOperations: BatchOperation[];

  public constructor(_batchType: BatchType) {
    this.batchType = _batchType;
    const operation = new BatchOperation(
      this.batchType,
      BatchOperationType.unknown
    );
    this.batchOperations = [operation];
  }
}
