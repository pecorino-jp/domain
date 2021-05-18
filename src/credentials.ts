/**
 * 外部サービスを使用するための認証情報
 */
export const credentials = {
    chevre: {
        authorizeServerDomain: <string>process.env.CHEVRE_AUTHORIZE_SERVER_DOMAIN,
        clientId: <string>process.env.CHEVRE_CLIENT_ID,
        clientSecret: <string>process.env.CHEVRE_CLIENT_SECRET,
        endpoint: <string>process.env.CHEVRE_ENDPOINT
    }
};
