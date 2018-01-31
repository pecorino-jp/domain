import ErrorCode from '../errorCode';
import { PECORINOError } from './pecorino';

/**
 * NotFoundError
 *
 * @class NotFoundError
 * @extends {PECORINOError}
 */
export default class NotFoundError extends PECORINOError {
    public readonly entityName: string;

    constructor(entityName: string, message?: string) {
        if (message === undefined || message.length === 0) {
            // tslint:disable-next-line:no-parameter-reassignment
            message = `Not Found: ${entityName}.`;
        }

        super(ErrorCode.NotFound, message);

        this.entityName = entityName;

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}
