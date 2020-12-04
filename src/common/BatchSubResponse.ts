import BatchOperation from "./BatchOperation";
import BatchType from "./BatchOperation";

export default class BatchSubResponse {
  public batchType: BatchType;
  public batchOperations: BatchOperation[];

  public constructor(_batchType: BatchType) {
    this.batchType = _batchType;
  }
}
