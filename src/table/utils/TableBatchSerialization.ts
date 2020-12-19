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
  public deserializeBatchRequest(
    batchRequestsString: string
  ): BatchOperation[] {
    let subChangeSetPrefixMatches = batchRequestsString.match(
      "(boundary=)+(changeset_.+)+(?=\\n)+"
    );
    let changeSetBoundary: string;
    if (subChangeSetPrefixMatches != null) {
      changeSetBoundary = subChangeSetPrefixMatches[2];
    } else {
      // we need to see if this is a single query batch operation
      // whose format is different! (as we only support a single query per batch)
      subChangeSetPrefixMatches = batchRequestsString.match(/(--batch_\w+)/);
      if (subChangeSetPrefixMatches != null) {
        changeSetBoundary = subChangeSetPrefixMatches[1];
      } else {
        throw StorageError;
      }
    }

    // we can't rely on case of strings we use in delimiters
    const contentTypeHeaderString = this.extractRequestHeaderString(
      batchRequestsString,
      "(\\n)+(([c,C])+(ontent-)+([t,T])+(ype)+)+(?=:)+"
    );
    const contentTransferEncodingString = this.extractRequestHeaderString(
      batchRequestsString,
      "(\\n)+(([c,C])+(ontent-)+([t,T])+(ransfer-)+([e,E])+(ncoding))+(?=:)+"
    );

    // const splitRequestBody = batchRequestsString.split(changeSetBoundary);

    const HTTP_LINE_ENDING = "\n";
    // '--changeset_8a28b620-b4bb-458c-a177-0959fb14c977\n​​Content-Type​​: application/http\n​​Content-Transfer-Encoding​​: binary'
    const subRequestPrefix = `--${changeSetBoundary}${HTTP_LINE_ENDING}${contentTypeHeaderString}: application/http${HTTP_LINE_ENDING}${contentTransferEncodingString}: binary`;
    const splitBody = batchRequestsString.split(subRequestPrefix);

    // dropping first element as boundary if we have a batch with multiple requests
    let subRequests: string[];
    if (splitBody.length > 1) {
      subRequests = splitBody.slice(1, splitBody.length);
    } else {
      subRequests = splitBody;
    }

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

      const fullRequestURL = subRequest.match(/((http+s?)(\S)+)/);
      if (fullRequestURL === null || fullRequestURL.length < 3) {
        throw new Error(
          `Couldn't extract full request URL from sub-Request:\n ${subRequest}`
        );
      }
      const pathString = fullRequestURL[1];
      const path = pathString.match(/\S+devstoreaccount1\/(\w+)/);
      if (path === null || path.length < 2) {
        throw new Error(
          `Couldn't extract path from URL in sub-Request:\n ${subRequest}`
        );
      }
      const jsonOperationBody = subRequest.match(/{+.+}+/);
      let headers: string;
      // ToDo: not sure if this logic is valid, it might be better
      // to just have an empty body and then error out when determining routing of request in Handler
      if (
        subRequests.length > 1 &&
        (jsonOperationBody === null || jsonOperationBody.length < 1)
      ) {
        throw new Error(
          `Couldn't extract path from sub-Request:\n ${subRequest}`
        );
      }

      let jsonBody: string;
      if (jsonOperationBody != null) {
        // we need the jsonBody and request path extracted to be able to extract headers.
        headers = subRequest.substring(
          subRequest.indexOf(fullRequestURL[2]) + fullRequestURL[2].length,
          subRequest.indexOf(jsonOperationBody[0])
        );
        jsonBody = jsonOperationBody[0];
      } else {
        let subStringStart = subRequest.indexOf(fullRequestURL[1]);
        subStringStart += fullRequestURL[1].length + 1; // for the space
        const subStringEnd = subRequest.length - changeSetBoundary.length - 2;
        headers = subRequest.substring(subStringStart, subStringEnd);
        jsonBody = "";
      }

      const operation = new BatchOperation(BatchType.table, headers);
      operation.httpMethod = requestType[0] as HttpMethod;
      operation.path = path[1];
      operation.url = fullRequestURL[0];
      operation.jsonRequestBody = jsonBody;

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

  private extractRequestHeaderString(
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
