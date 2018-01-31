import ErrorCode from '../errorCode';

/**
 * PECORINOError
 *
 * @class PECORINOError
 * @extends {Error}
 */
export class PECORINOError extends Error {
    public readonly reason: ErrorCode;

    constructor(code: ErrorCode, message?: string) {
        super(message);

        this.name = 'PECORINOError';
        this.reason = code;

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, PECORINOError.prototype);
    }
}
