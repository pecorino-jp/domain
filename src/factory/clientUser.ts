/**
 * アプリケーションクライアントユーザーファクトリー
 * クライアントサイドでapiを利用するユーザー
 */

/**
 * クライアントユーザーインターフェース
 * @export
 */
export interface IClientUser {
    sub: string;
    token_use: string;
    scope: string;
    scopes: string[];
    iss: string;
    exp: number;
    iat: number;
    version: number;
    jti: string;
    client_id: string;
    username?: string;
}
