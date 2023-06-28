const mb = Math.pow(2, 20)

interface LimitConfig {
    searchEnabled: boolean
    searchQueries: number // per day
    pasteSizeLimit: number // in bytes
}

const limits: {
    anonymous: LimitConfig
    registered: LimitConfig
} = {
    anonymous: {
        searchEnabled: false,
        pasteSizeLimit: 1,
        searchQueries: 0,
    },
    registered: {
        searchEnabled: true,
        searchQueries: 20,
        pasteSizeLimit: mb * 5,
    },
}
