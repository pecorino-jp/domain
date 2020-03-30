// tslint:disable:no-implicit-dependencies
/**
 * 転送取引サービステスト
 */
import * as mongoose from 'mongoose';
import * as assert from 'power-assert';
import * as sinon from 'sinon';

import * as pecorino from '../../index';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('転送取引を開始する', () => {
    beforeEach(() => {
        sandbox.restore();
    });

    it('リポジトリーが正常であれば開始できるはず', async () => {
        const account = {};
        const transaction = {
            typeOf: pecorino.factory.transactionType.Transfer,
            agent: {},
            recipient: {},
            object: {
                fromLocation: {},
                toLocation: {}
            },
            expires: new Date(),
            status: pecorino.factory.transactionStatusType.Confirmed,
            startDate: new Date()
        };
        const accountRepo = new pecorino.repository.Account(mongoose.connection);
        const actionRepo = new pecorino.repository.Action(mongoose.connection);
        const transactionRepo = new pecorino.repository.Transaction(mongoose.connection);
        sandbox.mock(accountRepo)
            .expects('findByAccountNumber')
            .twice()
            .onFirstCall()
            .resolves(account)
            .onSecondCall()
            .resolves(account);
        sandbox.mock(transactionRepo)
            .expects('start')
            .once()
            .resolves(transaction);
        sandbox.mock(accountRepo)
            .expects('authorizeAmount')
            .once()
            .resolves();
        sandbox.mock(accountRepo)
            .expects('startTransaction')
            .once()
            .resolves();
        sandbox.mock(actionRepo)
            .expects('start')
            .once()
            .resolves();

        const result = await pecorino.service.transaction.transfer.start(<any>{
            project: {},
            agent: transaction.agent,
            object: transaction.object
        })({
            account: accountRepo,
            action: actionRepo,
            transaction: transactionRepo
        });
        assert.equal(typeof result, 'object');
        sandbox.verify();
    });

    it('開始時リポジトリーに問題があれば、そのままエラーとなるはず', async () => {
        const account = {};
        const transaction = {
            typeOf: pecorino.factory.transactionType.Transfer,
            agent: {},
            recipient: {},
            object: {
                fromLocation: {},
                toLocation: {}
            },
            expires: new Date(),
            status: pecorino.factory.transactionStatusType.Confirmed,
            startDate: new Date()
        };
        const startError = new Error('startError');
        const accountRepo = new pecorino.repository.Account(mongoose.connection);
        const actionRepo = new pecorino.repository.Action(mongoose.connection);
        const transactionRepo = new pecorino.repository.Transaction(mongoose.connection);
        sandbox.mock(accountRepo)
            .expects('findByAccountNumber')
            .twice()
            .onFirstCall()
            .resolves(account)
            .onSecondCall()
            .resolves(account);
        sandbox.mock(transactionRepo)
            .expects('start')
            .once()
            .rejects(startError);
        sandbox.mock(accountRepo)
            .expects('authorizeAmount')
            .never();
        sandbox.mock(accountRepo)
            .expects('startTransaction')
            .never();

        const result = await pecorino.service.transaction.transfer.start(<any>{
            project: {},
            agent: transaction.agent,
            object: transaction.object
        })({
            account: accountRepo,
            action: actionRepo,
            transaction: transactionRepo
        })
            .catch((err) => err);
        assert.deepEqual(result, startError);
        sandbox.verify();
    });
});
