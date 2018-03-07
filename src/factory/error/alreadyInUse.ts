import ErrorCode from '../errorCode';
import { PECORINOError } from './pecorino';

/**
 * AlreadyInUseError
 * @extends {PECORINOError}
 */
export default class AlreadyInUseError extends PECORINOError {
    public readonly entityName: string;
    public readonly fieldNames: string[];

    constructor(entityName: string, fieldNames: string[], message?: string) {
        if (message === undefined || message.length === 0) {
            // tslint:disable-next-line:no-parameter-reassignment
            message = `The specified '${entityName}' value is already in use for: ${fieldNames.join(', ')}.`;
        }

        super(ErrorCode.AlreadyInUse, message);

        this.entityName = entityName;
        this.fieldNames = fieldNames;

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, AlreadyInUseError.prototype);
    }
}
