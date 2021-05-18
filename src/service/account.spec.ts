// tslint:disable:no-implicit-dependencies
/**
 * 口座サービステスト
 */
// import * as chevre from '@chevre/api-nodejs-client';
import * as mongoose from 'mongoose';
import * as assert from 'power-assert';
import * as sinon from 'sinon';
import * as pecorino from '../index';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('口座を開設する', () => {
    beforeEach(() => {
        sandbox.restore();
    });

    it('リポジトリーが正常であれば開設できるはず', async () => {
        const accountRepo = new pecorino.repository.Account(mongoose.connection);
        sandbox.mock(accountRepo)
            .expects('open')
            .once()
            .resolves({});

        const result = await pecorino.service.account.open(<any[]>[{ project: {} }])({
            account: accountRepo
        });
        assert.equal(typeof result, 'object');
        sandbox.verify();
    });
});

describe('口座を解約する', () => {
    beforeEach(() => {
        sandbox.restore();
    });

    it('リポジトリーが正常であれば解約できるはず', async () => {
        const accountRepo = new pecorino.repository.Account(mongoose.connection);
        sandbox.mock(accountRepo)
            .expects('close')
            .once()
            .resolves({});

        const result = await pecorino.service.account.close(<any>{})({
            account: accountRepo
        });
        assert.equal(result, undefined);
        sandbox.verify();
    });
});

describe('金額を転送する', () => {
    beforeEach(() => {
        sandbox.restore();
    });

    it('転送元が口座であれば転送できるはず', async () => {
        const actionAttributes = {
            project: { id: 'xxx' },
            typeOf: pecorino.factory.actionType.MoneyTransfer,
            purpose: {},
            amount: 1234,
            fromLocation: {
                typeOf: 'Account',
                accountNumber: 'accountNumber'
            },
            toLocation: {
                typeOf: 'Account',
                accountNumber: 'accountNumber'
            }
        };
        const actionRepo = new pecorino.repository.AccountAction(mongoose.connection);
        const accountRepo = new pecorino.repository.Account(mongoose.connection);

        sandbox.mock(accountRepo)
            .expects('settleTransaction')
            .once()
            .resolves();
        sandbox.mock(actionRepo)
            .expects('startByIdentifier')
            .once()
            .resolves(actionAttributes);
        sandbox.mock(actionRepo)
            .expects('complete')
            .once()
            .resolves({});

        const result = await pecorino.service.account.transferMoney(<any>actionAttributes)({
            accountAction: actionRepo,
            account: accountRepo
        });
        assert.equal(result, undefined);
        sandbox.verify();
    });

    it('転送先が口座であれば転送できるはず', async () => {
        const actionAttributes = {
            project: { id: 'xxx' },
            typeOf: pecorino.factory.actionType.MoneyTransfer,
            purpose: {},
            amount: 1234,
            fromLocation: {},
            toLocation: {
                typeOf: 'Account',
                accountNumber: 'accountNumber'
            }
        };
        const actionRepo = new pecorino.repository.AccountAction(mongoose.connection);
        const accountRepo = new pecorino.repository.Account(mongoose.connection);

        sandbox.mock(accountRepo)
            .expects('settleTransaction')
            .once()
            .resolves();
        sandbox.mock(actionRepo)
            .expects('startByIdentifier')
            .once()
            .resolves(actionAttributes);
        sandbox.mock(actionRepo)
            .expects('complete')
            .once()
            .resolves({});

        const result = await pecorino.service.account.transferMoney(<any>actionAttributes)({
            accountAction: actionRepo,
            account: accountRepo
        });
        assert.equal(result, undefined);
        sandbox.verify();
    });

    it('転送処理実行時にリポジトリーに問題があれば、アクションを断念してそのままエラーとなるはず', async () => {
        const actionAttributes = {
            project: { id: 'xxx' },
            typeOf: pecorino.factory.actionType.MoneyTransfer,
            purpose: {},
            amount: 1234,
            fromLocation: {
                typeOf: 'Account',
                accountNumber: 'accountNumber'
            },
            toLocation: {
                typeOf: 'Account',
                accountNumber: 'accountNumber'
            }
        };
        const settleError = new Error('settleError');
        const actionRepo = new pecorino.repository.AccountAction(mongoose.connection);
        const accountRepo = new pecorino.repository.Account(mongoose.connection);

        sandbox.mock(actionRepo)
            .expects('startByIdentifier')
            .once()
            .resolves(actionAttributes);
        sandbox.mock(accountRepo)
            .expects('settleTransaction')
            .once()
            .rejects(settleError);
        sandbox.mock(actionRepo)
            .expects('giveUp')
            .once()
            .resolves({});
        sandbox.mock(actionRepo)
            .expects('complete')
            .never();

        const result = await pecorino.service.account.transferMoney(<any>actionAttributes)({
            accountAction: actionRepo,
            account: accountRepo
        })
            .catch((err) => err);
        assert.deepEqual(result, settleError);
        sandbox.verify();
    });
});

describe('金額転送を中止する', () => {
    beforeEach(() => {
        sandbox.restore();
    });

    // tslint:disable-next-line:mocha-no-side-effect-code
    [
        pecorino.factory.account.transactionType.Deposit,
        pecorino.factory.account.transactionType.Transfer,
        pecorino.factory.account.transactionType.Withdraw
    ].map((transactionType) => {
        it(`リポジトリーが正常であれば、${transactionType}取引の転送処理を中止できるはず`, async () => {
            const actionAttributes = {
                project: { id: 'xxx' },
                transaction: {
                    typeOf: transactionType,
                    id: 'transactionId'
                }
            };
            const transaction = {
                object: {
                    fromLocation: {},
                    toLocation: {}
                }
            };
            const accountRepo = new pecorino.repository.Account(mongoose.connection);
            const actionRepo = new pecorino.repository.AccountAction(mongoose.connection);
            const transactionRepo = new pecorino.repository.AccountTransaction(mongoose.connection);
            sandbox.mock(transactionRepo)
                .expects('findById')
                .once()
                .resolves(transaction);
            sandbox.mock(accountRepo)
                .expects('voidTransaction')
                .once()
                .resolves();
            sandbox.mock(actionRepo)
                .expects('searchTransferActions')
                .once()
                .resolves([{}]);
            sandbox.mock(actionRepo)
                .expects('cancel')
                .once()
                .resolves([{}]);

            const result = await pecorino.service.account.cancelMoneyTransfer(actionAttributes)({
                account: accountRepo,
                accountAction: actionRepo,
                accountTransaction: transactionRepo
            });
            assert.equal(result, undefined);
            sandbox.verify();
        });
    });

    it('非対応タイプの取引であればArgumentエラーとなるはず', async () => {
        const actionAttributes = {
            project: { id: 'xxx' },
            transaction: {
                typeOf: <any>'UnknownType',
                id: 'transactionId'
            }
        };
        const transaction = {
            object: {
                fromLocation: {},
                toLocation: {}
            }
        };
        const accountRepo = new pecorino.repository.Account(mongoose.connection);
        const actionRepo = new pecorino.repository.AccountAction(mongoose.connection);
        const transactionRepo = new pecorino.repository.AccountTransaction(mongoose.connection);
        sandbox.mock(transactionRepo)
            .expects('findById')
            .once()
            .resolves(transaction);
        sandbox.mock(accountRepo)
            .expects('voidTransaction')
            .never();

        const result = await pecorino.service.account.cancelMoneyTransfer(actionAttributes)({
            account: accountRepo,
            accountAction: actionRepo,
            accountTransaction: transactionRepo
        })
            .catch((err) => err);
        assert(result instanceof pecorino.factory.errors.Argument);
        sandbox.verify();
    });
});
