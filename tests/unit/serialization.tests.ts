// Unit Tests for serialization
import * as assert from "assert";
import { BatchOperationType, BatchType } from "../../src/common/BatchOperation";
// import BatchSubResponse from "../../src/common/BatchSubResponse"
import { TableBatchSerialization } from "../../src/table/utils/TableBatchSerialization";
import SerializationMocks from "./mock.serialization";

describe("batch serialization and deserialization unit tests, these are not the API integration tests:", () => {
  it("deserializes, mock table batch request containing 3 requests correctly", done => {
    const requestString = SerializationMocks.TableBatchRequestMimeBodyString;
    const serializer = new TableBatchSerialization();
    const batchOperationArray = serializer.deserializeBatchRequest(
      requestString
    );

    // this first test is currently a stupid test, as I control the type within the code
    // we want to test that we have deserialized the operation.
    assert.equal(batchOperationArray[0].batchType, BatchType.table);
    assert.equal(
      batchOperationArray[0].batchOperationType,
      BatchOperationType.insert,
      "wrong operation type parsed"
    );
  });

  // ToDo: we need to test the serialization and function of
  // the BatchRequest type as well
});
