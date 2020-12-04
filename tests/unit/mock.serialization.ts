// Contains Mocks for Serialization Tests

export default class SerializationMocks {
  public static TableBatchRequestMimeBodyString: string =
    '  \
  --batch_a1e9d677-b28b-435e-a89e-87e6a768a431  \
  Content-Type: multipart/mixed; boundary=changeset_8a28b620-b4bb-458c-a177-0959fb14c977  \
    \
  --changeset_8a28b620-b4bb-458c-a177-0959fb14c977  \
  Content-Type: application/http  \
  Content-Transfer-Encoding: binary  \
  \
  POST https://myaccount.table.core.windows.net/Blogs HTTP/1.1  \
  Content-Type: application/json  \
  Accept: application/json;odata=minimalmetadata  \
  Prefer: return-no-content  \
  DataServiceVersion: 3.0;  \
  \
  {"PartitionKey":"Channel_19", "RowKey":"1", "Rating":9, "Text":".NET..."}  \
  --changeset_8a28b620-b4bb-458c-a177-0959fb14c977  \
  Content-Type: application/http  \
  Content-Transfer-Encoding: binary  \
  \
  POST https://myaccount.table.core.windows.net/Blogs HTTP/1.1  \
  Content-Type: application/json  \
  Accept: application/json;odata=minimalmetadata  \
  Prefer: return-no-content  \
  DataServiceVersion: 3.0;  \
  \
  {"PartitionKey":"Channel_17", "RowKey":"2", "Rating":9, "Text":"Azure..."}  \
  --changeset_8a28b620-b4bb-458c-a177-0959fb14c977  \
  Content-Type: application/http  \
  Content-Transfer-Encoding: binary\
  \
  MERGE https://myaccount.table.core.windows.net/Blogs(PartitionKey=\'Channel_17\', RowKey=\'3\') HTTP/1.1  \
  Content-Type: application/json  \
  Accept: application/json;odata=minimalmetadata  \
  DataServiceVersion: 3.0;  \
  \
  {"PartitionKey":"Channel_19", "RowKey":"3", "Rating":9, "Text":"PDC 2008..."}  \
  \
  --changeset_8a28b620-b4bb-458c-a177-0959fb14c977--  \
  --batch_a1e9d677-b28b-435e-a89e-87e6a768a431  \
    ';
}
