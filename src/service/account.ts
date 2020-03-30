/**
 * 口座サービス
 * 開設、閉鎖等、口座に対するアクションを定義します。
 */
import * as createDebug from 'debug';

import * as factory from '../factory';

import { MongoRepository as AccountRepo } from '../repo/account';
import { MongoRepository as ActionRepo } from '../repo/action';
import { MongoRepository as TransactionRepo } from '../repo/transaction';

const debug = createDebug('pecorino-domain:service');

export type IOpenOperation<T> = (repos: {
    account: AccountRepo;
}) => Promise<T>;

/**
 * 口座を開設する
 */
export function open<T extends factory.account.AccountType>(params: {
    project: { typeOf: 'Project'; id: string };
    /**
     * 口座タイプ
     */
    accountType: T;
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
}): IOpenOperation<factory.account.IAccount> {
    return async (repos: {
        account: AccountRepo;
    }) => {
        return repos.account.open({
            project: { typeOf: params.project.typeOf, id: params.project.id },
            name: params.name,
            accountType: params.accountType,
            accountNumber: params.accountNumber,
            initialBalance: params.initialBalance,
            openDate: new Date()
        });
    };
}

/**
 * 口座を解約する
 */
export function close<T extends factory.account.AccountType>(params: {
    /**
     * 口座タイプ
     */
    accountType: T;
    /**
     * 口座番号
     */
    accountNumber: string;
}) {
    return async (repos: {
        account: AccountRepo;
    }) => {
        await repos.account.close({
            accountType: params.accountType,
            accountNumber: params.accountNumber,
            closeDate: new Date()
        });
    };
}

/**
 * 転送する
 * 確定取引結果から、実際の転送アクションを実行します。
 */
export function transferMoney(
    actionAttributes: factory.action.transfer.moneyTransfer.IAttributes
) {
    return async (repos: {
        action: ActionRepo;
        account: AccountRepo;
    }) => {
        debug(`transfering money... ${actionAttributes.purpose.typeOf} ${actionAttributes.purpose.id}`);

        // アクション取得
        let actions: factory.action.transfer.moneyTransfer.IAction[];
        actions = await repos.action.searchTransferActions({
            purpose: {
                typeOf: { $eq: actionAttributes.purpose.typeOf },
                id: { $eq: actionAttributes.purpose.id }
            }
        });

        // 互換性維持のため
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore if */
        if (actions.length === 0) {
            // アクション開始
            actions = [await repos.action.start<factory.actionType.MoneyTransfer>(actionAttributes)];
        }

        await Promise.all(actions.map(async (action) => {
            try {
                let accountType: string;
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore else */
                if (action.fromLocation.typeOf === factory.account.TypeOf.Account) {
                    accountType = (<factory.action.transfer.moneyTransfer.IAccount>action.fromLocation).accountType;
                } else if (action.toLocation.typeOf === factory.account.TypeOf.Account) {
                    accountType = (<factory.action.transfer.moneyTransfer.IAccount>action.toLocation).accountType;
                } else {
                    throw new factory.errors.NotImplemented('No Account Location');
                }

                const fromAccountNumber = (action.fromLocation.typeOf === factory.account.TypeOf.Account)
                    ? (<factory.action.transfer.moneyTransfer.IAccount>action.fromLocation).accountNumber
                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore next */
                    : undefined;
                const toAccountNumber = (action.toLocation.typeOf === factory.account.TypeOf.Account)
                    ? (<factory.action.transfer.moneyTransfer.IAccount>action.toLocation).accountNumber
                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore next */
                    : undefined;

                await repos.account.settleTransaction({
                    accountType: accountType,
                    fromAccountNumber: fromAccountNumber,
                    toAccountNumber: toAccountNumber,
                    amount: action.amount,
                    transactionId: action.purpose.id
                });
            } catch (error) {
                // actionにエラー結果を追加
                try {
                    const actionError = { ...error, message: error.message, name: error.name };
                    debug('actionError:', actionError);
                    // 一時的に保留
                    // await repos.action.giveUp(action.typeOf, action.id, actionError);
                } catch (__) {
                    // 失敗したら仕方ない
                }

                throw error;
            }

            // アクション完了
            debug('ending action...');
            const actionResult: factory.action.transfer.moneyTransfer.IResult = {};
            await repos.action.complete(action.typeOf, action.id, actionResult);
        }));
    };
}

/**
 * 転送取消
 * 期限切れ、あるいは、中止された取引から、転送をアクションを取り消します。
 */
export function cancelMoneyTransfer(params: {
    transaction: {
        typeOf: factory.transactionType;
        id: string;
    };
}) {
    return async (repos: {
        account: AccountRepo;
        action: ActionRepo;
        transaction: TransactionRepo;
    }) => {
        debug(`canceling money transfer... ${params.transaction.typeOf} ${params.transaction.id}`);
        let accountType: string;
        let fromAccountNumber: string | undefined;
        let toAccountNumber: string | undefined;

        // 取引存在確認
        const transaction = await repos.transaction.findById(params.transaction.typeOf, params.transaction.id);

        switch (params.transaction.typeOf) {
            case factory.transactionType.Deposit:
                accountType =
                    (<factory.transaction.ITransaction<factory.transactionType.Deposit>>transaction).object.toLocation.accountType;
                toAccountNumber =
                    (<factory.transaction.ITransaction<factory.transactionType.Deposit>>transaction).object.toLocation.accountNumber;
                break;

            case factory.transactionType.Withdraw:
                accountType =
                    (<factory.transaction.ITransaction<factory.transactionType.Withdraw>>transaction).object.fromLocation.accountType;
                fromAccountNumber =
                    (<factory.transaction.ITransaction<factory.transactionType.Withdraw>>transaction).object.fromLocation.accountNumber;
                break;

            case factory.transactionType.Transfer:
                accountType =
                    (<factory.transaction.ITransaction<factory.transactionType.Transfer>>transaction).object.fromLocation.accountType;
                fromAccountNumber =
                    (<factory.transaction.ITransaction<factory.transactionType.Transfer>>transaction).object.fromLocation.accountNumber;
                toAccountNumber =
                    (<factory.transaction.ITransaction<factory.transactionType.Transfer>>transaction).object.toLocation.accountNumber;
                break;

            default:
                throw new factory.errors.Argument('typeOf', `transaction type ${params.transaction.typeOf} unknown`);
        }

        await repos.account.voidTransaction({
            accountType: accountType,
            fromAccountNumber: fromAccountNumber,
            toAccountNumber: toAccountNumber,
            amount: transaction.object.amount,
            transactionId: transaction.id
        });

        // アクション取得
        const actions = await repos.action.searchTransferActions({
            purpose: {
                typeOf: { $eq: transaction.typeOf },
                id: { $eq: transaction.id }
            }
        });

        await Promise.all(actions.map(async (action) => {
            await repos.action.cancel(action.typeOf, action.id);
        }));
    };
}
