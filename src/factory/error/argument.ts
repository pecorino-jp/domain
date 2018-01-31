import ErrorCode from '../errorCode';
import { PECORINOError } from './pecorino';

/**
 * ArgumentError
 *
 * @class ArgumentError
 * @extends {PECORINOError}
 */
export default class ArgumentError extends PECORINOError {
    public readonly argumentName: string;

    constructor(argumentName: string, message?: string) {
        if (message === undefined || message.length === 0) {
            // tslint:disable-next-line:no-parameter-reassignment
            message = `Invalid or missing argument supplied: ${argumentName}.`;
        }

        super(ErrorCode.Argument, message);

        this.argumentName = argumentName;

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, ArgumentError.prototype);
    }
}
