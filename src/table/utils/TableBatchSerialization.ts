import BatchOperation from "../../common/BatchOperation";
import { BatchOperationType } from "../../common/BatchOperation";
import { BatchType } from "../../common/BatchOperation";
import BatchSubResponse from "../../common/BatchSubResponse";
import IBatchSerialization from "../../common/IBatchSerialization";

// The semantics for entity group transactions are defined by the OData Protocol Specification.
// https://www.odata.org/
// http://docs.oasis-open.org/odata/odata-json-format/v4.01/odata-json-format-v4.01.html#_Toc38457781
export class TableBatchSerialization implements IBatchSerialization {
  // private batchGuidMatchingRegex = new RegExp("^--batch_.+\\r\\n");
  // private const subChangeSetPrefix = "changeset_";

  public deserializeBatchRequest(
    batchRequestsString: string
  ): BatchOperation[] {
    const subChangeSetPrefixMatches = batchRequestsString.match(
      "boundary=changeset_.+\\r\\n"
    );
    let changeSetGuid: string;
    if (subChangeSetPrefixMatches != null) {
      changeSetGuid = subChangeSetPrefixMatches[0];
      // tslint:disable-next-line: no-console
      console.log(changeSetGuid);
    }
    /*
    const splitRequestBody = batchRequestsString.split(this.subChangeSetPrefix);

    const batchGuid = 
    const batchBoundary = `batch_${batchGuid}​​`;
    const changesetBoundary = `changeset_${changesetId}​​`;
    const changesetEnding = `--${changesetBoundary}​​--`;
    const batchEnding = `--${batchBoundary}​​`;
    const HTTP_LINE_ENDING = "\r\n";
    const subRequestPrefix = `--${changesetBoundary}​​${HTTP_LINE_ENDING}​​${HeaderConstants.CONTENT_TYPE}​​: application/http${HTTP_LINE_ENDING}​​${HeaderConstants.CONTENT_TRANSFER_ENCODING}​​: binary`;
    const splitBody = batchRequests.split(subRequestPrefix);
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
