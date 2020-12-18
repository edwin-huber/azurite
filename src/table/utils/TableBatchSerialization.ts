import { StorageError } from "../../blob/generated/artifacts/mappers";
import BatchOperation from "../../common/BatchOperation";
// import { BatchOperationType } from "../../common/BatchOperation";
import { BatchType } from "../../common/BatchOperation";
import BatchSubResponse from "../../common/BatchSubResponse";
import IBatchSerialization from "../../common/IBatchSerialization";
import { HttpMethod } from "../../table/generated/IRequest";

// The semantics for entity group transactions are defined by the OData Protocol Specification.
// https://www.odata.org/
// http://docs.oasis-open.org/odata/odata-json-format/v4.01/odata-json-format-v4.01.html#_Toc38457781
export class TableBatchSerialization implements IBatchSerialization {
  // private batchGuidMatchingRegex = new RegExp("^--batch_.+\\r\\n");
  // private const subChangeSetPrefix = "changeset_";

  // ToDo: This needs to return the array of BatchRequests, which are built
  // from the batch operation deserialization
  public deserializeBatchRequest(
    batchRequestsString: string
  ): BatchOperation[] {
    const subChangeSetPrefixMatches = batchRequestsString.match(
      "(boundary=)+(changeset_.+)+(?=\\n)+"
    );
    let changeSetBoundary: string;
    if (subChangeSetPrefixMatches != null) {
      changeSetBoundary = subChangeSetPrefixMatches[2];
    } else {
      throw StorageError;
    }

    // we can't rely on case of strings we use in delimiters
    const contentTypeHeaderString = this.extractRequestString(
      batchRequestsString,
      "(\\n)+(([c,C])+(ontent-)+([t,T])+(ype)+)+(?=:)+"
    );
    const contentTransferEncodingString = this.extractRequestString(
      batchRequestsString,
      "(\\n)+(([c,C])+(ontent-)+([t,T])+(ransfer-)+([e,E])+(ncoding))+(?=:)+"
    );

    // const splitRequestBody = batchRequestsString.split(changeSetBoundary);

    const HTTP_LINE_ENDING = "\n";
    // '--changeset_8a28b620-b4bb-458c-a177-0959fb14c977\n​​Content-Type​​: application/http\n​​Content-Transfer-Encoding​​: binary'
    const subRequestPrefix = `--${changeSetBoundary}${HTTP_LINE_ENDING}${contentTypeHeaderString}: application/http${HTTP_LINE_ENDING}${contentTransferEncodingString}: binary`;
    const splitBody = batchRequestsString.split(subRequestPrefix);

    // dropping first element as boundary
    const subRequests = splitBody.slice(1, splitBody.length);

    const batchOperations: BatchOperation[] = subRequests.map(subRequest => {
      // GET = Query, POST = Insert, PUT = Update, MERGE = Merge, DELETE = Delete
      const requestType = subRequest.match(
        "(GET|POST|PUT|MERGE|INSERT|DELETE)"
      );
      // extract HTTP Verb
      if (requestType === null || requestType.length < 2) {
        throw new Error(
          `Couldn't extract verb from sub-Request:\n ${subRequest}`
        );
      }
      // extract request path - ToDo: regex needs improving
      // also need to match
      // '\nMERGE https://myaccount.table.core.windows.net/Blogs(PartitionKey='Channel_17', RowKey='3') HTTP/1.1\nContent-Type: application/json\nAccept: application/json;odata=minimalmetadata\nDataServiceVersion: 3.0;\n\n{"PartitionKey":"Channel_19", "RowKey":"3", "Rating":9, "Text":"PDC 2008..."}\n\n--changeset_8a28b620-b4bb-458c-a177-0959fb14c977--\n--batch_a1e9d677-b28b-435e-a89e-87e6a768a431\n'
      // https://myaccount.table.core.windows.net/Blogs(PartitionKey='Channel_17', RowKey='3')
      const requestPath = subRequest.match(
        /http+s?.+(table\.core\.windows\.net)(\/.+)(?=HTTP\/)/
      );
      if (requestPath === null || requestPath.length < 3) {
        throw new Error(
          `Couldn't extract path from sub-Request:\n ${subRequest}`
        );
      }

      const jsonOperationBody = subRequest.match(/{+.+}+/);
      if (jsonOperationBody === null || jsonOperationBody.length < 1) {
        throw new Error(
          `Couldn't extract path from sub-Request:\n ${subRequest}`
        );
      }

      // we need the jsonBody and request path extracted to be able to extract headers.
      const headers = subRequest.substring(
        subRequest.search(requestPath[2]) + requestPath[2].length,
        subRequest.search(jsonOperationBody[0])
      );

      const operation = new BatchOperation(BatchType.table, headers);
      operation.httpMethod = requestType[0] as HttpMethod;
      operation.path = requestPath[2];
      operation.url = requestPath[0];
      operation.jsonRequestBody = jsonOperationBody[0];

      // Assuming / defaulting to Content Type of application/json based on:
      // 2020 12 09 - https://docs.microsoft.com/en-us/rest/api/storageservices/performing-entity-group-transactions
      // JSON is the recommended payload format, and is the only format supported for versions 2015-12-11 and later.

      // ToDo: defaulting to odata=minimalmetadata will need to check if
      // we need to support other metadata options

      // ToDo: check where to validate and act upon Prefer:``return-no-content header

      // ToDo: now we need to parse the operation type

      return operation;
    });

    // tslint:disable-next-line: no-consolef
    // console.log(splitBody[0]);

    /*
0: ' --batch_a1e9d677-b28b-435e-a89e-87e6a768a431\r\nContent-Type: multipart/mixed; boundary='
1:'\r\n\r\n--'
2:'\r\nContent-Type: application/http\r\nContent-Transfer-Encoding: binary\r\n\r\nPOST https://myaccount.table.core.windows.net/Blogs HTTP/1.1\r\nContent-Type: application/json\r\nAccept: application/json;odata=minimalmetadata\r\nPrefer: return-no-content\r\nDataServiceVersion: 3.0;\r\n\r\n{"PartitionKey":"Channel_19", "RowKey":"1", "Rating":9, "Text":".NET..."}\r\n--'
3:'\r\nContent-Type: application/http\r\nContent-Transfer-Encoding: binary\r\n\r\nPOST https://myaccount.table.core.windows.net/Blogs HTTP/1.1\r\nContent-Type: application/json\r\nAccept: application/json;odata=minimalmetadata\r\nPrefer: return-no-content\r\nDataServiceVersion: 3.0;\r\n\r\n{"PartitionKey":"Channel_17", "RowKey":"2", "Rating":9, "Text":"Azure..."}\r\n--'
4:'\r\nContent-Type: application/http\r\nContent-Transfer-Encoding: binary\r\nMERGE https://myaccount.table.core.windows.net/Blogs(PartitionKey='Channel_17', RowKey='3') HTTP/1.1\r\nContent-Type: application/json\r\nAccept: application/json;odata=minimalmetadata\r\nDataServiceVersion: 3.0;\r\n\r\n{"PartitionKey":"Channel_19", "RowKey":"3", "Rating":9, "Text":"PDC 2008..."}\r\n\r\n--'
5:'--\r\n--batch_a1e9d677-b28b-435e-a89e-87e6a768a431\r\n'
length:6
*/

    /*
    const batchGuid = 
    const batchBoundary = `batch_${batchGuid}​​`;
    const changesetBoundary = `changeset_${changesetId}​​`;
    */

    return batchOperations;
  }

  // Has default response for now
  public serializeBatchResponse(
    batchOperations: BatchOperation[]
  ): BatchSubResponse {
    return new BatchSubResponse(BatchType.table);
  }

  private extractRequestString(
    batchRequestsString: string,
    regExPattern: string
  ) {
    const headerStringMatches = batchRequestsString.match(regExPattern);
    if (headerStringMatches == null) {
      throw StorageError;
    }
    return headerStringMatches[2];
  }
}
