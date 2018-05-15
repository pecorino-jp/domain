/**
 * 口座サービス
 * 開設、閉鎖等、口座に対するアクションを定義します。
 */
import * as createDebug from 'debug';
import * as moment from 'moment';

import * as factory from '../factory';

import { MongoRepository as AccountRepo } from '../repo/account';
import { RedisRepository as AccountNumberRepo } from '../repo/accountNumber';
import { MongoRepository as ActionRepo } from '../repo/action';
import { MongoRepository as TransactionRepo } from '../repo/transaction';

const debug = createDebug('pecorino-domain:service:account');

export type IOpenOperation<T> = (repos: {
    account: AccountRepo;
    accountNumber: AccountNumberRepo;
}) => Promise<T>;
export type IActionRepo<T> = (repos: { action: ActionRepo }) => Promise<T>;

export function open(params: {
    name: string;
    initialBalance: number;
}): IOpenOperation<factory.account.IAccount> {
    return async (repos: {
        account: AccountRepo;
        accountNumber: AccountNumberRepo;
    }) => {
        const openDate = moment().toDate();
        const accountNumber = await repos.accountNumber.publish(openDate);

        return repos.account.open({
            name: params.name,
            accountNumber: accountNumber,
            initialBalance: params.initialBalance,
            openDate: openDate
        });
    };
}

/**
 * 転送する
 * 確定取引結果から、実際の転送アクションを実行します。
 * @param actionAttributes 転送アクション属性
 */
export function transferMoney(actionAttributes: factory.action.transfer.moneyTransfer.IAttributes) {
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
            const transaction = await repos.transaction.findById(actionAttributes.purpose.typeOf, actionAttributes.purpose.id);

            const fromAccountId = (actionAttributes.fromLocation.typeOf === factory.account.AccountType.Account)
                ? (<factory.action.transfer.moneyTransfer.IAccount>actionAttributes.fromLocation).id
                : undefined;
            const toAccountId = (actionAttributes.toLocation.typeOf === factory.account.AccountType.Account)
                ? (<factory.action.transfer.moneyTransfer.IAccount>actionAttributes.toLocation).id
                : undefined;

            await repos.account.settleTransaction({
                fromAccountId: fromAccountId,
                toAccountId: toAccountId,
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
export function cancelMoneyTransfer(params: {
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
        try {
            let fromAccountId: string | undefined;
            let toAccountId: string | undefined;
            // 取引存在確認
            const transaction = await repos.transaction.findById(params.transaction.typeOf, params.transaction.id);

            switch (params.transaction.typeOf) {
                case factory.transactionType.Deposit:
                    toAccountId = (<factory.transaction.ITransaction<factory.transactionType.Deposit>>transaction).object.toAccountId;
                    break;
                case factory.transactionType.Pay:
                    fromAccountId = (<factory.transaction.ITransaction<factory.transactionType.Pay>>transaction).object.fromAccountId;
                    break;
                case factory.transactionType.Transfer:
                    fromAccountId = (<factory.transaction.ITransaction<factory.transactionType.Transfer>>transaction).object.fromAccountId;
                    toAccountId = (<factory.transaction.ITransaction<factory.transactionType.Transfer>>transaction).object.toAccountId;
                    break;
                default:
                    throw new factory.errors.Argument('typeOf', `transaction type ${params.transaction.typeOf} unknown`);
            }

            await repos.account.voidTransaction({
                fromAccountId: fromAccountId,
                toAccountId: toAccountId,
                amount: transaction.object.price,
                transactionId: transaction.id
            });
        } catch (error) {
            throw error;
        }
    };
}
