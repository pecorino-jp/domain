/**
 * 出金取引サービス
 */
import * as createDebug from 'debug';

import * as factory from '../../factory';
import { MongoRepository as AccountRepo } from '../../repo/account';
import { MongoRepository as AccountActionRepo } from '../../repo/accountAction';
import { MongoRepository as AccountTransactionRepo } from '../../repo/accountTransaction';

import { createMoneyTransferActionAttributes } from './factory';

const debug = createDebug('pecorino-domain:service');

export type IStartOperation<T> = (repos: {
    account: AccountRepo;
    accountAction: AccountActionRepo;
    accountTransaction: AccountTransactionRepo;
}) => Promise<T>;

/**
 * 取引開始
 */
export function start(
    params: factory.account.transaction.withdraw.IStartParamsWithoutDetail
): IStartOperation<factory.account.transaction.withdraw.ITransaction> {
    return async (repos: {
        account: AccountRepo;
        accountAction: AccountActionRepo;
        accountTransaction: AccountTransactionRepo;
    }) => {
        debug(`${params.agent.name} is starting withdraw transaction... amount:${params.object.amount}`);

        // 口座存在確認
        const account = await repos.account.findByAccountNumber({
            accountNumber: params.object.fromLocation.accountNumber
        });

        // 取引ファクトリーで新しい進行中取引オブジェクトを作成
        const startParams: factory.account.transaction.withdraw.IStartParams = {
            project: { typeOf: params.project.typeOf, id: params.project.id },
            typeOf: factory.account.transactionType.Withdraw,
            agent: params.agent,
            recipient: params.recipient,
            object: {
                clientUser: params.object.clientUser,
                amount: params.object.amount,
                fromLocation: {
                    typeOf: account.typeOf,
                    accountType: account.accountType,
                    accountNumber: account.accountNumber,
                    name: account.name
                },
                description: params.object.description
            },
            expires: params.expires,
            ...(typeof params.identifier === 'string' && params.identifier.length > 0) ? { identifier: params.identifier } : undefined,
            ...(typeof params.transactionNumber === 'string') ? { transactionNumber: params.transactionNumber } : undefined
        };

        // 取引作成
        let transaction: factory.account.transaction.withdraw.ITransaction;
        try {
            // 取引識別子が指定されていれば、進行中取引のユニークネスを保証する
            transaction = await repos.accountTransaction.startByIdentifier<factory.account.transactionType.Withdraw>(
                factory.account.transactionType.Withdraw, startParams
            );
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
            accountNumber: params.object.fromLocation.accountNumber,
            amount: params.object.amount,
            transaction: pendingTransaction
        });

        // アクション開始
        const moneyTransferActionAttributes = createMoneyTransferActionAttributes({ transaction });
        // await repos.accountAction.start(moneyTransferActionAttributes);
        await repos.accountAction.startByIdentifier(moneyTransferActionAttributes);

        // 結果返却
        return transaction;
    };
}
