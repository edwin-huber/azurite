/**
 * An interface for the batch deserializer.
 *
 * @export
 * @interface IBatchDeserializer
 */

import BatchOperation from "./BatchOperation";

export default interface IBatchSerialization {
  batchBoundary: string;
  changesetBoundary: string;
  deserializeBatchRequest(batchRequests: string): BatchOperation[];
  extractBatchBoundary(batchRequestsString: string): void;
  extractChangeSetBoundary(batchRequestsString: string): void;
}
