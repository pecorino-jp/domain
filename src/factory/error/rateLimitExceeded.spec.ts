/**
 * RateLimitExceededErrorテスト
 * @ignore
 */

import * as assert from 'assert';

import RateLimitExceededError from './rateLimitExceeded';
import { PECORINOError } from './pecorino';

describe('new RateLimitExceededError()', () => {
    it('正しくインスタンス化できる', async () => {
        const message = 'test message';
        const error = new RateLimitExceededError(message);
        assert(error instanceof Error);
        assert.equal(error.message, message);
        assert.equal(error.name, PECORINOError.name);
        assert.equal(typeof error.stack, 'string');
    });

    it('メッセージを指定しなくても、正しくインスタンス化できる', async () => {
        const error = new RateLimitExceededError();
        assert(error instanceof Error);
        assert.equal(error.name, PECORINOError.name);
        assert.equal(typeof error.message, 'string');
        assert.equal(typeof error.stack, 'string');
    });
});
