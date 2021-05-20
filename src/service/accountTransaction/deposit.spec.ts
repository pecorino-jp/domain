// tslint:disable:no-implicit-dependencies
/**
 * 入金取引サービステスト
 */
import * as mongoose from 'mongoose';
import * as assert from 'power-assert';
import * as sinon from 'sinon';

import * as pecorino from '../../index';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('入金取引を開始する', () => {
    beforeEach(() => {
        sandbox.restore();
    });

    it('リポジトリーが正常であれば開始できるはず', async () => {
        const account = {};
        const transaction = {
            typeOf: pecorino.factory.account.transactionType.Deposit,
            transactionNumber: 'transactionNumber',
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
        const actionRepo = new pecorino.repository.AccountAction(mongoose.connection);
        const transactionRepo = new pecorino.repository.AccountTransaction(mongoose.connection);
        sandbox.mock(accountRepo)
            .expects('findByAccountNumber')
            .once()
            .resolves(account);
        sandbox.mock(transactionRepo)
            .expects('start')
            .once()
            .resolves(transaction);
        sandbox.mock(accountRepo)
            .expects('startTransaction')
            .once()
            .resolves();
        sandbox.mock(actionRepo)
            .expects('startByIdentifier')
            .once()
            .resolves();

        const result = await pecorino.service.accountTransaction.deposit.start(<any>{
            transactionNumber: 'transactionNumber',
            project: {},
            agent: transaction.agent,
            object: transaction.object
        })({
            account: accountRepo,
            accountAction: actionRepo,
            accountTransaction: transactionRepo
        });
        assert.equal(typeof result, 'object');
        sandbox.verify();
    });

    it('開始時リポジトリーに問題があれば、そのままエラーとなるはず', async () => {
        const account = {};
        const transaction = {
            typeOf: pecorino.factory.account.transactionType.Deposit,
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
        const actionRepo = new pecorino.repository.AccountAction(mongoose.connection);
        const transactionRepo = new pecorino.repository.AccountTransaction(mongoose.connection);
        sandbox.mock(accountRepo)
            .expects('findByAccountNumber')
            .once()
            .resolves(account);
        sandbox.mock(transactionRepo)
            .expects('start')
            .once()
            .rejects(startError);
        sandbox.mock(accountRepo)
            .expects('startTransaction')
            .never();

        const result = await pecorino.service.accountTransaction.deposit.start(<any>{
            project: {},
            agent: transaction.agent,
            object: transaction.object
        })({
            account: accountRepo,
            accountAction: actionRepo,
            accountTransaction: transactionRepo
        })
            .catch((err) => err);
        assert.deepEqual(result, startError);
        sandbox.verify();
    });
});
