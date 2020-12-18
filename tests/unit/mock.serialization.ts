// Contains Mocks for Serialization Tests

export default class SerializationMocks {
  public static TableBatchRequestMimeBodyString: string =
    '\
--batch_a1e9d677-b28b-435e-a89e-87e6a768a431\n\
Content-Type: multipart/mixed; boundary=changeset_8a28b620-b4bb-458c-a177-0959fb14c977\n\
\n\
--changeset_8a28b620-b4bb-458c-a177-0959fb14c977\n\
Content-Type: application/http\n\
Content-Transfer-Encoding: binary\n\
\n\
POST https://myaccount.table.core.windows.net/Blogs HTTP/1.1\n\
Content-Type: application/json\n\
Accept: application/json;odata=minimalmetadata\n\
Prefer: return-no-content\n\
DataServiceVersion: 3.0;\n\
\n\
{"PartitionKey":"Channel_19", "RowKey":"1", "Rating":9, "Text":".NET..."}\n\
--changeset_8a28b620-b4bb-458c-a177-0959fb14c977\n\
Content-Type: application/http\n\
Content-Transfer-Encoding: binary\n\
\n\
POST https://myaccount.table.core.windows.net/Blogs HTTP/1.1\n\
Content-Type: application/json\n\
Accept: application/json;odata=minimalmetadata\n\
Prefer: return-no-content\n\
DataServiceVersion: 3.0;\n\
\n\
{"PartitionKey":"Channel_17", "RowKey":"2", "Rating":9, "Text":"Azure..."}\n\
--changeset_8a28b620-b4bb-458c-a177-0959fb14c977\n\
Content-Type: application/http\n\
Content-Transfer-Encoding: binary\
\n\
MERGE https://myaccount.table.core.windows.net/Blogs(PartitionKey=\'Channel_17\', RowKey=\'3\') HTTP/1.1\n\
Content-Type: application/json\n\
Accept: application/json;odata=minimalmetadata\n\
DataServiceVersion: 3.0;\n\
\n\
{"PartitionKey":"Channel_19", "RowKey":"3", "Rating":9, "Text":"PDC 2008..."}\n\
\n\
--changeset_8a28b620-b4bb-458c-a177-0959fb14c977--\n\
--batch_a1e9d677-b28b-435e-a89e-87e6a768a431\n\
';
}
