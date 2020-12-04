/**
 * An interface for the batch deserializer.
 *
 * @export
 * @interface IBatchDeserializer
 */

import BatchOperation from "./BatchOperation";
import BatchSubResponse from "./BatchSubResponse";

export default interface IBatchSerialization {
  deserializeBatchRequest(batchRequests: string): BatchOperation[];
  serializeBatchResponse(batchOperations: BatchOperation[]): BatchSubResponse;
}
