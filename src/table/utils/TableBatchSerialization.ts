import { StorageError } from "../../blob/generated/artifacts/mappers";
import BatchOperation from "../../common/BatchOperation";
// import { BatchOperationType } from "../../common/BatchOperation";
import { BatchType } from "../../common/BatchOperation";
import BatchRequest from "../../common/BatchRequest";
import BatchSubResponse from "../../common/BatchSubResponse";

import IBatchSerialization from "../../common/IBatchSerialization";
import { HttpMethod } from "../../table/generated/IRequest";
import TableBatchOperation from "../batch/TableBatchOperation";
import * as Models from "../generated/artifacts/models";

// The semantics for entity group transactions are defined by the OData Protocol Specification.
// https://www.odata.org/
// http://docs.oasis-open.org/odata/odata-json-format/v4.01/odata-json-format-v4.01.html#_Toc38457781
// for now we are first getting the concrete implementation correct for table batch
// we then need to figure out how to do this for blob, and what can be shared
// I went down a long rathole trying to get this to work using the existing dispatch and serialization
// classes before giving up and doing my own implementation
// Unit Tests are vital here!
export class TableBatchSerialization implements IBatchSerialization {
  // ToDo: needs to be corrected to match current implementation
  serializeBatchResponse(batchOperations: BatchOperation[]): BatchSubResponse {
    throw new Error("Method not implemented.");
  }

  public deserializeBatchRequest(
    batchRequestsString: string
  ): TableBatchOperation[] {
    const batchBoundary = batchRequestsString.match("(--batch_.+)+(?=\\n)+");
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
    // ToDo: might be easier and more efficient to use i option on the regex here...
    const contentTypeHeaderString = this.extractRequestHeaderString(
      batchRequestsString,
      "(\\n)+(([c,C])+(ontent-)+([t,T])+(ype)+)+(?=:)+"
    );
    const contentTransferEncodingString = this.extractRequestHeaderString(
      batchRequestsString,
      "(\\n)+(([c,C])+(ontent-)+([t,T])+(ransfer-)+([e,E])+(ncoding))+(?=:)+"
    );

    const HTTP_LINE_ENDING = "\n";
    const subRequestPrefix = `--${changeSetBoundary}${HTTP_LINE_ENDING}${contentTypeHeaderString}: application/http${HTTP_LINE_ENDING}${contentTransferEncodingString}: binary`;
    const splitBody = batchRequestsString.split(subRequestPrefix);

    // dropping first element as boundary if we have a batch with multiple requests
    let subRequests: string[];
    if (splitBody.length > 1) {
      subRequests = splitBody.slice(1, splitBody.length);
    } else {
      subRequests = splitBody;
    }

    // This goes through each operation in the the request and maps the content
    // of the request by deserializing it into a BatchOperation Type
    const batchOperations: TableBatchOperation[] = subRequests.map(
      subRequest => {
        const requestType = subRequest.match(
          "(GET|POST|PUT|MERGE|INSERT|DELETE)"
        );
        if (requestType === null || requestType.length < 2) {
          throw new Error(
            `Couldn't extract verb from sub-Request:\n ${subRequest}`
          );
        }

        const fullRequestURI = subRequest.match(/((http+s?)(\S)+)/);
        if (fullRequestURI === null || fullRequestURI.length < 3) {
          throw new Error(
            `Couldn't extract full request URL from sub-Request:\n ${subRequest}`
          );
        }

        // extract the request path
        const pathString = fullRequestURI[1];
        const path = pathString.match(/\S+devstoreaccount1\/(\w+)/);
        if (path === null || path.length < 2) {
          throw new Error(
            `Couldn't extract path from URL in sub-Request:\n ${subRequest}`
          );
        }

        const jsonOperationBody = subRequest.match(/{+.+}+/);

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

        let headers, jsonBody: string;
        let subStringStart, subStringEnd: number;
        // currently getting an invalid header in the first position
        // during table entity test for insert & merge
        subStringStart = subRequest.indexOf(fullRequestURI[1]);
        subStringStart += fullRequestURI[1].length + 1; // for the space

        if (jsonOperationBody != null) {
          // we need the jsonBody and request path extracted to be able to extract headers.
          subStringEnd = subRequest.indexOf(jsonOperationBody[0]);
          jsonBody = jsonOperationBody[0];
        } else {
          subStringEnd = subRequest.length - changeSetBoundary.length - 2;
          jsonBody = "";
        }

        headers = subRequest.substring(subStringStart, subStringEnd);

        const operation = new TableBatchOperation(BatchType.table, headers);
        operation.httpMethod = requestType[0] as HttpMethod;
        operation.path = path[1];
        operation.uri = fullRequestURI[0];
        operation.jsonRequestBody = jsonBody;
        // ToDo: this is currently inefficient, and we need to have a higher level object to contain
        // the values which are the same across ops and responses for a batch
        operation.changeSetBoundary = changeSetBoundary;
        operation.batchBoundary = batchBoundary ? batchBoundary[0] : "";
        return operation;
      }
    );

    return batchOperations;
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

  // creates the serialized entitygrouptransaction / batch response body
  // which we return to the users batch request
  public serializeInsertEntityBatchResponse(
    request: BatchRequest,
    response: Models.TableInsertEntityResponse,
    contentID: number
  ): string {
    /*
    looking to replicate this reponse:
    Content-Type: application/http  
    Content-Transfer-Encoding: binary  
  
    HTTP/1.1 204 No Content  
    Content-ID: 1  
    X-Content-Type-Options: nosniff  
    Cache-Control: no-cache  
    Preference-Applied: return-no-content  
    DataServiceVersion: 3.0;  
    Location: https://myaccount.table.core.windows.net/Blogs(PartitionKey='Channel_19',RowKey='1')  
    DataServiceId: https://myaccount.table.core.windows.net/Blogs (PartitionKey='Channel_19',RowKey='1')  
    ETag: W/"0x8D101F7E4B662C4"  
    */
    // ToDo: keeping my life easy to start and defaulting to "return no content"
    let serializedResponses: string = "";
    // create the initial boundary
    serializedResponses += "Content-Type: application/http\n";
    serializedResponses += "Content-Transfer-Encoding: binary \n";
    serializedResponses += "\n";
    serializedResponses +=
      "HTTP/1.1 " + response.statusCode.toString() + " STATUS MESSAGE\n";
    // ToDo: Not sure how to serialize the status message yet
    serializedResponses += "Content-ID: " + contentID.toString() + "\n";
    // ToDo: not sure about other headers like cache control etc right now
    // will need to look at this later
    serializedResponses +=
      "Preference-Applied: " + response.preferenceApplied + "\n";
    serializedResponses +=
      "DataServiceVersion: " + request.getHeader("DataServiceVersion") + "\n";
    serializedResponses += "Location: " + request.getUrl() + "\n";
    serializedResponses += "DataServiceId: " + request.getUrl() + "\n";
    serializedResponses += "ETag: " + response.eTag + "\n";
    return serializedResponses;
  }
}
