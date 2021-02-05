export default class SerializationRequestMocks {
  // This is a reponse from Azure Storage Service to
  // Test : Insert and Delete entity via a batch
  public static ResponseString: string =
    '\
  --batchresponse_05033918-f7c0-4393-b7f4-a882162f289c\r\nContent-Type: multipart/mixed; boundary=changesetresponse_6b09c826-409b-41bc-be97-800c3778987d\r\n\r\n--changesetresponse_6b09c826-409b-41bc-be97-800c3778987d\r\nContent-Type: application/http\r\nContent-Transfer-Encoding: binary\r\n\r\nHTTP/1.1 201 Created\r\nDataServiceVersion: 3.0;\r\nContent-Type: application/json;odata=minimalmetadata;streaming=true;charset=utf-8\r\nX-Content-Type-Options: nosniff\r\nCache-Control: no-cache\r\nPreference-Applied: return-content\r\nLocation: https://asynccopiertesttarget.table.core.windows.net/TestingAzurite(PartitionKey=\'part1\',RowKey=\'row161245440360308682\')\r\nETag: W/"datetime\'2021-02-04T16%3A00%3A03.9434585Z\'"\r\n\r\n{"odata.metadata":"https://asynccopiertesttarget.table.core.windows.net/$metadata#TestingAzurite/@Element","odata.etag":"W/\\"datetime\'2021-02-04T16%3A00%3A03.9434585Z\'\\"","PartitionKey":"part1","RowKey":"row161245440360308682","Timestamp":"2021-02-04T16:00:03.9434585Z","myValue":"value1"}\r\n--changesetresponse_6b09c826-409b-41bc-be97-800c3778987d\r\nContent-Type: application/http\r\nContent-Transfer-Encoding: binary\r\n\r\nHTTP/1.1 201 Created\r\nDataServiceVersion: 3.0;\r\nContent-Type: application/json;odata=minimalmetadata;streaming=true;charset=utf-8\r\nContent-ID: 1\r\nX-Content-Type-Options: nosniff\r\nCache-Control: no-cache\r\nPreference-Applied: return-content\r\nLocation: https://asynccopiertesttarget.table.core.windows.net/TestingAzurite(PartitionKey=\'part1\',RowKey=\'row161245440360301182\')\r\nETag: W/"datetime\'2021-02-04T16%3A00%3A03.9444585Z\'"\r\n\r\n{"odata.metadata":"https://asynccopiertesttarget.table.core.windows.net/$metadata#TestingAzurite/@Element","odata.etag":"W/\\"datetime\'2021-02-04T16%3A00%3A03.9444585Z\'\\"","PartitionKey":"part1","RowKey":"row161245440360301182","Timestamp":"2021-02-04T16:00:03.9444585Z","myValue":"value1"}\r\n--changesetresponse_6b09c826-409b-41bc-be97-800c3778987d\r\nContent-Type: application/http\r\nContent-Transfer-Encoding: binary\r\n\r\nHTTP/1.1 201 Created\r\nDataServiceVersion: 3.0;\r\nContent-Type: application/json;odata=minimalmetadata;streaming=true;charset=utf-8\r\nContent-ID: 2\r\nX-Content-Type-Options: nosniff\r\nCache-Control: no-cache\r\nPreference-Applied: return-content\r\nLocation: https://asynccopiertesttarget.table.core.windows.net/TestingAzurite(PartitionKey=\'part1\',RowKey=\'row161245440360301102\')\r\nETag: W/"datetime\'2021-02-04T16%3A00%3A03.9444585Z\'"\r\n\r\n{"odata.metadata":"https://asynccopiertesttarget.table.core.windows.net/$metadata#TestingAzurite/@Element","odata.etag":"W/\\"datetime\'2021-02-04T16%3A00%3A03.9444585Z\'\\"","PartitionKey":"part1","RowKey":"row161245440360301102","Timestamp":"2021-02-04T16:00:03.9444585Z","myValue":"value1"}\r\n--changesetresponse_6b09c826-409b-41bc-be97-800c3778987d--\r\n--batchresponse_05033918-f7c0-4393-b7f4-a882162f289c--\r\n\
  ';
}
