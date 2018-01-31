import ErrorCode from '../errorCode';
import { PECORINOError } from './pecorino';

/**
 * RateLimitExceededError
 * @class RateLimitExceededError
 * @extends {PECORINOError}
 */
export default class RateLimitExceededError extends PECORINOError {
    constructor(message?: string) {
        if (message === undefined || message.length === 0) {
            // tslint:disable-next-line:no-parameter-reassignment
            message = 'Rate limit exceeded.';
        }

        super(ErrorCode.RateLimitExceeded, message);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, RateLimitExceededError.prototype);
    }
}
