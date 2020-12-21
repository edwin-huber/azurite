import BaseHandler from "./BaseHandler";
import BatchRequest from "../../common/BatchRequest";
import BatchTableInsertEntityOptionalParams from "../batch/batch.models";
import BufferStream from "../../common/utils/BufferStream";
import Context from "../generated/Context";
import { newEtag } from "../../common/utils/utils";
import * as Models from "../generated/artifacts/models";
import NotImplementedError from "../errors/NotImplementedError";
import StorageErrorFactory from "../errors/StorageErrorFactory";
import TableStorageContext from "../context/TableStorageContext";
import ITableHandler from "../generated/handlers/ITableHandler";
import { IEntity, TableModel } from "../persistence/ITableMetadataStore";
import {
  DEFAULT_TABLE_LISTENING_PORT,
  DEFAULT_TABLE_SERVER_HOST_NAME,
  FULL_METADATA_ACCEPT,
  MINIMAL_METADATA_ACCEPT,
  NO_METADATA_ACCEPT,
  RETURN_CONTENT,
  RETURN_NO_CONTENT,
  TABLE_API_VERSION
} from "../utils/constants";
import { TableBatchSerialization } from "../utils/TableBatchSerialization";

export default class TableHandler extends BaseHandler implements ITableHandler {
  public async batch(
    body: NodeJS.ReadableStream,
    multipartContentType: string,
    contentLength: number,
    options: Models.TableBatchOptionalParams,
    context: Context
  ): Promise<Models.TableBatchResponse> {
    const tableCtx = new TableStorageContext(context);
    const serialization = new TableBatchSerialization();
    const batchOperations = serialization.deserializeBatchRequest(
      await this.streamToString(body)
    );

    let response: string[] = [];
    let batchRequests: BatchRequest[] = [];

    batchOperations.forEach(operation => {
      const request: BatchRequest = new BatchRequest(operation);
      batchRequests.push(request);
    });

    if (batchRequests.length > 0) {
      for (let singleReq of batchRequests) {
        let contentID = 1; // contentID starts at 1 for batch
        try {
          singleReq.response = await this.routeAndDispatchBatchRequest(
            singleReq,
            context,
            contentID
          );
        } catch (err) {
          throw err;
        }
        contentID++;
      }
    }

    // Now we need to serialize the response
    batchRequests.forEach(request => {
      // need to add the boundaries in here like
      // --changesetresponse_a6253244-7e21-42a8-a149-479ee9e94a25
      response.push(request.response);
    });

    // need to convert response to NodeJS.ReadableStream

    // Need to check how the reponse will be constructed, and how we handle the changeset etc
    // on the way out to the API user
    return {
      requestId: tableCtx.contextID,
      version: TABLE_API_VERSION,
      date: context.startTime,
      statusCode: 202,
      body // Use incoming request body as Batch operation response body as demo
    };
  }

  public async create(
    tableProperties: Models.TableProperties,
    options: Models.TableCreateOptionalParams,
    context: Context
  ): Promise<Models.TableCreateResponse> {
    const tableCtx = new TableStorageContext(context);
    const accountName = tableCtx.account;

    const accept = context.request!.getHeader("accept");

    if (
      accept !== NO_METADATA_ACCEPT &&
      accept !== MINIMAL_METADATA_ACCEPT &&
      accept !== FULL_METADATA_ACCEPT
    ) {
      throw StorageErrorFactory.getContentTypeNotSupported(context);
    }

    if (accountName === undefined) {
      throw StorageErrorFactory.getAccountNameEmpty(context);
    }

    // Here table name is in request body, not in url
    const tableName = tableProperties.tableName;
    if (tableName === undefined) {
      throw StorageErrorFactory.getTableNameEmpty;
    }

    const metadata = `${accountName}/$metadata#Tables/@Element`;
    const type = `${accountName}.Tables`;
    const id = `${accountName}/Tables(${tableName})`;
    const editLink = `Tables(${tableName})`;

    const table: TableModel = {
      account: accountName,
      tableName,
      odatametadata: metadata,
      odatatype: type,
      odataid: id,
      odataeditLink: editLink
    };

    await this.metadataStore.createTable(context, table);

    const response: Models.TableCreateResponse = {
      clientRequestId: options.requestId,
      requestId: tableCtx.contextID,
      version: TABLE_API_VERSION,
      date: context.startTime,
      statusCode: 204
    };

    if (context.request!.getHeader("Prefer") === RETURN_NO_CONTENT) {
      response.statusCode = 204;
      response.preferenceApplied = RETURN_NO_CONTENT;
    }

    if (context.request!.getHeader("Prefer") === RETURN_CONTENT) {
      response.statusCode = 201;
      response.preferenceApplied = "return-content";
    }

    let protocol = "http";
    let host =
      DEFAULT_TABLE_SERVER_HOST_NAME + ":" + DEFAULT_TABLE_LISTENING_PORT;
    // TODO: Get host and port from Azurite Server instance
    if (tableCtx.request !== undefined) {
      host = tableCtx.request.getHeader("host") as string;
      protocol = tableCtx.request.getProtocol() as string;
    }

    if (tableCtx.accept === NO_METADATA_ACCEPT) {
      response.tableName = tableName;
    }

    if (tableCtx.accept === MINIMAL_METADATA_ACCEPT) {
      response.tableName = tableName;
      response.odatametadata = `${protocol}://${host}/${metadata}`;
    }

    if (tableCtx.accept === FULL_METADATA_ACCEPT) {
      response.tableName = tableName;
      response.odatametadata = `${protocol}://${host}/${metadata}`;
      response.odatatype = type;
      response.odataid = `${protocol}://${host}/${id}`;
      response.odataeditLink = editLink;
    }

    context.response!.setContentType(accept);
    return response;
  }

  public async query(
    options: Models.TableQueryOptionalParams,
    context: Context
  ): Promise<Models.TableQueryResponse2> {
    const tableCtx = new TableStorageContext(context);
    const accountName = tableCtx.account;

    const accept = context.request!.getHeader("accept");

    if (
      accept !== NO_METADATA_ACCEPT &&
      accept !== MINIMAL_METADATA_ACCEPT &&
      accept !== FULL_METADATA_ACCEPT
    ) {
      throw StorageErrorFactory.getContentTypeNotSupported(context);
    }

    if (accountName === undefined) {
      throw StorageErrorFactory.getAccountNameEmpty(context);
    }

    const metadata = `${accountName}/$metadata#Tables`;
    const tableResult = await this.metadataStore.queryTable(
      context,
      accountName
    );

    const response: Models.TableQueryResponse2 = {
      clientRequestId: options.requestId,
      requestId: tableCtx.contextID,
      version: TABLE_API_VERSION,
      date: context.startTime,
      statusCode: 200,
      xMsContinuationNextTableName: options.nextTableName,
      value: []
    };

    let protocol = "http";
    let host =
      DEFAULT_TABLE_SERVER_HOST_NAME + ":" + DEFAULT_TABLE_LISTENING_PORT;
    // TODO: Get host and port from Azurite Server instance
    if (tableCtx.request !== undefined) {
      host = tableCtx.request.getHeader("host") as string;
      protocol = tableCtx.request.getProtocol() as string;
    }

    if (tableCtx.accept === NO_METADATA_ACCEPT) {
      response.value = tableResult.map(item => {
        return { tableName: item.tableName };
      });
    }

    if (tableCtx.accept === MINIMAL_METADATA_ACCEPT) {
      response.odatametadata = `${protocol}://${host}/${metadata}`;
      response.value = tableResult.map(item => {
        return { tableName: item.tableName };
      });
    }

    if (tableCtx.accept === FULL_METADATA_ACCEPT) {
      response.odatametadata = `${protocol}://${host}/${metadata}`;
      response.value = tableResult.map(item => {
        return {
          odatatype: item.odatatype,
          odataid: `${protocol}://${host}/${item.odataid}`,
          odataeditLink: item.odataeditLink,
          tableName: item.tableName
        };
      });
    }

    context.response!.setContentType(accept);
    return response;
  }

  public async delete(
    tablename: string,
    options: Models.TableDeleteMethodOptionalParams,
    context: Context
  ): Promise<Models.TableDeleteResponse> {
    const tableCtx = new TableStorageContext(context);
    const accountName = tableCtx.account;
    // currently the tableName is not coming through, so we take it from the table context
    await this.metadataStore.deleteTable(
      context,
      tableCtx.tableName!,
      accountName!
    );
    const response: Models.TableDeleteResponse = {
      clientRequestId: options.requestId,
      requestId: tableCtx.contextID,
      version: TABLE_API_VERSION,
      date: context.startTime,
      statusCode: 204
    };

    return response;
  }

  public async queryEntities(
    table: string,
    options: Models.TableQueryEntitiesOptionalParams,
    context: Context
  ): Promise<Models.TableQueryEntitiesResponse> {
    // e.g
    // const tableCtx = new TableStorageContext(context);
    // const accountName = tableCtx.account;
    // const tableName = tableCtx.tableName; // Get tableName from context
    // return {
    //   statusCode: 200,
    //   date: tableCtx.startTime,
    //   clientRequestId: "clientRequestId",
    //   requestId: "requestId",
    //   version: "version",
    //   xMsContinuationNextPartitionKey: "xMsContinuationNextPartitionKey",
    //   xMsContinuationNextRowKey: "xMsContinuationNextRowKey",
    //   odatametadata: "odatametadata",
    //   value: [
    //     {
    //       property1: "property1" + accountName,
    //       property2: "property2" + tableName,
    //       property3: "property3"
    //     },
    //     {
    //       property1: "property1"
    //     }
    //   ]
    // };
    // TODO
    throw new NotImplementedError();
  }

  public async queryEntitiesWithPartitionAndRowKey(
    _table: string,
    _partitionKey: string,
    _rowKey: string,
    options: Models.TableQueryEntitiesWithPartitionAndRowKeyOptionalParams,
    context: Context
  ): Promise<Models.TableQueryEntitiesWithPartitionAndRowKeyResponse> {
    // e.g
    // const tableCtx = new TableStorageContext(context);
    // const accountName = tableCtx.account;
    // const tableName = tableCtx.tableName; // Get tableName from context
    // const partitionKey = tableCtx.partitionKey!; // Get partitionKey from context
    // const rowKey = tableCtx.rowKey!; // Get rowKey from context
    // return {
    //   statusCode: 200,
    //   date: tableCtx.startTime,
    //   clientRequestId: "clientRequestId",
    //   requestId: "requestId",
    //   version: "version",
    //   xMsContinuationNextPartitionKey: partitionKeyFromContext,
    //   xMsContinuationNextRowKey: rowKeyFromContext,
    //   odatametadata: "odatametadata",
    //   value: [
    //     {
    //       property1: "property1" + accountName,
    //       property2: "property2" + tableName,
    //       property3: "property3"
    //     },
    //     {
    //       property1: "property1"
    //     }
    //   ]
    // };
    // TODO
    throw new NotImplementedError();
  }

  public async updateEntity(
    _table: string,
    _partitionKey: string,
    _rowKey: string,
    options: Models.TableUpdateEntityOptionalParams,
    context: Context
  ): Promise<Models.TableUpdateEntityResponse> {
    const tableCtx = new TableStorageContext(context);
    const accountName = tableCtx.account;
    const tableName = tableCtx.tableName!; // Get tableName from context
    const ifMatch = options.ifMatch;

    // Test if all required parameter exist
    if (
      !options.tableEntityProperties ||
      !options.tableEntityProperties.PartitionKey ||
      !options.tableEntityProperties.RowKey
    ) {
      throw StorageErrorFactory.getPropertiesNeedValue(context);
    }

    // Test if etag is available
    // this is considered an upsert if no etag header, an empty header is an error.
    // https://docs.microsoft.com/en-us/rest/api/storageservices/insert-or-replace-entity
    if (ifMatch === "") {
      throw StorageErrorFactory.getPreconditionFailed(context);
    }
    const updateEtag = newEtag();
    // Entity, which is used to update an existing entity
    const entity: IEntity = {
      PartitionKey: options.tableEntityProperties.PartitionKey,
      RowKey: options.tableEntityProperties.RowKey,
      properties: options.tableEntityProperties,
      lastModifiedTime: context.startTime!,
      eTag: updateEtag
    };

    if (ifMatch !== undefined) {
      // Update entity
      await this.metadataStore.updateTableEntity(
        context,
        tableName,
        accountName!,
        entity,
        ifMatch!
      );
    } else {
      // Upsert the entity
      const exists = await this.metadataStore.queryTableEntitiesWithPartitionAndRowKey(
        context,
        tableName,
        accountName!,
        options.tableEntityProperties.PartitionKey,
        options.tableEntityProperties.RowKey
      );

      if (exists !== null) {
        // entity exists so we update and force with "*" etag
        await this.metadataStore.updateTableEntity(
          context,
          tableName,
          accountName!,
          entity,
          "*"
        );
      } else {
        await this.metadataStore.insertTableEntity(
          context,
          tableName,
          accountName!,
          entity
        );
      }
    }
    // Response definition
    const response: Models.TableUpdateEntityResponse = {
      clientRequestId: options.requestId,
      requestId: tableCtx.contextID,
      version: TABLE_API_VERSION,
      date: context.startTime,
      eTag: updateEtag,
      statusCode: 204
    };

    return response;
  }

  public async mergeEntity(
    _table: string,
    _partitionKey: string,
    _rowKey: string,
    options: Models.TableMergeEntityOptionalParams,
    context: Context
  ): Promise<Models.TableMergeEntityResponse> {
    const tableCtx = new TableStorageContext(context);
    const accountName = tableCtx.account;
    const tableName = tableCtx.tableName;
    const partitionKey = tableCtx.partitionKey!;
    const rowKey = tableCtx.rowKey!;

    if (
      !options.tableEntityProperties ||
      !options.tableEntityProperties.PartitionKey ||
      !options.tableEntityProperties.RowKey
    ) {
      throw StorageErrorFactory.getPropertiesNeedValue(context);
    }

    const existingEntity = await this.metadataStore.queryTableEntitiesWithPartitionAndRowKey(
      context,
      tableName!,
      accountName!,
      partitionKey,
      rowKey
    );
    let etagValue = "*";

    if (existingEntity !== null) {
      const mergeEntity: IEntity = {
        PartitionKey: options.tableEntityProperties.PartitionKey,
        RowKey: options.tableEntityProperties.RowKey,
        properties: options.tableEntityProperties,
        lastModifiedTime: context.startTime!,
        eTag: etagValue
      };

      etagValue = await this.metadataStore.mergeTableEntity(
        context,
        tableName!,
        accountName!,
        mergeEntity,
        etagValue,
        partitionKey,
        rowKey
      );
    } else {
      const entity: IEntity = {
        PartitionKey: options.tableEntityProperties.PartitionKey,
        RowKey: options.tableEntityProperties.RowKey,
        properties: options.tableEntityProperties,
        lastModifiedTime: context.startTime!,
        eTag: etagValue
      };

      await this.metadataStore.insertTableEntity(
        context,
        tableName!,
        accountName!,
        entity
      );
    }

    const response: Models.TableMergeEntityResponse = {
      clientRequestId: options.requestId,
      requestId: tableCtx.contextID,
      version: TABLE_API_VERSION,
      date: context.startTime,
      statusCode: 204,
      eTag: etagValue
    };

    return response;
  }

  public async mergeEntityWithMerge(
    table: string,
    partitionKey: string,
    rowKey: string,
    options: Models.TableMergeEntityWithMergeOptionalParams,
    context: Context
  ): Promise<Models.TableMergeEntityWithMergeResponse> {
    return this.mergeEntity(
      table,
      partitionKey,
      rowKey,
      options as any,
      context
    );
  }

  public async deleteEntity(
    _table: string,
    _partitionKey: string,
    _rowKey: string,
    ifMatch: string,
    options: Models.TableDeleteEntityOptionalParams,
    context: Context
  ): Promise<Models.TableDeleteEntityResponse> {
    const tableCtx = new TableStorageContext(context);
    const accountName = tableCtx.account;
    const partitionKey = tableCtx.partitionKey!; // Get partitionKey from context
    const rowKey = tableCtx.rowKey!; // Get rowKey from context

    if (!partitionKey || !rowKey) {
      throw StorageErrorFactory.getPropertiesNeedValue(context);
    }
    if (ifMatch === "" || ifMatch === undefined) {
      throw StorageErrorFactory.getPreconditionFailed(context);
    }
    // currently the props are not coming through as args, so we take them from the table context
    await this.metadataStore.deleteTableEntity(
      context,
      tableCtx.tableName!,
      accountName!,
      partitionKey,
      rowKey,
      ifMatch
    );

    return {
      statusCode: 204,
      date: tableCtx.startTime,
      clientRequestId: options.requestId,
      requestId: tableCtx.contextID,
      version: TABLE_API_VERSION
    };
  }

  public async insertEntity(
    _tableName: string,
    options: Models.TableInsertEntityOptionalParams,
    context: Context
  ): Promise<Models.TableInsertEntityResponse> {
    const tableCtx = new TableStorageContext(context);
    const accountName = tableCtx.account;
    let tableName = tableCtx.tableName!; // Get tableName from context
    if (tableName == "$batch") {
      tableName = _tableName;
    }
    if (
      !options.tableEntityProperties ||
      !options.tableEntityProperties.PartitionKey ||
      !options.tableEntityProperties.RowKey
    ) {
      throw StorageErrorFactory.getPropertiesNeedValue(context);
    }

    const entity: IEntity = {
      PartitionKey: options.tableEntityProperties.PartitionKey,
      RowKey: options.tableEntityProperties.RowKey,
      properties: options.tableEntityProperties,
      lastModifiedTime: context.startTime!,
      eTag: newEtag()
    };

    // TODO: Move logic to get host into utility methods
    let protocol = "http";
    let host =
      DEFAULT_TABLE_SERVER_HOST_NAME + ":" + DEFAULT_TABLE_LISTENING_PORT;
    if (tableCtx.request !== undefined) {
      host = tableCtx.request.getHeader("host") as string;
      protocol = tableCtx.request.getProtocol() as string;
    }

    const metadata = `${protocol}://${host}/${accountName}/$metadata#Tables/@Element`;
    const type = `${accountName}.Tables`;
    const id = `${protocol}://${host}/Tables(${tableName})`;
    const editLink = `Tables(${tableName})`;

    await this.metadataStore.insertTableEntity(
      context,
      tableName,
      accountName!,
      entity
    );

    const response: Models.TableInsertEntityResponse = {
      clientRequestId: options.requestId,
      requestId: tableCtx.contextID,
      version: TABLE_API_VERSION,
      date: context.startTime,
      statusCode: 201
    };

    const accept = tableCtx.accept;

    // Set contentType in response according to accept
    if (
      accept !== NO_METADATA_ACCEPT &&
      accept !== MINIMAL_METADATA_ACCEPT &&
      accept !== FULL_METADATA_ACCEPT
    ) {
      throw StorageErrorFactory.getContentTypeNotSupported(context);
    }

    response.contentType = "application/json";
    const body = {} as any;

    if (context.request!.getHeader("Prefer") === RETURN_NO_CONTENT) {
      response.statusCode = 204;
      response.preferenceApplied = RETURN_NO_CONTENT;
    }

    if (context.request!.getHeader("Prefer") === RETURN_CONTENT) {
      response.statusCode = 201;
      response.preferenceApplied = "return-content";

      if (accept === MINIMAL_METADATA_ACCEPT) {
        body["odata.metadata"] = metadata;
      }

      if (accept === FULL_METADATA_ACCEPT) {
        body["odata.metadata"] = metadata;
        body["odata.type"] = type;
        body["body.id"] = id;
        body["odata.etag"] = entity.eTag;
        body["odata.editLink"] = editLink;
      }

      for (const key of Object.keys(entity.properties)) {
        body[key] = entity.properties[key];
      }

      response.body = new BufferStream(Buffer.from(JSON.stringify(body)));
    }
    return response;
  }

  public async getAccessPolicy(
    table: string,
    options: Models.TableGetAccessPolicyOptionalParams,
    context: Context
  ): Promise<Models.TableGetAccessPolicyResponse> {
    // e.g
    // const tableCtx = new TableStorageContext(context);
    // const accountName = tableCtx.account;
    // const tableName = tableCtx.tableName; // Get tableName from context
    // TODO
    throw new NotImplementedError();
  }

  public async setAccessPolicy(
    table: string,
    options: Models.TableSetAccessPolicyOptionalParams,
    context: Context
  ): Promise<Models.TableSetAccessPolicyResponse> {
    // e.g
    // const tableCtx = new TableStorageContext(context);
    // const accountName = tableCtx.account;
    // const tableName = tableCtx.tableName; // Get tableName from context
    // TODO
    throw new NotImplementedError();
  }

  private async streamToString(stream: NodeJS.ReadableStream): Promise<string> {
    const chunks: any[] = [];
    return new Promise((resolve, reject) => {
      stream.on("data", chunk => chunks.push(chunk));
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
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

        response = await this.insertEntity(
          request.getPath(),
          params,
          batchContextClone
        );
        return this.serializeInsertEntityBatchResponse(
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

  // creates the serialized entitygrouptransaction / batch response body
  // which we return to the users batch request
  private serializeInsertEntityBatchResponse(
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
    let serializedResponses: string[] = [];
    // create the initial boundary
    serializedResponses.push("Content-Type: application/http\n");
    serializedResponses.push("Content-Transfer-Encoding: binary \n");
    serializedResponses.push("\n");
    serializedResponses.push(
      "HTTP/1.1 " + response.statusCode.toString() + " STATUS MESSAGE\n"
    ); // ToDo: Not sure how to serialize the status message yet
    serializedResponses.push("Content-ID: " + contentID.toString() + "\n");
    // ToDo: not sure about other headers like cache control etc right now
    // will need to look at this later
    serializedResponses.push(
      "Preference-Applied: " + response.preferenceApplied + "\n"
    );
    serializedResponses.push(
      "DataServiceVersion: " + request.getHeader("DataServiceVersion") + "\n"
    );
    serializedResponses.push("Location: " + request.getUrl() + "\n");
    serializedResponses.push("DataServiceId: " + request.getUrl() + "\n");
    serializedResponses.push("ETag: " + response.eTag + "\n");
    return serializedResponses.join();
  }
}
