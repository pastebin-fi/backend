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
        pasteSizeLimit: mb * 1,
        searchQueries: 0,
    },
    registered: {
        searchEnabled: true,
        searchQueries: 20,
        pasteSizeLimit: mb * 5,
    },
}

const getPasteSizeLimit = (identity: any) => {
    if (!identity) return limits.anonymous.pasteSizeLimit
    return limits.registered.pasteSizeLimit
}
export { limits, getPasteSizeLimit as getMaxSize }
