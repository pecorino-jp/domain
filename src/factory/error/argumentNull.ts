import ErrorCode from '../errorCode';
import { PECORINOError } from './pecorino';

/**
 * ArgumentNullError
 *
 * @class ArgumentNullError
 * @extends {PECORINOError}
 */
export default class ArgumentNullError extends PECORINOError {
    public readonly argumentName: string;

    constructor(argumentName: string, message?: string) {
        if (message === undefined || message.length === 0) {
            // tslint:disable-next-line:no-parameter-reassignment
            message = `Missing argument: ${argumentName}.`;
        }

        super(ErrorCode.ArgumentNull, message);

        this.argumentName = argumentName;

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, ArgumentNullError.prototype);
    }
}
