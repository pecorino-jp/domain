// tslint:disable:no-implicit-dependencies
/**
 * タスクファンクションサービステスト
 */
import * as mongoose from 'mongoose';
import * as assert from 'power-assert';
import * as sinon from 'sinon';

import * as pecorino from '../index';
import * as taskFunctions from './taskFunctions';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('金額転送を中止する', () => {
    beforeEach(() => {
        sandbox.restore();
    });

    it('リポジトリーが正常であれば開設できるはず', async () => {
        sandbox.mock(pecorino.service.account)
            .expects('cancelMoneyTransfer')
            .once()
            .returns(async () => Promise.resolve());

        const result = await taskFunctions.cancelAccountMoneyTransfer(<any>{ data: {} })({
            connection: mongoose.connection
        });
        assert.equal(result, undefined);
        sandbox.verify();
    });
});

describe('金額を転送する', () => {
    beforeEach(() => {
        sandbox.restore();
    });

    it('リポジトリーが正常であれば開設できるはず', async () => {
        sandbox.mock(pecorino.service.account)
            .expects('transferMoney')
            .once()
            .returns(async () => Promise.resolve());

        const result = await taskFunctions.accountMoneyTransfer(<any>{ data: {} })({
            connection: mongoose.connection
        });
        assert.equal(result, undefined);
        sandbox.verify();
    });
});
