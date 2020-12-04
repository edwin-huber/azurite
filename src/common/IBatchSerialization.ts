/**
 * An interface for the batch deserializer.
 *
 * @export
 * @interface IBatchDeserializer
 */

import { BatchSubResponse } from "@azure/storage-blob";
import BatchOperation from "./BatchOperation";

export default interface IBatchSerialization {
  deserializeBatchRequest(batchRequests: string): BatchOperation[];
  serializeBatchResponse(batchOperations: BatchOperation[]): BatchSubResponse;
}
