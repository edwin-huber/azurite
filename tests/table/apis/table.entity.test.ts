import * as assert from "assert";
import * as Azure from "azure-storage";

import { configLogger } from "../../../src/common/Logger";
import StorageError from "../../../src/table/errors/StorageError";
import TableConfiguration from "../../../src/table/TableConfiguration";
import TableServer from "../../../src/table/TableServer";
import {
  EMULATOR_ACCOUNT_KEY,
  EMULATOR_ACCOUNT_NAME,
  getUniqueName,
  overrideRequest,
  restoreBuildRequestOptions
} from "../../testutils";

// Set true to enable debug log
configLogger(false);

// Create Entity for tests
function createBasicEntityForTest() {
  return {
    PartitionKey: eg.String("part1"),
    RowKey: eg.String(getUniqueName("row")),
    myValue: eg.String("value1")
  };
}

// const wildCardEtag = {
//   ".metadata": {
//     etag: "*" // forcing unconditional etag match to delete
//   }
// };

const eg = Azure.TableUtilities.entityGenerator;

describe("table Entity APIs test", () => {
  // TODO: Create a server factory as tests utils
  const protocol = "http";
  const host = "127.0.0.1";
  const port = 11002;
  const metadataDbPath = "__tableTestsStorage__";

  const config = new TableConfiguration(
    host,
    port,
    metadataDbPath,
    false,
    false
  );

  let server: TableServer;
  const accountName = EMULATOR_ACCOUNT_NAME;
  const sharedKey = EMULATOR_ACCOUNT_KEY;
  const connectionString =
    `DefaultEndpointsProtocol=${protocol};AccountName=${accountName};` +
    `AccountKey=${sharedKey};TableEndpoint=${protocol}://${host}:${port}/${accountName};`;

  const tableService = Azure.createTableService(connectionString);

  let tableName: string = getUniqueName("table");

  const requestOverride = { headers: {} };

  before(async () => {
    overrideRequest(requestOverride, tableService);
    server = new TableServer(config);
    tableName = getUniqueName("table");
    await server.start();
    requestOverride.headers = {
      Prefer: "return-content",
      accept: "application/json;odata=fullmetadata"
    };

    tableService.createTable(tableName, (error, result, response) => {
      // created table for tests
    });
  });

  after(async () => {
    await server.close();
    restoreBuildRequestOptions(tableService);
  });

  // Simple test in here until we have the full set checked in, as we need
  // a starting point for delete and query entity APIs
  it("Should insert new Entity, @loki", done => {
    // https://docs.microsoft.com/en-us/rest/api/storageservices/insert-entity
    const entity = {
      PartitionKey: "part1",
      RowKey: "row1",
      myValue: "value1"
    };
    tableService.insertEntity(tableName, entity, (error, result, response) => {
      assert.equal(response.statusCode, 201);
      done();
    });
  });

  it("Should delete an Entity using etag wildcard, @loki", done => {
    // https://docs.microsoft.com/en-us/rest/api/storageservices/delete-entity1
    const entity = {
      PartitionKey: "part1",
      RowKey: "row1",
      myValue: "somevalue",
      ".metadata": {
        etag: "*" // forcing unconditional etag match to delete
      }
    };

    /* https://docs.microsoft.com/en-us/rest/api/storageservices/delete-entity1#request-headers
    If-Match	Required. The client may specify the ETag for the entity on the request in
    order to compare to the ETag maintained by the service for the purpose of optimistic concurrency.
    The delete operation will be performed only if the ETag sent by the client matches the value
    maintained by the server, indicating that the entity has not been modified since it was retrieved by the client.
    To force an unconditional delete, set If-Match to the wildcard character (*). */

    tableService.deleteEntity(tableName, entity, (error, response) => {
      assert.equal(response.statusCode, 204);
      done();
    });
  });

  it("Should not delete an Entity not matching Etag, @loki", done => {
    // https://docs.microsoft.com/en-us/rest/api/storageservices/delete-entity1
    const entityInsert = {
      PartitionKey: "part1",
      RowKey: "row2",
      myValue: "shouldNotMatchetag"
    };
    const entityDelete = {
      PartitionKey: "part1",
      RowKey: "row2",
      myValue: "shouldNotMatchetag",
      ".metadata": {
        etag: "0x2252C97588D4000"
      }
    };
    requestOverride.headers = {
      Prefer: "return-content",
      accept: "application/json;odata=fullmetadata"
    };
    tableService.insertEntity(
      tableName,
      entityInsert,
      (insertError, insertResult, insertResponse) => {
        if (!insertError) {
          requestOverride.headers = {};
          tableService.deleteEntity(
            tableName,
            entityDelete,
            (deleteError, deleteResponse) => {
              assert.equal(deleteResponse.statusCode, 412); // Precondition failed
              done();
            }
          );
        } else {
          assert.ifError(insertError);
          done();
        }
      }
    );
  });

  it("Should delete a matching Etag, @loki", done => {
    // https://docs.microsoft.com/en-us/rest/api/storageservices/delete-entity1
    const entityInsert = {
      PartitionKey: "part1",
      RowKey: "row3",
      myValue: "shouldMatchEtag"
    };
    requestOverride.headers = {
      Prefer: "return-content",
      accept: "application/json;odata=fullmetadata"
    };
    tableService.insertEntity(
      tableName,
      entityInsert,
      (error, result, insertresponse) => {
        if (!error) {
          requestOverride.headers = {};
          tableService.deleteEntity(
            tableName,
            result, // SDK defined entity type...
            (deleteError, deleteResponse) => {
              if (!deleteError) {
                assert.equal(deleteResponse.statusCode, 204); // Precondition succeeded
                done();
              } else {
                assert.ifError(deleteError);
                done();
              }
            }
          );
        } else {
          assert.ifError(error);
          done();
        }
      }
    );
  });

  it("Update an Entity that exists, @loki", done => {
    const entityInsert = {
      PartitionKey: "part1",
      RowKey: "row3",
      myValue: "oldValue"
    };
    tableService.insertEntity(
      tableName,
      entityInsert,
      (error, result, insertresponse) => {
        if (!error) {
          requestOverride.headers = {};
          tableService.replaceEntity(
            tableName,
            { PartitionKey: "part1", RowKey: "row3", myValue: "newValue" },
            (updateError, updateResult, updateResponse) => {
              if (!updateError) {
                assert.equal(updateResponse.statusCode, 204); // Precondition succeeded
                done();
              } else {
                assert.ifError(updateError);
                done();
              }
            }
          );
        } else {
          assert.ifError(error);
          done();
        }
      }
    );
  });

  it("Update an Entity that does not exist, @loki", done => {
    tableService.replaceEntity(
      tableName,
      { PartitionKey: "part1", RowKey: "row4", myValue: "newValue" },
      (updateError, updateResult, updateResponse) => {
        const castUpdateStatusCode = (updateError as StorageError).statusCode;
        if (updateError) {
          assert.equal(castUpdateStatusCode, 409);
          done();
        } else {
          assert.fail("Test failed to throw the right Error" + updateError);
        }
      }
    );
  });

  it("Should not update an Entity not matching Etag, @loki", done => {
    const entityInsert = {
      PartitionKey: "part1",
      RowKey: "row4",
      myValue: "oldValue"
    };
    const entityUpdate = {
      PartitionKey: "part1",
      RowKey: "row4",
      myValue: "oldValueUpdate",
      ".metadata": {
        etag: "0x2252C97588D4000"
      }
    };
    requestOverride.headers = {
      Prefer: "return-content",
      accept: "application/json;odata=fullmetadata"
    };
    tableService.insertEntity(
      tableName,
      entityInsert,
      (insertError, insertResult, insertResponse) => {
        if (!insertError) {
          requestOverride.headers = {};
          tableService.replaceEntity(
            tableName,
            entityUpdate,
            (updateError, updateResponse) => {
              const castUpdateStatusCode = (updateError as StorageError)
                .statusCode;
              assert.equal(castUpdateStatusCode, 412); // Precondition failed
              done();
            }
          );
        } else {
          assert.ifError(insertError);
          done();
        }
      }
    );
  });

  it("Should update, if Etag matches, @loki", done => {
    const entityInsert = {
      PartitionKey: "part1",
      RowKey: "row5",
      myValue: "oldValue"
    };
    requestOverride.headers = {
      Prefer: "return-content",
      accept: "application/json;odata=fullmetadata"
    };
    tableService.insertEntity(
      tableName,
      entityInsert,
      (error, result, insertresponse) => {
        const etagOld = result[".metadata"].etag;
        const entityUpdate = {
          PartitionKey: "part1",
          RowKey: "row5",
          myValue: "oldValueUpdate",
          ".metadata": {
            etag: etagOld
          }
        };
        if (!error) {
          requestOverride.headers = {};
          tableService.replaceEntity(
            tableName,
            entityUpdate,
            (updateError, updateResult, updateResponse) => {
              if (!updateError) {
                assert.equal(updateResponse.statusCode, 204); // Precondition succeeded
                done();
              } else {
                assert.ifError(updateError);
                done();
              }
            }
          );
        } else {
          assert.ifError(error);
          done();
        }
      }
    );
  });

  it("Insert or Replace (upsert) on an Entity that does not exist, @loki", done => {
    requestOverride.headers = {
      Prefer: "return-content",
      accept: "application/json;odata=fullmetadata"
    };
    tableService.insertOrReplaceEntity(
      tableName,
      {
        PartitionKey: "part1",
        RowKey: "row6",
        myValue: "firstValue"
      },
      (updateError, updateResult, updateResponse) => {
        if (updateError) {
          assert.ifError(updateError);
          done();
        } else {
          assert.equal(updateResponse.statusCode, 204); // No content
          // TODO When QueryEntity is done - validate Entity Properties
          done();
        }
      }
    );
  });

  it("Insert or Replace (upsert) on an Entity that exists, @loki", done => {
    requestOverride.headers = {
      Prefer: "return-content",
      accept: "application/json;odata=fullmetadata"
    };
    tableService.insertOrReplaceEntity(
      tableName,
      {
        PartitionKey: "part1",
        RowKey: "row6",
        myValue: "newValue"
      },
      (updateError, updateResult, updateResponse) => {
        if (updateError) {
          assert.ifError(updateError);
          done();
        } else {
          assert.equal(updateResponse.statusCode, 204); // No content
          // TODO When QueryEntity is done - validate Entity Properties
          done();
        }
      }
    );
  });

  it("Insert or Merge on an Entity that exists, @loki", done => {
    const entityInsert = {
      PartitionKey: "part1",
      RowKey: "merge1",
      myValue: "oldValue"
    };
    requestOverride.headers = {
      Prefer: "return-content",
      accept: "application/json;odata=fullmetadata"
    };
    tableService.insertEntity(
      tableName,
      entityInsert,
      (error, result, insertresponse) => {
        const entityUpdate = {
          PartitionKey: "part1",
          RowKey: "merge1",
          mergeValue: "newValue"
        };
        if (!error) {
          requestOverride.headers = {};
          tableService.insertOrMergeEntity(
            tableName,
            entityUpdate,
            (updateError, updateResult, updateResponse) => {
              if (!updateError) {
                assert.equal(updateResponse.statusCode, 204); // Precondition succeeded
                // TODO When QueryEntity is done - validate Entity Properties
                done();
              } else {
                assert.ifError(updateError);
                done();
              }
            }
          );
        } else {
          assert.ifError(error);
          done();
        }
      }
    );
  });

  it("Insert or Merge on an Entity that does not exist, @loki", done => {
    requestOverride.headers = {
      Prefer: "return-content",
      accept: "application/json;odata=fullmetadata"
    };
    tableService.insertOrMergeEntity(
      tableName,
      {
        PartitionKey: "part1",
        RowKey: "row8",
        myValue: "firstValue"
      },
      (updateError, updateResult, updateResponse) => {
        if (updateError) {
          assert.ifError(updateError);
          done();
        } else {
          assert.equal(updateResponse.statusCode, 204); // No content
          // TODO When QueryEntity is done - validate Entity Properties
          done();
        }
      }
    );
  });

  it.only("Simple batch test: Inserts multiple entities as a batch, @loki", done => {
    requestOverride.headers = {
      Prefer: "return-content",
      accept: "application/json;odata=fullmetadata"
    };
    const batchEntity1 = createBasicEntityForTest();
    const batchEntity2 = createBasicEntityForTest();
    const batchEntity3 = createBasicEntityForTest();

    const entityBatch: Azure.TableBatch = new Azure.TableBatch();
    entityBatch.addOperation("INSERT", batchEntity1, { echoContent: true });
    entityBatch.addOperation("INSERT", batchEntity2, { echoContent: true });
    entityBatch.addOperation("INSERT", batchEntity3, { echoContent: true });

    tableService.executeBatch(
      tableName,
      entityBatch,
      (updateError, updateResult, updateResponse) => {
        if (updateError) {
          assert.ifError(updateError);
          done();
        } else {
          assert.equal(updateResponse.statusCode, 202); // No content
          // TODO When QueryEntity is done - validate Entity Properties
          tableService.retrieveEntity(
            tableName,
            batchEntity1.PartitionKey._,
            batchEntity1.RowKey._,
            (error, result) => {
              if (error) {
                assert.ifError(error);
              } else if (result) {
                assert.equal(result, null);
              }
              done();
            }
          );
        }
      }
    );
  });
  // ToDo: Batch Validation:
  // A change set is a group of one or more insert, update, or delete operations.
  // A batch is a container of operations, including one or more change sets and query operations.
  // The Table service supports a subset of the functionality defined by the OData specification:
  //  The Table service supports only a single change set within a batch. The change set can include
  // multiple insert, update, and delete operations. If a batch includes more than one change set,
  // the first change set will be processed by the service, and additional change sets will be rejected
  // with status code 400 (Bad Request).
  // Multiple operations against a single entity are not permitted within a change set.
  // Note that a query operation is not permitted within a batch that contains insert, update, or delete
  // operations; it must be submitted singly in the batch.
  // Operations within a change set are processed atomically; that is, all operations in the change set
  // either succeed or fail. Operations are processed in the order they are specified in the change set.
  // The Table service does not support linking operations in a change set.
  // The Table service supports a maximum of 100 operations in a change set.

  // Implementation help:
  // https://docs.microsoft.com/en-us/rest/api/storageservices/blob-batch
  // https://docs.microsoft.com/en-us/rest/api/storageservices/performing-entity-group-transactions

  // Step 1. create Table handler for "POST" to table service root with $batch option.
  // Step 2. Handle "De-Serialization of batch requests" via example from JS SDK
  // using shared module (to be available for blob)
  // https://github.com/Azure/azure-sdk-for-js/blob/master/sdk/tables/data-tables/src/TableBatch.ts

  // Step 3. Validate request conforms to table service batch restrictions
  // see : https://docs.microsoft.com/en-us/rest/api/storageservices/performing-entity-group-transactions

  // Step 4. For each transaction:
  //                 Execute entity transaction via Hanlder & Loki Table Metadata store
  //                 Store results
  // NOTE:
  /*
    1. A change set is a group of one or more insert, update, or delete operations.
    2. A batch is a container of operations, including one or more change sets and query operations.
    3. An individual request within the change set is identical to a request made when that operation
       is being called by itself.
    4. The Table service supports only a single change set within a batch. The change set can include
       multiple insert, update, and delete operations.
    5. If a batch includes more than one change set, the first change set will be processed by the
       service, and additional change sets will be rejected with status code 400 (Bad Request).
    6. Multiple operations against a single entity are not permitted within a change set.
    7. A query operation is not permitted within a batch that contains insert, update, or delete
       operations; it must be submitted singly in the batch.ded
    8. Operations within a change set are processed atomically; that i^s, all operations in the change
       set either succeed or fail. Operations are processed in the order they are specified in the change set.
    9. The Table service does not support linking operations in a change set.
    10. ded
  */

  // Step 5. Return results to caller
});
