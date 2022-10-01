# pastebin.fi API specifications

The API follows [jsend](https://github.com/omniti-labs/jsend) specification. The responses are in [JSON](http://json.org/). Every response also contains a relevant status code. The general structure of data is following:

<table>
<tr><th>Type</td><th>Description</th><th>Required Keys</th><th>Optional Keys</td></tr>
<tr><td>success</td><td>All went well, and (usually) some data was returned.</td><td>status, data</td><td></td></tr>
<tr><td>fail</td><td>There was a problem with the data submitted, or some pre-condition of the API call wasn't satisfied</td><td>status, data</td><td></td></tr>
<tr><td>error</td><td>An error occurred in processing the request, i.e. an exception was thrown</td><td>status, message</td><td>code, data</td></tr>
</table>

The API is available at [https://api.pastebin.fi](https://api.pastebin.fi).

## Metrics

### Sitewide

Endpoint: `/metrics`
Method: `GET`
Example response:
```json
{
    "totalViews": 377534,
    "pasteCount": {
        "total": 1091,
        "public": 752,
        "private": 339
    }
}
```

### IP

Endpoint: `/ip`
Method: `GET`
Example response:
```json
{
    "ip": "185.204.1.182"
}
```


## Pastes /pastes

Endpoint: `/pastes`

### Create


### Get


### Filter

----

**!!EVERYTHING UNDER THIS LINE IS NOT IMPLEMENTED!!**

----

### Delete


## Users

### Register


### Authenticate
