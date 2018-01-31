/**
 * アプリケーションクライアントユーザーファクトリー
 * クライアントサイドでapiを利用するユーザー
 * @namespace clientUser
 */

/**
 * クライアントユーザーインターフェース
 * @export
 * @interface IClientUser
 * @memberof clientUser
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
