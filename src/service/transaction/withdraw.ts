/**
 * 出金取引サービス
 */
import * as createDebug from 'debug';

import * as factory from '../../factory';
import { MongoRepository as AccountRepo } from '../../repo/account';
import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

import { createMoneyTransferActionAttributes } from './factory';

const debug = createDebug('pecorino-domain:service');

export type IStartOperation<T> = (repos: {
    account: AccountRepo;
    action: ActionRepo;
    transaction: TransactionRepo;
}) => Promise<T>;
export type IConfirmOperation<T> = (repos: {
    transaction: TransactionRepo;
}) => Promise<T>;

/**
 * 取引開始
 */
export function start(
    params: factory.transaction.IStartParams<factory.transactionType.Withdraw>
): IStartOperation<factory.transaction.withdraw.ITransaction> {
    return async (repos: {
        account: AccountRepo;
        action: ActionRepo;
        transaction: TransactionRepo;
    }) => {
        debug(`${params.agent.name} is starting withdraw transaction... amount:${params.object.amount}`);

        // 口座存在確認
        const account = await repos.account.findByAccountNumber({
            accountType: params.object.fromLocation.accountType,
            accountNumber: params.object.fromLocation.accountNumber
        });

        // 取引ファクトリーで新しい進行中取引オブジェクトを作成
        const startParams: factory.transaction.IStartParams<factory.transactionType.Withdraw> = {
            project: { typeOf: params.project.typeOf, id: params.project.id },
            typeOf: factory.transactionType.Withdraw,
            agent: params.agent,
            recipient: params.recipient,
            object: {
                clientUser: params.object.clientUser,
                amount: params.object.amount,
                fromLocation: {
                    typeOf: factory.account.TypeOf.Account,
                    accountType: account.accountType,
                    accountNumber: account.accountNumber,
                    name: account.name
                },
                description: params.object.description
            },
            expires: params.expires
        };

        // 取引作成
        let transaction: factory.transaction.withdraw.ITransaction;
        try {
            transaction = await repos.transaction.start<factory.transactionType.Withdraw>(factory.transactionType.Withdraw, startParams);
        } catch (error) {
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore next */
            if (error.name === 'MongoError') {
                // no op
            }

            throw error;
        }

        const pendingTransaction: factory.account.IPendingTransaction = {
            typeOf: transaction.typeOf,
            id: transaction.id,
            amount: params.object.amount
        };

        // 残高確保
        await repos.account.authorizeAmount({
            accountType: params.object.fromLocation.accountType,
            accountNumber: params.object.fromLocation.accountNumber,
            amount: params.object.amount,
            transaction: pendingTransaction
        });

        // アクション開始
        const moneyTransferActionAttributes = createMoneyTransferActionAttributes({ transaction });
        await repos.action.start(moneyTransferActionAttributes);

        // 結果返却
        return transaction;
    };
}

/**
 * 取引確定
 */
export function confirm(params: {
    transactionId: string;
}): IConfirmOperation<factory.transaction.withdraw.IResult> {
    return async (repos: {
        action: ActionRepo;
        transaction: TransactionRepo;
    }) => {
        // 取引存在確認
        const transaction = await repos.transaction.findById<factory.transactionType.Withdraw>(
            factory.transactionType.Withdraw, params.transactionId
        );

        // 現金転送アクション属性作成
        const moneyTransferActionAttributes = createMoneyTransferActionAttributes({ transaction });
        const potentialActions: factory.transaction.withdraw.IPotentialActions = {
            moneyTransfer: moneyTransferActionAttributes
        };

        // 取引確定
        await repos.transaction.confirm(transaction.typeOf, transaction.id, {}, potentialActions);
    };
}
