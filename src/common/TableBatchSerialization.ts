import IBatchSerialization from "./IBatchSerialization";
import BatchOperation from "./BatchOperation";
import BatchSubResponse from "./BatchSubResponse";

export class TableBatchSerialization implements IBatchSerialization {
  private batchOperations: BatchOperation[];

  public constructor() {}

  public deserializeBatchRequest(batchRequests: string): BatchOperation[] {
    const HTTP_LINE_ENDING = "\r\n";
    const HTTP_VERSION_1_1 = "HTTP/1.1";
    // batch_{​​batchid}​​
    const batchBoundary = `batch_${batchGuid}​​`;
    const changesetBoundary = `changeset_${changesetId}​​`;

    const subRequestPrefix = `--${changesetBoundary}​​${HTTP_LINE_ENDING}​​${HeaderConstants.CONTENT_TYPE}​​: application/http${HTTP_LINE_ENDING}​​${HeaderConstants.CONTENT_TRANSFER_ENCODING}​​: binary`;
    const changesetEnding = `--${changesetBoundary}​​--`;
    const batchEnding = `--${batchBoundary}​​`;
  }
  public serializeBatchResponse(
    batchOperations: BatchOperation[]
  ): BatchSubResponse {}
}
