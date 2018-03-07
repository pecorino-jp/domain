import ErrorCode from '../errorCode';
import { PECORINOError } from './pecorino';

/**
 * ServiceUnavailableError
 * @extends {PECORINOError}
 */
export default class ServiceUnavailableError extends PECORINOError {
    constructor(message?: string) {
        if (message === undefined || message.length === 0) {
            // tslint:disable-next-line:no-parameter-reassignment
            message = 'Service unavailable temporarily.';
        }

        super(ErrorCode.ServiceUnavailable, message);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
    }
}
