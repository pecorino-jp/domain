import ErrorCode from '../errorCode';
import { PECORINOError } from './pecorino';

/**
 * ForbiddenError
 * @extends {PECORINOError}
 */
export default class ForbiddenError extends PECORINOError {
    constructor(message?: string) {
        if (message === undefined || message.length === 0) {
            // tslint:disable-next-line:no-parameter-reassignment
            message = 'Forbidden.';
        }

        super(ErrorCode.Forbidden, message);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, ForbiddenError.prototype);
    }
}
