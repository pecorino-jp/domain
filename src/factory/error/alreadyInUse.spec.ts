/**
 * AlreadyInUseErrorテスト
 * @ignore
 */

import * as assert from 'assert';

import AlreadyInUseError from './alreadyInUse';
import { PECORINOError } from './pecorino';

describe('new AlreadyInUseError()', () => {
    it('正しくインスタンス化できる', async () => {
        const entityName = 'entityName';
        const fieldNames = ['fieldNames'];
        const message = 'test message';
        const error = new AlreadyInUseError(entityName, fieldNames, message);
        assert(error instanceof Error);
        assert.equal(error.entityName, entityName);
        assert.equal(error.fieldNames, fieldNames);
        assert.equal(error.message, message);
        assert.equal(error.name, PECORINOError.name);
        assert.equal(typeof error.stack, 'string');
    });

    it('メッセージを指定しなくても、正しくインスタンス化できる', async () => {
        const entityName = 'entityName';
        const fieldNames = ['fieldNames'];
        const error = new AlreadyInUseError(entityName, fieldNames);
        assert(error instanceof Error);
        assert.equal(error.entityName, entityName);
        assert.equal(error.fieldNames, fieldNames);
        assert.equal(error.name, PECORINOError.name);
        assert.equal(typeof error.message, 'string');
        assert.equal(typeof error.stack, 'string');
    });
});
