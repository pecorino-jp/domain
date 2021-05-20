// tslint:disable:no-implicit-dependencies
/**
 * 取引サービステスト
 */
import * as mongoose from 'mongoose';
import * as assert from 'power-assert';
import * as sinon from 'sinon';

import * as pecorino from '../index';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('取引を確定する', () => {
    beforeEach(() => {
        sandbox.restore();
    });

    it('リポジトリーが正常であれば確定できるはず', async () => {
        const transaction = {
            id: 'transactionId',
            typeOf: pecorino.factory.account.transactionType.Deposit,
            agent: {},
            recipient: {},
            object: {
                fromLocation: {},
                toLocation: {}
            },
            expires: new Date(),
            status: pecorino.factory.transactionStatusType.Confirmed,
            result: {},
            startDate: new Date()
        };
        const transactionRepo = new pecorino.repository.AccountTransaction(mongoose.connection);
        sandbox.mock(transactionRepo)
            .expects('findById')
            .once()
            .resolves(transaction);
        sandbox.mock(transactionRepo)
            .expects('confirm')
            .once()
            .resolves(transaction);

        const result = await pecorino.service.accountTransaction.confirm({
            id: transaction.id,
            typeOf: transaction.typeOf
        })({
            accountTransaction: transactionRepo
        });
        assert.equal(result, undefined);
        sandbox.verify();
    });
});

describe('取引のタスクをエクスポートする', () => {
    beforeEach(() => {
        sandbox.restore();
    });

    it('リポジトリーが正常であればエクスポートできるはず', async () => {
        const transaction = {
            id: 'transactionId',
            status: pecorino.factory.transactionStatusType.Canceled
        };
        const task = {};
        const taskRepo = new pecorino.repository.Task(mongoose.connection);
        const transactionRepo = new pecorino.repository.AccountTransaction(mongoose.connection);
        sandbox.mock(transactionRepo)
            .expects('startExportTasks')
            .once()
            .resolves(transaction);
        sandbox.mock(transactionRepo)
            .expects('findById')
            .once()
            .resolves(transaction);
        sandbox.mock(taskRepo)
            .expects('save')
            .atLeast(1)
            .resolves(task);
        sandbox.mock(transactionRepo)
            .expects('setTasksExportedById')
            .once()
            .resolves();

        const result = await pecorino.service.accountTransaction.exportTasks({
            status: pecorino.factory.transactionStatusType.Canceled,
            typeOf: pecorino.factory.account.transactionType.Deposit
        })({
            task: taskRepo,
            accountTransaction: transactionRepo
        });
        assert.equal(result, undefined);
        sandbox.verify();
    });

    it('タスクエクスポート待ちの取引がなければ何もしないはず', async () => {
        const taskRepo = new pecorino.repository.Task(mongoose.connection);
        const transactionRepo = new pecorino.repository.AccountTransaction(mongoose.connection);
        sandbox.mock(transactionRepo)
            .expects('startExportTasks')
            .once()
            // tslint:disable-next-line:no-null-keyword
            .resolves(null);
        sandbox.mock(transactionRepo)
            .expects('findById')
            .never();
        sandbox.mock(taskRepo)
            .expects('save')
            .never();
        sandbox.mock(transactionRepo)
            .expects('setTasksExportedById')
            .never();

        const result = await pecorino.service.accountTransaction.exportTasks({
            status: pecorino.factory.transactionStatusType.Canceled,
            typeOf: pecorino.factory.account.transactionType.Deposit
        })({
            task: taskRepo,
            accountTransaction: transactionRepo
        });
        assert.equal(result, undefined);
        sandbox.verify();
    });
});

describe('ID指定で取引のタスクをエクスポートする', () => {
    beforeEach(() => {
        sandbox.restore();
    });

    it('確定済取引のタスクをエクスポートできるはず', async () => {
        const transaction = {
            typeOf: pecorino.factory.account.transactionType.Deposit,
            id: 'transactionId',
            status: pecorino.factory.transactionStatusType.Confirmed,
            potentialActions: {
                moneyTransfer: {}
            }
        };
        const task = {};
        const taskRepo = new pecorino.repository.Task(mongoose.connection);
        const transactionRepo = new pecorino.repository.AccountTransaction(mongoose.connection);
        sandbox.mock(transactionRepo)
            .expects('findById')
            .once()
            .resolves(transaction);
        sandbox.mock(taskRepo)
            .expects('save')
            .atLeast(1)
            .resolves(task);

        const result = await pecorino.service.accountTransaction.exportTasksById(transaction)({
            task: taskRepo,
            accountTransaction: transactionRepo
        });
        assert(Array.isArray(result));
        sandbox.verify();
    });

    // tslint:disable-next-line:mocha-no-side-effect-code
    [
        pecorino.factory.transactionStatusType.Canceled,
        pecorino.factory.transactionStatusType.Expired
    ].map((transactionStatus) => {
        it(`${transactionStatus}取引のタスクをエクスポートできるはず`, async () => {
            const transaction = {
                typeOf: pecorino.factory.account.transactionType.Deposit,
                id: 'transactionId',
                status: transactionStatus
            };
            const task = {};
            const taskRepo = new pecorino.repository.Task(mongoose.connection);
            const transactionRepo = new pecorino.repository.AccountTransaction(mongoose.connection);
            sandbox.mock(transactionRepo)
                .expects('findById')
                .once()
                .resolves(transaction);
            sandbox.mock(taskRepo)
                .expects('save')
                .atLeast(1)
                .resolves(task);

            const result = await pecorino.service.accountTransaction.exportTasksById(transaction)({
                task: taskRepo,
                accountTransaction: transactionRepo
            });
            assert(Array.isArray(result));
            sandbox.verify();
        });
    });

    it('非対応ステータスの取引であればNotImplementedエラーとなるはず', async () => {
        const transaction = {
            typeOf: pecorino.factory.account.transactionType.Deposit,
            id: 'transactionId',
            status: 'UnknownStatus'
        };
        const taskRepo = new pecorino.repository.Task(mongoose.connection);
        const transactionRepo = new pecorino.repository.AccountTransaction(mongoose.connection);
        sandbox.mock(transactionRepo)
            .expects('findById')
            .once()
            .resolves(transaction);
        sandbox.mock(taskRepo)
            .expects('save')
            .never();

        const result = await pecorino.service.accountTransaction.exportTasksById(transaction)({
            task: taskRepo,
            accountTransaction: transactionRepo
        })
            .catch((err) => err);
        assert(result instanceof pecorino.factory.errors.NotImplemented);
        sandbox.verify();
    });
});
