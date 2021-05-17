// tslint:disable:no-implicit-dependencies
/**
 * アクションリポジトリーテスト
 */
import { } from 'mocha';
import * as mongoose from 'mongoose';
import * as assert from 'power-assert';
import * as sinon from 'sinon';
// tslint:disable-next-line:no-require-imports no-var-requires
require('sinon-mongoose');
import * as pecorino from '../index';

let sandbox: sinon.SinonSandbox;
let actionRepo: pecorino.repository.AccountAction;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('アクションを開始する', () => {
    beforeEach(() => {
        sandbox.restore();
        actionRepo = new pecorino.repository.AccountAction(mongoose.connection);
    });

    it('MongoDBが正常であれば開始できるはず', async () => {
        sandbox.mock(actionRepo.actionModel)
            .expects('create')
            .once()
            .resolves(new actionRepo.actionModel());

        const result = await actionRepo.start(<any>{});
        assert.equal(typeof result, 'object');
        sandbox.verify();
    });
});

describe('アクションを完了する', () => {
    beforeEach(() => {
        sandbox.restore();
        actionRepo = new pecorino.repository.AccountAction(mongoose.connection);
    });

    it('アクションが存在すれば完了できるはず', async () => {
        sandbox.mock(actionRepo.actionModel)
            .expects('findOneAndUpdate')
            .once()
            .chain('exec')
            .resolves(new actionRepo.actionModel());

        const result = await actionRepo.complete(pecorino.factory.actionType.MoneyTransfer, 'actionId', {});
        assert.equal(typeof result, 'object');
        sandbox.verify();
    });

    it('存在しなければNotFoundエラーとなるはず', async () => {
        sandbox.mock(actionRepo.actionModel)
            .expects('findOneAndUpdate')
            .once()
            .chain('exec')
            // tslint:disable-next-line:no-null-keyword
            .resolves(null);

        const result = await actionRepo.complete(pecorino.factory.actionType.MoneyTransfer, 'actionId', {})
            .catch((err) => err);
        assert(result instanceof pecorino.factory.errors.NotFound);
        sandbox.verify();
    });
});

describe('アクションを中止する', () => {
    beforeEach(() => {
        sandbox.restore();
        actionRepo = new pecorino.repository.AccountAction(mongoose.connection);
    });

    it('アクションが存在すれば中止できるはず', async () => {
        sandbox.mock(actionRepo.actionModel)
            .expects('findOneAndUpdate')
            .once()
            .chain('exec')
            .resolves(new actionRepo.actionModel());

        const result = await actionRepo.cancel(pecorino.factory.actionType.MoneyTransfer, 'actionId');
        assert.equal(typeof result, 'object');
        sandbox.verify();
    });

    it('存在しなければNotFoundエラーとなるはず', async () => {
        sandbox.mock(actionRepo.actionModel)
            .expects('findOneAndUpdate')
            .once()
            .chain('exec')
            // tslint:disable-next-line:no-null-keyword
            .resolves(null);

        const result = await actionRepo.cancel(pecorino.factory.actionType.MoneyTransfer, 'actionId')
            .catch((err) => err);
        assert(result instanceof pecorino.factory.errors.NotFound);
        sandbox.verify();
    });
});

describe('アクションを断念する', () => {
    beforeEach(() => {
        sandbox.restore();
        actionRepo = new pecorino.repository.AccountAction(mongoose.connection);
    });

    it('アクションが存在すれば断念できるはず', async () => {
        sandbox.mock(actionRepo.actionModel)
            .expects('findOneAndUpdate')
            .once()
            .chain('exec')
            .resolves(new actionRepo.actionModel());

        const result = await actionRepo.giveUp(pecorino.factory.actionType.MoneyTransfer, 'actionId', {});
        assert.equal(typeof result, 'object');
        sandbox.verify();
    });

    it('存在しなければNotFoundエラーとなるはず', async () => {
        sandbox.mock(actionRepo.actionModel)
            .expects('findOneAndUpdate')
            .once()
            .chain('exec')
            // tslint:disable-next-line:no-null-keyword
            .resolves(null);

        const result = await actionRepo.giveUp(pecorino.factory.actionType.MoneyTransfer, 'actionId', {})
            .catch((err) => err);
        assert(result instanceof pecorino.factory.errors.NotFound);
        sandbox.verify();
    });
});
describe('IDでアクションを検索する', () => {
    beforeEach(() => {
        sandbox.restore();
        actionRepo = new pecorino.repository.AccountAction(mongoose.connection);
    });

    it('アクションが存在すればオブジェクトを取得できるはず', async () => {
        sandbox.mock(actionRepo.actionModel)
            .expects('findOne')
            .once()
            .chain('exec')
            .resolves(new actionRepo.actionModel());

        const result = await actionRepo.findById(pecorino.factory.actionType.MoneyTransfer, 'actionId');
        assert.equal(typeof result, 'object');
        sandbox.verify();
    });

    it('存在しなければNotFoundエラーとなるはず', async () => {
        sandbox.mock(actionRepo.actionModel)
            .expects('findOne')
            .once()
            .chain('exec')
            // tslint:disable-next-line:no-null-keyword
            .resolves(null);

        const result = await actionRepo.findById(pecorino.factory.actionType.MoneyTransfer, 'actionId')
            .catch((err) => err);
        assert(result instanceof pecorino.factory.errors.NotFound);
        sandbox.verify();
    });
});
describe('転送アクションをカウント', () => {
    beforeEach(() => {
        sandbox.restore();
        actionRepo = new pecorino.repository.AccountAction(mongoose.connection);
    });
    it('MongoDBが正常であれば数字を取得できるはず', async () => {
        const searchConditions = {
            project: { id: { $eq: 'eq', $ne: 'ne' } },
            accountType: 'accountType',
            accountNumber: 'accountNumber',
            limit: 1,
            page: 1,
            sort: {
                startDate: pecorino.factory.sortType.Ascending
            }
        };
        sandbox.mock(actionRepo.actionModel)
            .expects('countDocuments')
            .once()
            .chain('exec')
            .resolves(1);
        const result = await actionRepo.countTransferActions(searchConditions);
        assert(Number.isInteger(result));
        sandbox.verify();
    });
});
describe('転送アクションを検索する', () => {
    beforeEach(() => {
        sandbox.restore();
        actionRepo = new pecorino.repository.AccountAction(mongoose.connection);
    });
    it('MongoDBが正常であれば配列を取得できるはず', async () => {
        const searchConditions = {
            project: { id: { $eq: 'eq', $ne: 'ne' } },
            accountNumber: 'accountNumber',
            actionStatus: { $in: [] },
            amount: { currency: { $eq: 'JPY' } },
            location: {
                accountNumber: { $eq: 'accountNumber' },
                typeOf: { $eq: 'typeOf' }
            },
            limit: 1,
            page: 1,
            sort: {
                startDate: pecorino.factory.sortType.Ascending
            },
            purpose: {
                typeOf: { $eq: 'typeOf' },
                id: { $eq: 'id' }
            },
            startDate: {
                $gte: new Date(),
                $lte: new Date()
            }
        };
        sandbox.mock(actionRepo.actionModel)
            .expects('find')
            .once()
            .chain('exec')
            .resolves([new actionRepo.actionModel()]);
        const result = await actionRepo.searchTransferActions(searchConditions);
        assert(Array.isArray(result));
        sandbox.verify();
    });
});
describe('アクションを検索する', () => {
    beforeEach(() => {
        sandbox.restore();
        actionRepo = new pecorino.repository.AccountAction(mongoose.connection);
    });

    it('MongoDBが正常であれば配列を取得できるはず', async () => {
        const searchConditions = {
            typeOf: pecorino.factory.actionType.MoneyTransfer,
            actionStatuses: [pecorino.factory.accountStatusType.Closed],
            startDateFrom: new Date(),
            startDateThrough: new Date(),
            purposeTypeOfs: [pecorino.factory.account.transactionType.Deposit],
            fromLocationAccountNumbers: ['accountNumber'],
            toLocationAccountNumbers: ['accountNumber'],
            limit: 1
        };
        sandbox.mock(actionRepo.actionModel)
            .expects('find')
            .once()
            .chain('limit')
            .chain('exec')
            .resolves([new actionRepo.actionModel()]);

        const result = await actionRepo.search(searchConditions);
        assert(Array.isArray(result));
        sandbox.verify();
    });
});
