import * as assert from "assert";
import { BatchOperationType, BatchType } from "../../src/common/BatchOperation";
// import BatchSubResponse from "../../src/common/BatchSubResponse"
import { TableBatchSerialization } from "../../src/table/utils/TableBatchSerialization";
import SerializationMocks from "./mock.serialization";

describe("batch serialization and deserialization unit tests, not API integration test!:", () => {
  it("deserializes, mock table batch request containing 3 requests correctly", done => {
    const requestString = SerializationMocks.TableBatchRequestMimeBodyString;
    const serializer = new TableBatchSerialization();
    const batchOperationArray = serializer.deserializeBatchRequest(
      requestString
    );

    // this is a stupid test, as I control the type within the code
    // we want to test that we have deserialized the operation.
    assert.equal(batchOperationArray[0].batchType, BatchType.table);
    assert.equal(
      batchOperationArray[0].batchOperationType,
      BatchOperationType.insert,
      "wrong operation type parsed"
    );
  });
});
