import BatchRequest from "../../common/BatchRequest";
import {
  DataServiceVersion9,
  QueryOptions,
  ResponseFormat,
  TableInsertEntityOptionalParams
} from "../generated/artifacts/models";

export default class BatchTableInsertEntityOptionalParams
  implements TableInsertEntityOptionalParams {
  public constructor(batchRequest: BatchRequest) {
    // timeout is optional query parameter

    if (batchRequest.getHeader("x-ms-client-request-id") != undefined) {
      this.requestId = batchRequest.getHeader("x-ms-client-request-id");
    }
    if (batchRequest.getHeader("DataServiceVersion") == "3.0") {
      this.dataServiceVersion = DataServiceVersion9.ThreeFullStopZero;
    }
    let body = batchRequest.getBody();
    if (body != null) {
      this.tableEntityProperties = JSON.parse(body);
    }
  }

  /**
   * The timeout parameter is expressed in seconds.
   */
  timeout?: number;
  /**
   * Provides a client-generated, opaque value with a 1 KB character limit that is recorded in the
   * analytics logs when analytics logging is enabled.
   */
  public requestId?: string;
  /**
   * Specifies the data service version. Possible values include: '3.0'
   */
  dataServiceVersion?: DataServiceVersion9;
  /**
   * The properties for the table entity.
   */
  tableEntityProperties?: { [propertyName: string]: any };
  /**
   * Specifies whether the response should include the inserted entity in the payload. Possible
   * values are return-no-content and return-content. Possible values include: 'return-no-content',
   * 'return-content'
   */
  responsePreference?: ResponseFormat;
  /**
   * Additional parameters for the operation
   */
  queryOptions?: QueryOptions;
}
