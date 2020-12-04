import BatchOperation, {
  BatchOperationType
} from "../../common/BatchOperation";
import { BatchType } from "../../common/BatchOperation";
import BatchSubResponse from "../../common/BatchSubResponse";
import IBatchSerialization from "../../common/IBatchSerialization";

export class TableBatchSerialization implements IBatchSerialization {
  public deserializeBatchRequest(batchRequests: string): BatchOperation[] {
    /*const HTTP_LINE_ENDING = "\r\n";
    const HTTP_VERSION_1_1 = "HTTP/1.1";
    // batch_{​​batchid}​​
    const batchBoundary = `batch_${batchGuid}​​`;
    const changesetBoundary = `changeset_${changesetId}​​`;

    const subRequestPrefix = `--${changesetBoundary}​​${HTTP_LINE_ENDING}​​${HeaderConstants.CONTENT_TYPE}​​: application/http${HTTP_LINE_ENDING}​​${HeaderConstants.CONTENT_TRANSFER_ENCODING}​​: binary`;
    const changesetEnding = `--${changesetBoundary}​​--`;
    const batchEnding = `--${batchBoundary}​​`;
    */
    return [new BatchOperation(BatchType.table, BatchOperationType.unknown)];
  }

  // Has default response for now
  public serializeBatchResponse(
    batchOperations: BatchOperation[]
  ): BatchSubResponse {
    return new BatchSubResponse(BatchType.table);
  }
}
