/**
 * UnauthorizedErrorテスト
 * @ignore
 */

import * as assert from 'assert';

import { PECORINOError } from './pecorino';
import UnauthorizedError from './unauthorized';

describe('new UnauthorizedError()', () => {
    it('正しくインスタンス化できる', async () => {
        const message = 'test message';
        const error = new UnauthorizedError(message);
        assert(error instanceof Error);
        assert.equal(error.message, message);
        assert.equal(error.name, PECORINOError.name);
        assert.equal(typeof error.stack, 'string');
    });

    it('メッセージを指定しなくても、正しくインスタンス化できる', async () => {
        const error = new UnauthorizedError();
        assert(error instanceof Error);
        assert.equal(error.name, PECORINOError.name);
        assert.equal(typeof error.message, 'string');
        assert.equal(typeof error.stack, 'string');
    });
});
