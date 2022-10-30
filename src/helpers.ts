export const makeid = (length) => {
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
}

// Consider also checking against ip2location proxy db lite
// Example of a bad ip: 46.161.11.244
export const checkReputation = async (ip, abuseipdbKey) => {
    const response = await fetch("https://api.abuseipdb.com/api/v2/check?maxAgeInDays=90&ipAddress=" + ip, {
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "Key": abuseipdbKey
      },
      method: "GET"
    })
    const body = await response.text();
    return body;
}