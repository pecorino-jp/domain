// tslint:disable:no-implicit-dependencies
/**
 * 口座リポジトリーテスト
 */
import { } from 'mocha';
import * as mongoose from 'mongoose';
import * as assert from 'power-assert';
import * as sinon from 'sinon';
// tslint:disable-next-line:no-require-imports no-var-requires
require('sinon-mongoose');
import * as pecorino from '../index';

let sandbox: sinon.SinonSandbox;
let accountRepo: pecorino.repository.Account;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('口座開設', () => {
    beforeEach(() => {
        sandbox.restore();
        accountRepo = new pecorino.repository.Account(mongoose.connection);
    });

    it('MongoDBが正常であれば開設できるはず', async () => {
        sandbox.mock(accountRepo.accountModel)
            .expects('insertMany')
            .once()
            .resolves({ insertedCount: 1, ops: [] });

        const result = await accountRepo.open(<any[]>[{ project: {} }]);
        assert.equal(typeof result, 'object');
        sandbox.verify();
    });
});

describe('口座解約', () => {
    beforeEach(() => {
        sandbox.restore();
        accountRepo = new pecorino.repository.Account(mongoose.connection);
    });

    it('開設状態の口座があれば解約できるはず', async () => {
        sandbox.mock(accountRepo.accountModel)
            .expects('findOneAndUpdate')
            .once()
            .chain('exec')
            .resolves(new accountRepo.accountModel());

        const result = await accountRepo.close(<any>{});
        assert.equal(result, undefined);
        sandbox.verify();
    });

    it('すでに解約済であれば成功するはず', async () => {
        const account = {
            status: pecorino.factory.accountStatusType.Closed,
            pendingTransactions: [{}]
        };
        sandbox.mock(accountRepo.accountModel)
            .expects('findOneAndUpdate')
            .once()
            .chain('exec')
            // tslint:disable-next-line:no-null-keyword
            .resolves(null);
        sandbox.mock(accountRepo)
            .expects('findByAccountNumber')
            .once()
            .resolves(account);

        const result = await accountRepo.close(<any>{});
        assert.equal(result, undefined);
        sandbox.verify();
    });

    it('進行中取引が存在する場合Argumentエラーとなるはず', async () => {
        const account = {
            status: pecorino.factory.accountStatusType.Opened,
            pendingTransactions: [{}]
        };
        sandbox.mock(accountRepo.accountModel)
            .expects('findOneAndUpdate')
            .once()
            .chain('exec')
            // tslint:disable-next-line:no-null-keyword
            .resolves(null);
        sandbox.mock(accountRepo)
            .expects('findByAccountNumber')
            .once()
            .resolves(account);

        const result = await accountRepo.close(<any>{})
            .catch((err) => err);
        assert(result instanceof pecorino.factory.errors.Argument);
        sandbox.verify();
    });

    it('解約トライ時には存在しなかったが、状態確認で存在した場合NotFoundエラーとなるはず', async () => {
        const account = {
            status: pecorino.factory.accountStatusType.Opened,
            pendingTransactions: []
        };
        sandbox.mock(accountRepo.accountModel)
            .expects('findOneAndUpdate')
            .once()
            .chain('exec')
            // tslint:disable-next-line:no-null-keyword
            .resolves(null);
        sandbox.mock(accountRepo)
            .expects('findByAccountNumber')
            .once()
            .resolves(account);

        const result = await accountRepo.close(<any>{})
            .catch((err) => err);
        assert(result instanceof pecorino.factory.errors.NotFound);
        sandbox.verify();
    });
});

describe('口座番号で検索', () => {
    beforeEach(() => {
        sandbox.restore();
        accountRepo = new pecorino.repository.Account(mongoose.connection);
    });

    it('口座が存在すればオブジェクトを取得できるはず', async () => {
        sandbox.mock(accountRepo.accountModel)
            .expects('findOne')
            .once()
            .chain('exec')
            .resolves(new accountRepo.accountModel());

        const result = await accountRepo.findByAccountNumber({
            accountNumber: 'accountNumber'
        });
        assert.equal(typeof result, 'object');
        sandbox.verify();
    });

    it('存在しなければNotFoundエラーとなるはず', async () => {
        sandbox.mock(accountRepo.accountModel)
            .expects('findOne')
            .once()
            .chain('exec')
            // tslint:disable-next-line:no-null-keyword
            .resolves(null);

        const result = await accountRepo.findByAccountNumber({
            accountNumber: 'accountNumber'
        })
            .catch((err) => err);
        assert(result instanceof pecorino.factory.errors.NotFound);
        sandbox.verify();
    });
});

describe('口座の金額を確保する', () => {
    beforeEach(() => {
        sandbox.restore();
        accountRepo = new pecorino.repository.Account(mongoose.connection);
    });

    it('残高が足りていれば確保できるはず', async () => {
        sandbox.mock(accountRepo.accountModel)
            .expects('findOneAndUpdate')
            .once()
            .chain('exec')
            .resolves(new accountRepo.accountModel());

        const result = await accountRepo.authorizeAmount(<any>{});
        assert.equal(result, undefined);
        sandbox.verify();
    });

    it('すでに解約済であればArgumentエラーとなるはず', async () => {
        const account = {
            status: pecorino.factory.accountStatusType.Closed,
            pendingTransactions: []
        };
        sandbox.mock(accountRepo.accountModel)
            .expects('findOneAndUpdate')
            .once()
            .chain('exec')
            // tslint:disable-next-line:no-null-keyword
            .resolves(null);
        sandbox.mock(accountRepo)
            .expects('findByAccountNumber')
            .once()
            .resolves(account);

        const result = await accountRepo.authorizeAmount(<any>{})
            .catch((err) => err);
        assert(result instanceof pecorino.factory.errors.Argument);
        sandbox.verify();
    });

    it('残高不足であればArgumentエラーとなるはず', async () => {
        const account = {
            status: pecorino.factory.accountStatusType.Opened,
            availableBalance: 1233,
            pendingTransactions: []
        };
        sandbox.mock(accountRepo.accountModel)
            .expects('findOneAndUpdate')
            .once()
            .chain('exec')
            // tslint:disable-next-line:no-null-keyword
            .resolves(null);
        sandbox.mock(accountRepo)
            .expects('findByAccountNumber')
            .once()
            .resolves(account);

        const result = await accountRepo.authorizeAmount(<any>{ amount: 1234 })
            .catch((err) => err);
        assert(result instanceof pecorino.factory.errors.Argument);
        sandbox.verify();
    });

    it('金額確保トライ時は存在しなかったが、状態確認で存在した場合NotFoundエラーとなるはず', async () => {
        const account = {
            status: pecorino.factory.accountStatusType.Opened,
            availableBalance: 1234,
            pendingTransactions: []
        };
        sandbox.mock(accountRepo.accountModel)
            .expects('findOneAndUpdate')
            .once()
            .chain('exec')
            // tslint:disable-next-line:no-null-keyword
            .resolves(null);
        sandbox.mock(accountRepo)
            .expects('findByAccountNumber')
            .once()
            .resolves(account);

        const result = await accountRepo.authorizeAmount(<any>{ amount: 1234 })
            .catch((err) => err);
        assert(result instanceof pecorino.factory.errors.NotFound);
        sandbox.verify();
    });
});

describe('口座内で取引を開始する', () => {
    beforeEach(() => {
        sandbox.restore();
        accountRepo = new pecorino.repository.Account(mongoose.connection);
    });

    it('口座が存在すれば取引を開始できるはず', async () => {
        sandbox.mock(accountRepo.accountModel)
            .expects('findOneAndUpdate')
            .once()
            .chain('exec')
            .resolves(new accountRepo.accountModel());

        const result = await accountRepo.startTransaction(<any>{});
        assert.equal(result, undefined);
        sandbox.verify();
    });

    it('すでに解約済であればArgumentエラーとなるはず', async () => {
        const account = {
            status: pecorino.factory.accountStatusType.Closed,
            availableBalance: 1234,
            pendingTransactions: []
        };
        sandbox.mock(accountRepo.accountModel)
            .expects('findOneAndUpdate')
            .once()
            .chain('exec')
            // tslint:disable-next-line:no-null-keyword
            .resolves(null);
        sandbox.mock(accountRepo)
            .expects('findByAccountNumber')
            .once()
            .resolves(account);

        const result = await accountRepo.startTransaction(<any>{})
            .catch((err) => err);
        assert(result instanceof pecorino.factory.errors.Argument);
        sandbox.verify();
    });

    it('取引開始時には存在しなかったが、状態確認で存在した場合NotFoundエラーとなるはず', async () => {
        const account = {
            status: pecorino.factory.accountStatusType.Opened,
            availableBalance: 1234,
            pendingTransactions: []
        };
        sandbox.mock(accountRepo.accountModel)
            .expects('findOneAndUpdate')
            .once()
            .chain('exec')
            // tslint:disable-next-line:no-null-keyword
            .resolves(null);
        sandbox.mock(accountRepo)
            .expects('findByAccountNumber')
            .once()
            .resolves(account);

        const result = await accountRepo.startTransaction(<any>{})
            .catch((err) => err);
        assert(result instanceof pecorino.factory.errors.NotFound);
        sandbox.verify();
    });
});

describe('口座に保留中の取引を実行する', () => {
    beforeEach(() => {
        sandbox.restore();
        accountRepo = new pecorino.repository.Account(mongoose.connection);
    });

    it('転送元口座が存在すれば取引を実行できるはず', async () => {
        sandbox.mock(accountRepo.accountModel)
            .expects('findOneAndUpdate')
            .once()
            .chain('exec')
            .resolves(new accountRepo.accountModel());

        const result = await accountRepo.settleTransaction({
            fromAccountNumber: 'fromAccountNumber',
            // toAccountNumber: 'toAccountNumber',
            amount: 1234,
            transactionId: 'transactionId'
        });
        assert.equal(result, undefined);
        sandbox.verify();
    });

    it('転送先口座が存在すれば取引を実行できるはず', async () => {
        sandbox.mock(accountRepo.accountModel)
            .expects('findOneAndUpdate')
            .once()
            .chain('exec')
            .resolves(new accountRepo.accountModel());

        const result = await accountRepo.settleTransaction({
            // fromAccountNumber: 'fromAccountNumber',
            toAccountNumber: 'toAccountNumber',
            amount: 1234,
            transactionId: 'transactionId'
        });
        assert.equal(result, undefined);
        sandbox.verify();
    });
});

describe('口座に保留中の取引を中止する', () => {
    beforeEach(() => {
        sandbox.restore();
        accountRepo = new pecorino.repository.Account(mongoose.connection);
    });

    it('転送元口座が存在すれば取引を中止できるはず', async () => {
        sandbox.mock(accountRepo.accountModel)
            .expects('findOneAndUpdate')
            .once()
            .chain('exec')
            .resolves(new accountRepo.accountModel());

        const result = await accountRepo.voidTransaction({
            fromAccountNumber: 'fromAccountNumber',
            // toAccountNumber: 'toAccountNumber',
            amount: 1234,
            transactionId: 'transactionId'
        });
        assert.equal(result, undefined);
        sandbox.verify();
    });

    it('転送先口座が存在すれば取引を中止できるはず', async () => {
        sandbox.mock(accountRepo.accountModel)
            .expects('findOneAndUpdate')
            .once()
            .chain('exec')
            .resolves(new accountRepo.accountModel());

        const result = await accountRepo.voidTransaction({
            toAccountNumber: 'toAccountNumber',
            amount: 1234,
            transactionId: 'transactionId'
        });
        assert.equal(result, undefined);
        sandbox.verify();
    });
});
describe('口座をカウント', () => {
    beforeEach(() => {
        sandbox.restore();
        accountRepo = new pecorino.repository.Account(mongoose.connection);
    });
    it('MongoDBが正常であれば数字を取得できるはず', async () => {
        const searchConditions = {
            accountType: 'accountType',
            accountNumbers: ['accountNumber'],
            limit: 1,
            page: 1,
            sort: {
                openDate: pecorino.factory.sortType.Ascending
            }
        };
        sandbox.mock(accountRepo.accountModel)
            .expects('countDocuments')
            .once()
            .chain('exec')
            .resolves(1);
        const result = await accountRepo.count(searchConditions);
        assert(Number.isInteger(result));
        sandbox.verify();
    });
});
describe('口座を検索する', () => {
    beforeEach(() => {
        sandbox.restore();
        accountRepo = new pecorino.repository.Account(mongoose.connection);
    });
    it('MongoDBが正常であれば配列を取得できるはず', async () => {
        const searchConditions = {
            project: { id: { $eq: 'eq', $ne: 'ne' } },
            typeof: { $eq: 'Account', $in: ['Account'] },
            accountType: 'accountType',
            accountNumbers: ['accountNumber'],
            accountNumber: {
                $eq: '',
                $in: [],
                $regex: ''
            },
            openDate: {
                $gte: new Date(),
                $lte: new Date()
            },
            statuses: [pecorino.factory.accountStatusType.Opened],
            name: { $regex: '' },
            limit: 1,
            page: 1,
            sort: {
                openDate: pecorino.factory.sortType.Ascending
            }
        };
        sandbox.mock(accountRepo.accountModel)
            .expects('find')
            .once()
            .chain('exec')
            .resolves([new accountRepo.accountModel()]);
        const result = await accountRepo.search(searchConditions);
        assert(Array.isArray(result));
        sandbox.verify();
    });
});
