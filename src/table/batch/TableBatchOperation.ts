import BatchOperation, { BatchType } from "../../common/BatchOperation";
import Operation from "../generated/artifacts/operation";

export default class TableBatchOperation extends BatchOperation {
  public constructor(_batchType: BatchType, headers: string) {
    super(_batchType, headers);
  }
  // we extend here with the operation from table artifacts
  // blob implementation will extend using blob operation artifact
  public operation?: Operation;
}
