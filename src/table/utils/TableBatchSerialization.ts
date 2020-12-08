import { StorageError } from "../../blob/generated/artifacts/mappers";
import BatchOperation from "../../common/BatchOperation";
// import { BatchOperationType } from "../../common/BatchOperation";
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
      "(boundary=)+(changeset_.+)+(?=\\r\\n)+"
    );
    let changeSetBoundary: string;
    if (subChangeSetPrefixMatches != null) {
      changeSetBoundary = subChangeSetPrefixMatches[2];
    } else {
      throw StorageError;
    }

    // we can't rely on case of strings we use in delimiters
    const contentTypeHeaderString = this.extractHeaderString(
      batchRequestsString,
      "(\\r\\n)+(([c,C])+(ontent-)+([t,T])+(ype)+)+(?=:)+"
    );
    const contentTransferEncodingString = this.extractHeaderString(
      batchRequestsString,
      "(\\r\\n)+(([c,C])+(ontent-)+([t,T])+(ransfer-)+([e,E])+(ncoding))+(?=:)+"
    );

    // const splitRequestBody = batchRequestsString.split(changeSetBoundary);

    const HTTP_LINE_ENDING = "\r\n";
    // '--changeset_8a28b620-b4bb-458c-a177-0959fb14c977​​\r\n​​Content-Type​​: application/http\r\n​​Content-Transfer-Encoding​​: binary'
    const subRequestPrefix = `--${changeSetBoundary}${HTTP_LINE_ENDING}${contentTypeHeaderString}: application/http${HTTP_LINE_ENDING}${contentTransferEncodingString}: binary`;
    const splitBody = batchRequestsString.split(subRequestPrefix);

    // dropping first and last elements as boundaries
    const subRequests = splitBody.slice(1, splitBody.length - 1);

    const batchRequests: BatchOperation[] = subRequests.map(subRequest => {
      // GET = Query, POST = Insert, PUT = Update, MERGE = Merge, DELETE = Delete
      const requestType = subRequest.match(
        "(GET|POST|PUT|MERGE|INSERT|DELETE)"
      );
      if (requestType === null || requestType.length < 2) {
        throw new Error(
          `Couldn't extract verb from sub-Request:\n ${subRequest}`
        );
      }
      const operation = new BatchOperation(BatchType.table);
      operation.verb = requestType[0];

      const requestPath = subRequest.match(
        /http+s?.+(table\.core\.windows\.net)(\/\S*\s+)/
      );
      if (requestPath === null || requestPath.length < 3) {
        throw new Error(
          `Couldn't extract path from sub-Request:\n ${subRequest}`
        );
      }
      // tslint:disable-next-line: no-console
      console.log(requestPath[2]);
      return operation;
    });

    // tslint:disable-next-line: no-console
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

    return batchRequests;
  }

  // Has default response for now
  public serializeBatchResponse(
    batchOperations: BatchOperation[]
  ): BatchSubResponse {
    return new BatchSubResponse(BatchType.table);
  }

  private extractHeaderString(
    batchRequestsString: string,
    regExPattern: string
  ) {
    const contentTypeHeaderStringMatches = batchRequestsString.match(
      regExPattern
    );
    if (contentTypeHeaderStringMatches == null) {
      // tslint:disable-next-line: no-console
      // console.log(contentTypeHeaderString[2]);
      throw StorageError;
    }
    const contentTypeHeaderString = contentTypeHeaderStringMatches[2];
    return contentTypeHeaderString;
  }
}
