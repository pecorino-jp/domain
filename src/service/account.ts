/**
 * 口座サービス
 * 開設、閉鎖等、口座に対するアクションを定義します。
 */
import * as createDebug from 'debug';

import * as factory from '../factory';

import { MongoRepository as AccountRepo } from '../repo/account';
import { MongoRepository as ActionRepo } from '../repo/action';
import { MongoRepository as TransactionRepo } from '../repo/transaction';

const debug = createDebug('pecorino-domain:service:account');

export type IOpenOperation<T> = (repos: {
    account: AccountRepo;
}) => Promise<T>;
export type IActionRepo<T> = (repos: { action: ActionRepo }) => Promise<T>;

/**
 * 口座を開設する
 */
export function open<T extends factory.account.AccountType>(params: {
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
 * @param actionAttributes 転送アクション属性
 */
export function transferMoney<T extends factory.account.AccountType>(
    actionAttributes: factory.action.transfer.moneyTransfer.IAttributes<T>
) {
    return async (repos: {
        action: ActionRepo;
        account: AccountRepo;
        transaction: TransactionRepo;
    }) => {
        debug(`transfering money... ${actionAttributes.purpose.typeOf} ${actionAttributes.purpose.id}`);

        // アクション開始
        const action = await repos.action.start<factory.actionType.MoneyTransfer>(actionAttributes);

        try {
            // 取引存在確認
            const transaction = await repos.transaction.findById<factory.transactionType, T>(
                actionAttributes.purpose.typeOf, actionAttributes.purpose.id
            );

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
                accountType: transaction.object.accountType,
                fromAccountNumber: fromAccountNumber,
                toAccountNumber: toAccountNumber,
                amount: actionAttributes.amount,
                transactionId: transaction.id
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
 * @param params.transaction 転送アクションを実行しようとしていた取引
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
        let fromAccountNumber: string | undefined;
        let toAccountNumber: string | undefined;
        // 取引存在確認
        const transaction = await repos.transaction.findById(params.transaction.typeOf, params.transaction.id);

        switch (params.transaction.typeOf) {
            case factory.transactionType.Deposit:
                toAccountNumber =
                    (<factory.transaction.ITransaction<factory.transactionType.Deposit, T>>transaction).object.toAccountNumber;
                break;
            case factory.transactionType.Withdraw:
                fromAccountNumber =
                    (<factory.transaction.ITransaction<factory.transactionType.Withdraw, T>>transaction).object.fromAccountNumber;
                break;
            case factory.transactionType.Transfer:
                fromAccountNumber =
                    (<factory.transaction.ITransaction<factory.transactionType.Transfer, T>>transaction).object.fromAccountNumber;
                toAccountNumber =
                    (<factory.transaction.ITransaction<factory.transactionType.Transfer, T>>transaction).object.toAccountNumber;
                break;
            default:
                throw new factory.errors.Argument('typeOf', `transaction type ${params.transaction.typeOf} unknown`);
        }

        await repos.account.voidTransaction({
            accountType: transaction.object.accountType,
            fromAccountNumber: fromAccountNumber,
            toAccountNumber: toAccountNumber,
            amount: transaction.object.amount,
            transactionId: transaction.id
        });
    };
}
