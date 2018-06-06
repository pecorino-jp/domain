// tslint:disable:no-implicit-dependencies
/**
 * 転送取引サービステスト
 * @ignore
 */
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
            object: {},
            expires: new Date(),
            status: pecorino.factory.transactionStatusType.Confirmed,
            startDate: new Date()
        };
        const accountRepo = new pecorino.repository.Account(pecorino.mongoose.connection);
        const transactionRepo = new pecorino.repository.Transaction(pecorino.mongoose.connection);
        sandbox.mock(accountRepo).expects('findByAccountNumber').twice()
            .onFirstCall().resolves(account)
            .onSecondCall().resolves(account);
        sandbox.mock(transactionRepo).expects('start').once().resolves(transaction);
        sandbox.mock(accountRepo).expects('authorizeAmount').once().resolves();
        sandbox.mock(accountRepo).expects('startTransaction').once().resolves();

        const result = await pecorino.service.transaction.transfer.start(<any>{
            agent: transaction.agent,
            object: transaction.object
        })({
            account: accountRepo,
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
            object: {},
            expires: new Date(),
            status: pecorino.factory.transactionStatusType.Confirmed,
            startDate: new Date()
        };
        const startError = new Error('startError');
        const accountRepo = new pecorino.repository.Account(pecorino.mongoose.connection);
        const transactionRepo = new pecorino.repository.Transaction(pecorino.mongoose.connection);
        sandbox.mock(accountRepo).expects('findByAccountNumber').twice()
            .onFirstCall().resolves(account)
            .onSecondCall().resolves(account);
        sandbox.mock(transactionRepo).expects('start').once().rejects(startError);
        sandbox.mock(accountRepo).expects('authorizeAmount').never();
        sandbox.mock(accountRepo).expects('startTransaction').never();

        const result = await pecorino.service.transaction.transfer.start(<any>{
            agent: transaction.agent,
            object: transaction.object
        })({
            account: accountRepo,
            transaction: transactionRepo
        }).catch((err) => err);
        assert.deepEqual(result, startError);
        sandbox.verify();
    });
});

describe('転送取引を確定する', () => {
    beforeEach(() => {
        sandbox.restore();
    });

    it('リポジトリーが正常であれば確定できるはず', async () => {
        const account = {};
        const transaction = {
            id: 'transactionId',
            typeOf: pecorino.factory.transactionType.Transfer,
            agent: {},
            recipient: {},
            object: {},
            expires: new Date(),
            status: pecorino.factory.transactionStatusType.Confirmed,
            result: {},
            startDate: new Date()
        };
        const transactionRepo = new pecorino.repository.Transaction(pecorino.mongoose.connection);
        sandbox.mock(transactionRepo).expects('findById').once().resolves(transaction);
        sandbox.mock(transactionRepo).expects('confirm').once().resolves(transaction);

        const result = await pecorino.service.transaction.transfer.confirm(<any>{
            transactionId: transaction.id
        })({
            transaction: transactionRepo
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
        const taskRepo = new pecorino.repository.Task(pecorino.mongoose.connection);
        const transactionRepo = new pecorino.repository.Transaction(pecorino.mongoose.connection);
        sandbox.mock(transactionRepo).expects('startExportTasks').once().resolves(transaction);
        sandbox.mock(transactionRepo).expects('findById').once().resolves(transaction);
        sandbox.mock(taskRepo).expects('save').atLeast(1).resolves(task);
        sandbox.mock(transactionRepo).expects('setTasksExportedById').once().resolves();

        const result = await pecorino.service.transaction.transfer.exportTasks(pecorino.factory.transactionStatusType.Canceled)({
            task: taskRepo,
            transaction: transactionRepo
        });
        assert.equal(result, undefined);
        sandbox.verify();
    });

    it('タスクエクスポート待ちの取引がなければ何もしないはず', async () => {
        const taskRepo = new pecorino.repository.Task(pecorino.mongoose.connection);
        const transactionRepo = new pecorino.repository.Transaction(pecorino.mongoose.connection);
        sandbox.mock(transactionRepo).expects('startExportTasks').once().resolves(null);
        sandbox.mock(transactionRepo).expects('findById').never();
        sandbox.mock(taskRepo).expects('save').never();
        sandbox.mock(transactionRepo).expects('setTasksExportedById').never();

        const result = await pecorino.service.transaction.transfer.exportTasks(pecorino.factory.transactionStatusType.Canceled)({
            task: taskRepo,
            transaction: transactionRepo
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
            id: 'transactionId',
            status: pecorino.factory.transactionStatusType.Confirmed,
            potentialActions: {
                moneyTransfer: {}
            }
        };
        const task = {};
        const taskRepo = new pecorino.repository.Task(pecorino.mongoose.connection);
        const transactionRepo = new pecorino.repository.Transaction(pecorino.mongoose.connection);
        sandbox.mock(transactionRepo).expects('findById').once().resolves(transaction);
        sandbox.mock(taskRepo).expects('save').atLeast(1).resolves(task);

        const result = await pecorino.service.transaction.transfer.exportTasksById(transaction.id)({
            task: taskRepo,
            transaction: transactionRepo
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
                id: 'transactionId',
                status: transactionStatus
            };
            const task = {};
            const taskRepo = new pecorino.repository.Task(pecorino.mongoose.connection);
            const transactionRepo = new pecorino.repository.Transaction(pecorino.mongoose.connection);
            sandbox.mock(transactionRepo).expects('findById').once().resolves(transaction);
            sandbox.mock(taskRepo).expects('save').atLeast(1).resolves(task);

            const result = await pecorino.service.transaction.transfer.exportTasksById(transaction.id)({
                task: taskRepo,
                transaction: transactionRepo
            });
            assert(Array.isArray(result));
            sandbox.verify();
        });
    });

    it('未対応ステータスの取引であればNotImplementedエラーとなるはず', async () => {
        const transaction = {
            id: 'transactionId',
            status: 'UnknownStatus'
        };
        const task = {};
        const taskRepo = new pecorino.repository.Task(pecorino.mongoose.connection);
        const transactionRepo = new pecorino.repository.Transaction(pecorino.mongoose.connection);
        sandbox.mock(transactionRepo).expects('findById').once().resolves(transaction);
        sandbox.mock(taskRepo).expects('save').never();

        const result = await pecorino.service.transaction.transfer.exportTasksById(transaction.id)({
            task: taskRepo,
            transaction: transactionRepo
        }).catch((err) => err);
        assert(result instanceof pecorino.factory.errors.NotImplemented);
        sandbox.verify();
    });
});
