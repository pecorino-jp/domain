import ErrorCode from '../errorCode';
import { PECORINOError } from './pecorino';

/**
 * UnauthorizedError
 * @extends {PECORINOError}
 */
export default class UnauthorizedError extends PECORINOError {
    constructor(message?: string) {
        if (message === undefined || message.length === 0) {
            // tslint:disable-next-line:no-parameter-reassignment
            message = 'Unauthorized.';
        }

        super(ErrorCode.Unauthorized, message);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, UnauthorizedError.prototype);
    }
}
