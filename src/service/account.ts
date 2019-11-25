/**
 * 口座サービス
 * 開設、閉鎖等、口座に対するアクションを定義します。
 */
import * as createDebug from 'debug';

import * as factory from '../factory';

import { MongoRepository as AccountRepo } from '../repo/account';
import { MongoRepository as ActionRepo } from '../repo/action';
import { MongoRepository as TransactionRepo } from '../repo/transaction';

const debug = createDebug('pecorino-domain:*');

export type IOpenOperation<T> = (repos: {
    account: AccountRepo;
}) => Promise<T>;
export type IActionRepo<T> = (repos: { action: ActionRepo }) => Promise<T>;

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
}): IOpenOperation<factory.account.IAccount<T>> {
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
export function transferMoney<T extends factory.account.AccountType>(
    actionAttributes: factory.action.transfer.moneyTransfer.IAttributes<T>
) {
    return async (repos: {
        action: ActionRepo;
        account: AccountRepo;
    }) => {
        debug(`transfering money... ${actionAttributes.purpose.typeOf} ${actionAttributes.purpose.id}`);

        // アクション開始
        const action = await repos.action.start<factory.actionType.MoneyTransfer>(actionAttributes);

        try {
            let accountType: T;
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (actionAttributes.fromLocation.typeOf === factory.account.TypeOf.Account) {
                accountType = (<factory.action.transfer.moneyTransfer.IAccount<T>>actionAttributes.fromLocation).accountType;
            } else if (actionAttributes.toLocation.typeOf === factory.account.TypeOf.Account) {
                accountType = (<factory.action.transfer.moneyTransfer.IAccount<T>>actionAttributes.toLocation).accountType;
            } else {
                throw new factory.errors.NotImplemented('No Account Location');
            }

            const fromAccountNumber = (actionAttributes.fromLocation.typeOf === factory.account.TypeOf.Account)
                ? (<factory.action.transfer.moneyTransfer.IAccount<T>>actionAttributes.fromLocation).accountNumber
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore next */
                : undefined;
            const toAccountNumber = (actionAttributes.toLocation.typeOf === factory.account.TypeOf.Account)
                ? (<factory.action.transfer.moneyTransfer.IAccount<T>>actionAttributes.toLocation).accountNumber
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore next */
                : undefined;

            await repos.account.settleTransaction<T>({
                accountType: accountType,
                fromAccountNumber: fromAccountNumber,
                toAccountNumber: toAccountNumber,
                amount: actionAttributes.amount,
                transactionId: actionAttributes.purpose.id
            });
        } catch (error) {
            // actionにエラー結果を追加
            try {
                const actionError = { ...error, ...{ message: error.message, name: error.name } };
                await repos.action.giveUp(action.typeOf, action.id, actionError);
            } catch (__) {
                // 失敗したら仕方ない
            }

            throw error;
        }

        // アクション完了
        debug('ending action...');
        const actionResult: factory.action.transfer.moneyTransfer.IResult = {};
        await repos.action.complete(action.typeOf, action.id, actionResult);
    };
}

/**
 * 転送取消
 * 期限切れ、あるいは、中止された取引から、転送をアクションを取り消します。
 */
export function cancelMoneyTransfer<T extends factory.account.AccountType>(params: {
    transaction: {
        typeOf: factory.transactionType;
        id: string;
    };
}) {
    return async (repos: {
        account: AccountRepo;
        transaction: TransactionRepo;
    }) => {
        debug(`canceling money transfer... ${params.transaction.typeOf} ${params.transaction.id}`);
        let accountType: T;
        let fromAccountNumber: string | undefined;
        let toAccountNumber: string | undefined;

        // 取引存在確認
        const transaction = await repos.transaction.findById(params.transaction.typeOf, params.transaction.id);

        switch (params.transaction.typeOf) {
            case factory.transactionType.Deposit:
                accountType =
                    (<factory.transaction.ITransaction<factory.transactionType.Deposit, T>>transaction).object.toLocation.accountType;
                toAccountNumber =
                    (<factory.transaction.ITransaction<factory.transactionType.Deposit, T>>transaction).object.toLocation.accountNumber;
                break;

            case factory.transactionType.Withdraw:
                accountType =
                    (<factory.transaction.ITransaction<factory.transactionType.Withdraw, T>>transaction).object.fromLocation.accountType;
                fromAccountNumber =
                    (<factory.transaction.ITransaction<factory.transactionType.Withdraw, T>>transaction).object.fromLocation.accountNumber;
                break;

            case factory.transactionType.Transfer:
                accountType =
                    (<factory.transaction.ITransaction<factory.transactionType.Transfer, T>>transaction).object.fromLocation.accountType;
                fromAccountNumber =
                    (<factory.transaction.ITransaction<factory.transactionType.Transfer, T>>transaction).object.fromLocation.accountNumber;
                toAccountNumber =
                    (<factory.transaction.ITransaction<factory.transactionType.Transfer, T>>transaction).object.toLocation.accountNumber;
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
    };
}
