/**
 * 転送取引サービス
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
    params: factory.transaction.IStartParams<factory.transactionType.Transfer>
): IStartOperation<factory.transaction.transfer.ITransaction> {
    return async (repos: {
        account: AccountRepo;
        action: ActionRepo;
        transaction: TransactionRepo;
    }) => {
        debug(`${params.agent.name} is starting transfer transaction... amount:${params.object.amount}`);

        // 口座存在確認
        const fromAccount = await repos.account.findByAccountNumber({
            accountType: params.object.fromLocation.accountType,
            accountNumber: params.object.fromLocation.accountNumber
        });
        const toAccount = await repos.account.findByAccountNumber({
            accountType: params.object.toLocation.accountType,
            accountNumber: params.object.toLocation.accountNumber
        });

        // 取引ファクトリーで新しい進行中取引オブジェクトを作成
        const startParams: factory.transaction.IStartParams<factory.transactionType.Transfer> = {
            project: { typeOf: params.project.typeOf, id: params.project.id },
            typeOf: factory.transactionType.Transfer,
            agent: params.agent,
            recipient: params.recipient,
            object: {
                clientUser: params.object.clientUser,
                amount: params.object.amount,
                fromLocation: {
                    typeOf: factory.account.TypeOf.Account,
                    accountType: fromAccount.accountType,
                    accountNumber: fromAccount.accountNumber,
                    name: fromAccount.name
                },
                toLocation: {
                    typeOf: factory.account.TypeOf.Account,
                    accountType: toAccount.accountType,
                    accountNumber: toAccount.accountNumber,
                    name: toAccount.name
                },
                description: params.object.description
            },
            expires: params.expires
        };

        // 取引作成
        let transaction: factory.transaction.transfer.ITransaction;
        try {
            transaction = await repos.transaction.start<factory.transactionType.Transfer>(factory.transactionType.Transfer, startParams);
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

        // 残高確認
        await repos.account.authorizeAmount({
            accountType: params.object.fromLocation.accountType,
            accountNumber: params.object.fromLocation.accountNumber,
            amount: params.object.amount,
            transaction: pendingTransaction
        });

        // 転送先口座に進行中取引を追加
        await repos.account.startTransaction({
            accountType: params.object.toLocation.accountType,
            accountNumber: params.object.toLocation.accountNumber,
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
}): IConfirmOperation<void> {
    return async (repos: {
        action: ActionRepo;
        transaction: TransactionRepo;
    }) => {
        // 取引存在確認
        const transaction = await repos.transaction.findById(factory.transactionType.Transfer, params.transactionId);

        // 現金転送アクション属性作成
        const moneyTransferActionAttributes = createMoneyTransferActionAttributes({ transaction });
        const potentialActions: factory.transaction.transfer.IPotentialActions = {
            moneyTransfer: moneyTransferActionAttributes
        };

        // 取引確定
        await repos.transaction.confirm(transaction.typeOf, transaction.id, {}, potentialActions);
    };
}
