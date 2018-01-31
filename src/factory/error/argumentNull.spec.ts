/**
 * ArgumentNullErrorテスト
 * @ignore
 */

import * as assert from 'assert';

import ArgumentNullError from './argumentNull';
import { PECORINOError } from './pecorino';

describe('new ArgumentNullError()', () => {
    it('正しくインスタンス化できる', async () => {
        const argumentName = 'testname';
        const message = 'test message';
        const error = new ArgumentNullError(argumentName, message);
        assert(error instanceof Error);
        assert.equal(error.argumentName, argumentName);
        assert.equal(error.message, message);
        assert.equal(error.name, PECORINOError.name);
        assert.equal(typeof error.stack, 'string');
    });

    it('メッセージを指定しなくても、正しくインスタンス化できる', async () => {
        const argumentName = 'testname';
        const error = new ArgumentNullError(argumentName);
        assert(error instanceof Error);
        assert.equal(error.argumentName, argumentName);
        assert.equal(error.name, PECORINOError.name);
        assert.equal(typeof error.message, 'string');
        assert.equal(typeof error.stack, 'string');
    });
});
