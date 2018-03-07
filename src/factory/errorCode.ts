/**
 * エラーコード
 */

enum ErrorCode {
    AlreadyInUse = 'AlreadyInUse',
    Argument = 'Argument',
    ArgumentNull = 'ArgumentNull',
    Forbidden = 'Forbidden',
    NotFound = 'NotFound',
    NotImplemented = 'NotImplemented',
    RateLimitExceeded = 'RateLimitExceeded',
    ServiceUnavailable = 'ServiceUnavailable',
    Unauthorized = 'Unauthorized'
}

export default ErrorCode;
