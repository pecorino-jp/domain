import ErrorCode from '../errorCode';
import { PECORINOError } from './pecorino';

/**
 * NotImplementedError
 *
 * @class NotImplementedError
 * @extends {PECORINOError}
 */
export default class NotImplementedError extends PECORINOError {
    constructor(message?: string) {
        if (message === undefined || message.length === 0) {
            // tslint:disable-next-line:no-parameter-reassignment
            message = 'Method is not yet implemented.';
        }

        super(ErrorCode.NotImplemented, message);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, NotImplementedError.prototype);
    }
}
