/**
 * 口座サービス
 * 開設、閉鎖等、口座に対するアクションを定義します。
 */
import * as chevre from '@chevre/api-nodejs-client';
import * as factory from '../factory';

import { MongoRepository as AccountRepo } from '../repo/account';
import { MongoRepository as AccountActionRepo } from '../repo/accountAction';
import { MongoRepository as AccountTransactionRepo } from '../repo/accountTransaction';

import { credentials } from '../credentials';

const USE_SYNC_CHEVRE = process.env.USE_SYNC_CHEVRE === '1';

const chevreAuthClient = new chevre.auth.ClientCredentials({
    domain: credentials.chevre.authorizeServerDomain,
    clientId: credentials.chevre.clientId,
    clientSecret: credentials.chevre.clientSecret,
    scopes: [],
    state: ''
});

export type IOpenOperation<T> = (repos: {
    account: AccountRepo;
}) => Promise<T>;

/**
 * 口座を開設する
 */
export function open(params: {
    project: { typeOf: 'Project'; id: string };
    typeOf: string;
    /**
     * 口座タイプ
     */
    accountType: string;
    /**
     * 口座番号
     * ユニークになるように、Pecorinoサービス利用側で番号を生成すること
     */
    accountNumber: string;
    /**
     * 口座名義
     */
    name: string;
    /**
     * 初期金額
     */
    initialBalance: number;
}[]): IOpenOperation<factory.account.IAccount[]> {
    return async (repos: {
        account: AccountRepo;
    }) => {
        const openDate = new Date();

        const accounts = await repos.account.open(params.map((p) => {
            return {
                project: { typeOf: p.project.typeOf, id: p.project.id },
                typeOf: p.typeOf,
                name: p.name,
                accountType: p.accountType,
                accountNumber: p.accountNumber,
                initialBalance: p.initialBalance,
                openDate: openDate
            };
        }));

        // chevre連携
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore next */
        if (USE_SYNC_CHEVRE) {
            if (accounts.length > 0) {
                const accountService = new chevre.service.Account({
                    endpoint: credentials.chevre.endpoint,
                    auth: chevreAuthClient,
                    project: { id: accounts[0].project.id }
                });
                await Promise.all(accounts.map(async (account) => {
                    await accountService.syncAccount({
                        ...account,
                        ...{ id: String((<any>account)._id) }
                    });
                }));
            }
        }

        return accounts;
    };
}

/**
 * 口座を解約する
 */
export function close(params: {
    /**
     * 口座番号
     */
    accountNumber: string;
}) {
    return async (repos: {
        account: AccountRepo;
    }) => {
        await repos.account.close({
            accountNumber: params.accountNumber,
            closeDate: new Date()
        });

        // chevre連携
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore next */
        if (USE_SYNC_CHEVRE) {
            const account = await repos.account.findByAccountNumber({ accountNumber: params.accountNumber });
            const accountService = new chevre.service.Account({
                endpoint: credentials.chevre.endpoint,
                auth: chevreAuthClient,
                project: { id: account.project.id }
            });
            await accountService.syncAccount(account);
        }
    };
}

/**
 * 転送する
 * 確定取引結果から、実際の転送アクションを実行します。
 */
export function transferMoney(
    actionAttributes: factory.account.action.moneyTransfer.IAttributes
) {
    return async (repos: {
        accountAction: AccountActionRepo;
        account: AccountRepo;
    }) => {
        let action = await repos.accountAction.startByIdentifier<factory.actionType.MoneyTransfer>(actionAttributes);

        const accountService = new chevre.service.Account({
            endpoint: credentials.chevre.endpoint,
            auth: chevreAuthClient,
            project: { id: action.project.id }
        });

        // すでに完了していれば何もしない
        if (action.actionStatus === factory.actionStatusType.CompletedActionStatus) {
            // chevre連携
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore next */
            if (USE_SYNC_CHEVRE) {
                await accountService.syncAccountAction(action);
            }

            return;
        }

        let fromAccountNumber: string | undefined;
        let toAccountNumber: string | undefined;

        try {
            fromAccountNumber = (typeof (<any>action.fromLocation).accountNumber === 'string')
                ? (<factory.account.action.moneyTransfer.IAccount>action.fromLocation).accountNumber
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore next */
                : undefined;
            toAccountNumber = (typeof (<any>action.toLocation).accountNumber === 'string')
                ? (<factory.account.action.moneyTransfer.IAccount>action.toLocation).accountNumber
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore next */
                : undefined;

            await repos.account.settleTransaction({
                fromAccountNumber: fromAccountNumber,
                toAccountNumber: toAccountNumber,
                amount: (typeof action.amount === 'number') ? action.amount : Number(action.amount.value),
                transactionId: action.purpose.id
            });
        } catch (error) {
            // actionにエラー結果を追加
            try {
                const actionError = { ...error, message: error.message, name: error.name };
                await repos.accountAction.giveUp(action.typeOf, action.id, actionError);
            } catch (__) {
                // 失敗したら仕方ない
            }

            throw error;
        }

        // アクション完了
        const actionResult: factory.account.action.moneyTransfer.IResult = {};
        action = await repos.accountAction.complete(action.typeOf, action.id, actionResult);

        // chevre連携
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore next */
        if (USE_SYNC_CHEVRE) {
            if (typeof fromAccountNumber === 'string') {
                const fromAccount = await repos.account.findByAccountNumber({ accountNumber: fromAccountNumber });
                await accountService.syncAccount(fromAccount);
            }
            if (typeof toAccountNumber === 'string') {
                const toAccount = await repos.account.findByAccountNumber({ accountNumber: toAccountNumber });
                await accountService.syncAccount(toAccount);
            }

            await accountService.syncAccountAction(action);
        }
    };
}

/**
 * 転送取消
 * 期限切れ、あるいは、中止された取引から、転送をアクションを取り消します。
 */
export function cancelMoneyTransfer(params: {
    transaction: {
        typeOf: factory.account.transactionType;
        id: string;
    };
}) {
    return async (repos: {
        account: AccountRepo;
        accountAction: AccountActionRepo;
        accountTransaction: AccountTransactionRepo;
    }) => {
        let fromAccountNumber: string | undefined;
        let toAccountNumber: string | undefined;

        // 取引存在確認
        const transaction = await repos.accountTransaction.findById(params.transaction.typeOf, params.transaction.id);

        switch (params.transaction.typeOf) {
            case factory.account.transactionType.Deposit:
                toAccountNumber =
                    (<factory.account.transaction.deposit.ITransaction>transaction).object.toLocation.accountNumber;
                break;

            case factory.account.transactionType.Withdraw:
                fromAccountNumber =
                    (<factory.account.transaction.withdraw.ITransaction>transaction).object.fromLocation.accountNumber;
                break;

            case factory.account.transactionType.Transfer:
                fromAccountNumber =
                    (<factory.account.transaction.transfer.ITransaction>transaction).object.fromLocation.accountNumber;
                toAccountNumber =
                    // tslint:disable-next-line:max-line-length
                    (<factory.account.transaction.ITransaction<factory.account.transactionType.Transfer>>transaction).object.toLocation.accountNumber;
                break;

            default:
                throw new factory.errors.Argument('typeOf', `transaction type ${params.transaction.typeOf} unknown`);
        }

        await repos.account.voidTransaction({
            fromAccountNumber: fromAccountNumber,
            toAccountNumber: toAccountNumber,
            amount: transaction.object.amount,
            transactionId: transaction.id
        });

        // アクション取得
        const actions = await repos.accountAction.searchTransferActions({
            purpose: {
                typeOf: { $eq: transaction.typeOf },
                id: { $eq: transaction.id }
            }
        });

        await Promise.all(actions.map(async (action) => {
            await repos.accountAction.cancel(action.typeOf, action.id);
        }));
    };
}
