import BatchRequest from "../../common/BatchRequest";
import { TableBatchSerialization } from "../utils/TableBatchSerialization";
import TableBatchOperation from "./TableBatchOperation";
import BatchTableInsertEntityOptionalParams from "../batch/batch.models";
import TableStorageContext from "../context/TableStorageContext";
import Context from "../generated/Context";
import TableHandler from "../handlers/TableHandler";

export default class TableBatchManager {
  private batchOperations: TableBatchOperation[] = [];
  private requests: BatchRequest[] = [];
  // private individualOpResponses: string [] = [];
  private serialization = new TableBatchSerialization();
  private context: TableStorageContext;
  private parentHandler: TableHandler;

  public constructor(context: TableStorageContext, handler: TableHandler) {
    this.context = context;
    this.parentHandler = handler;
  }

  /**
   * deserializeBatchRequests
   */
  public deserializeBatchRequests(batchRequestBody: string): void {
    this.batchOperations = this.serialization.deserializeBatchRequest(
      batchRequestBody
    );
  }

  /**
   * submitRequestsToHandlers
   */
  public async submitRequestsToHandlers(): Promise<void> {
    this.batchOperations.forEach(operation => {
      const request: BatchRequest = new BatchRequest(operation);
      this.requests.push(request);
    });

    let contentID = 1; // contentID starts at 1 for batch
    if (this.requests.length > 0) {
      for (let singleReq of this.requests) {
        try {
          singleReq.response = await this.routeAndDispatchBatchRequest(
            singleReq,
            this.context,
            contentID
          );
        } catch (err) {
          throw err;
        }
        contentID++;
      }
    }
  }

  /**
   * serializeResponses
   * https://docs.microsoft.com/en-us/rest/api/storageservices/performing-entity-group-transactions#json-versions-2013-08-15-and-later-2
   */
  public serializeResponses(): string {
    let responseString: string = "";
    // Now we need to serialize the response
    // We currently use entry at position 0 for all request wide values
    // this needs to move to an encapsulating object.
    // based on research, a stringbuilder is only worth doing with 1000s of string ops
    // change to response
    const batchBoundary = this.batchOperations[0].batchBoundary
      ? this.batchOperations[0].batchBoundary.replace("batch", "batchresponse")
      : "";
    let changesetBoundary = this.batchOperations[0].changeSetBoundary
      ? this.batchOperations[0].changeSetBoundary.replace(
          "changeset",
          "changesetresponse"
        )
      : "";

    // first add:
    // --batchresponse_e69b1c6c-62ff-471e-ab88-9a4aeef0a880
    responseString += batchBoundary + "\n";
    // (currently static header) ToDo: Insert correct headers
    // Content-Type: multipart/mixed; boundary=changesetresponse_a6253244-7e21-42a8-a149-479ee9e94a25
    responseString +=
      "Content-Type: multipart/mixed; boundary=" + changesetBoundary + "\n";

    changesetBoundary = "\n--" + changesetBoundary;
    this.requests.forEach(request => {
      // need to add the boundaries in here like
      // --changesetresponse_a6253244-7e21-42a8-a149-479ee9e94a25
      responseString += changesetBoundary;
      // Next single Op response

      responseString += request.response;
      // ToDo: Why is Etag Missing? / Undefined
    });

    // Finally
    // --changesetresponse_a6253244-7e21-42a8-a149-479ee9e94a25--
    responseString += changesetBoundary + "--\n";
    // --batchresponse_e69b1c6c-62ff-471e-ab88-9a4aeef0a880--
    responseString += "\n" + batchBoundary + "--\n";

    return responseString;
  }

  // we only have 5 possible HTTP Verbs to determine the operation
  // seems its not "too" complicated...
  private async routeAndDispatchBatchRequest(
    request: BatchRequest,
    context: Context,
    contentID: number
  ): Promise<any> {
    /*
    QUERY : 
    GET	https://myaccount.table.core.windows.net/mytable(PartitionKey='<partition-key>',RowKey='<row-key>')?$select=<comma-separated-property-names>
    GET https://myaccount.table.core.windows.net/mytable()?$filter=<query-expression>&$select=<comma-separated-property-names>
    
    INSERT:
    POST	https://myaccount.table.core.windows.net/mytable

    UPDATE:
    PUT http://127.0.0.1:10002/devstoreaccount1/mytable(PartitionKey='myPartitionKey', RowKey='myRowKey')
    INSERT OR REPLACE:
    PUT	https://myaccount.table.core.windows.net/mytable(PartitionKey='myPartitionKey', RowKey='myRowKey')

    MERGE:
    MERGE	https://myaccount.table.core.windows.net/mytable(PartitionKey='myPartitionKey', RowKey='myRowKey')
    INSERT OR MERGE
    MERGE	https://myaccount.table.core.windows.net/mytable(PartitionKey='myPartitionKey', RowKey='myRowKey')

    DELETE:
    DELETE	https://myaccount.table.core.windows.net/mytable(PartitionKey='myPartitionKey', RowKey='myRowKey')
    */
    // the context that we have will not work with the calls and needs updating for
    // batch operations, need a suitable deep clone, as each request needs to be treated seaprately
    // this might be too shall with inheritance
    const batchContextClone = Object.create(context);
    batchContextClone.tableName = request.getPath();
    batchContextClone.path = request.getPath();
    let response: any;
    switch (request.getMethod()) {
      case "POST":
        // we are inserting and entity
        let params: BatchTableInsertEntityOptionalParams = new BatchTableInsertEntityOptionalParams(
          request
        );

        response = await this.parentHandler.insertEntity(
          request.getPath(),
          params,
          batchContextClone
        );
        return this.serialization.serializeInsertEntityBatchResponse(
          request,
          response,
          contentID
        );
        break;
      case "PUT":
        // we have update
        throw new Error("Method not implemented.");
        break;
      case "DELETE":
        // we have delete
        throw new Error("Method not implemented.");
        break;
      case "GET":
        // we have query
        throw new Error("Method not implemented.");
        break;
      case "CONNECT":
        throw new Error("Connect Method unsupported in batch.");
        break;
      case "HEAD":
        throw new Error("Head Method unsupported in batch.");
        break;
      case "OPTIONS":
        throw new Error("Options Method unsupported in batch.");
        break;
      case "TRACE":
        throw new Error("Trace Method unsupported in batch.");
        break;
      case "PATCH":
        throw new Error("Patch Method unsupported in batch.");
        break;
      default:
        // this must be the merge
        // as the merge opertion is not currently generated by autorest
        throw new Error("Method not implemented.");
    }
  }
}
