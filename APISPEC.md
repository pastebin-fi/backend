# PowerPaste API Specification

-   The responses are in [JSON](http://json.org/).

-   Every response contains a relevant status code.
-   The current production API is available at [https://api.pastebin.fi](https://api.pastebin.fi).

## Error responses

Error responses are returned in following format, with status code set to any value between `400` and `599`

```json
{
    "title": "error type",
    "message": "more specific data of the error"
}
```

### Additional fields

In some cases additional fields are given in the error response. For example, when creating a new paste with existing paste's ID, the existing paste's ID is returned. The responses can look similar to below.

```json
{
    "title": "some error",
    "message": "blaah blaah",
    "data": {
        "pasteIdentifier": "existing paste ID"
    }
}
```

## General

General endpoints are located in the API root.

### `/metrics` - Show sitewide metrics data

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

### `/ip ` - Public IP-address

Endpoint: `/ip`
Method: `GET`
Example response:

```json
{
    "ip": "185.204.1.182"
}
```

## Pastes - `/pastes`.

-   (For example `/create` endpoint can be found in `/pastes/create`. )

### `POST /` Create a new paste

Example body:

```json
{
    "paste": "hello there",
    "title": "testiuploadi",
    "language": "python",
    "private": false
}
```

### `GET /:id` Get a paste by an ID

Example request: `GET /pastes/0cfG2yS`

### `GET /` Filter from pastes
