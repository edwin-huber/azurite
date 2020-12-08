// Contains Mocks for Serialization Tests

export default class SerializationMocks {
  public static TableBatchRequestMimeBodyString: string =
    '\
--batch_a1e9d677-b28b-435e-a89e-87e6a768a431\r\n\
Content-Type: multipart/mixed; boundary=changeset_8a28b620-b4bb-458c-a177-0959fb14c977\r\n\
\r\n\
--changeset_8a28b620-b4bb-458c-a177-0959fb14c977\r\n\
Content-Type: application/http\r\n\
Content-Transfer-Encoding: binary\r\n\
\r\n\
POST https://myaccount.table.core.windows.net/Blogs HTTP/1.1\r\n\
Content-Type: application/json\r\n\
Accept: application/json;odata=minimalmetadata\r\n\
Prefer: return-no-content\r\n\
DataServiceVersion: 3.0;\r\n\
\r\n\
{"PartitionKey":"Channel_19", "RowKey":"1", "Rating":9, "Text":".NET..."}\r\n\
--changeset_8a28b620-b4bb-458c-a177-0959fb14c977\r\n\
Content-Type: application/http\r\n\
Content-Transfer-Encoding: binary\r\n\
\r\n\
POST https://myaccount.table.core.windows.net/Blogs HTTP/1.1\r\n\
Content-Type: application/json\r\n\
Accept: application/json;odata=minimalmetadata\r\n\
Prefer: return-no-content\r\n\
DataServiceVersion: 3.0;\r\n\
\r\n\
{"PartitionKey":"Channel_17", "RowKey":"2", "Rating":9, "Text":"Azure..."}\r\n\
--changeset_8a28b620-b4bb-458c-a177-0959fb14c977\r\n\
Content-Type: application/http\r\n\
Content-Transfer-Encoding: binary\
\r\n\
MERGE https://myaccount.table.core.windows.net/Blogs(PartitionKey=\'Channel_17\', RowKey=\'3\') HTTP/1.1\r\n\
Content-Type: application/json\r\n\
Accept: application/json;odata=minimalmetadata\r\n\
DataServiceVersion: 3.0;\r\n\
\r\n\
{"PartitionKey":"Channel_19", "RowKey":"3", "Rating":9, "Text":"PDC 2008..."}\r\n\
\r\n\
--changeset_8a28b620-b4bb-458c-a177-0959fb14c977--\r\n\
--batch_a1e9d677-b28b-435e-a89e-87e6a768a431\r\n\
';
}
