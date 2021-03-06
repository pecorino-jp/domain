/**
 * 入金取引サービス
 */
import * as factory from '../../factory';
import { MongoRepository as AccountRepo } from '../../repo/account';
import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

import { createMoneyTransferActionAttributes } from './factory';

export type IStartOperation<T> = (repos: {
    account: AccountRepo;
    action: ActionRepo;
    transaction: TransactionRepo;
}) => Promise<T>;

/**
 * 取引開始
 */
export function start(
    params: factory.transaction.deposit.IStartParamsWithoutDetail
): IStartOperation<factory.transaction.deposit.ITransaction> {
    return async (repos: {
        account: AccountRepo;
        action: ActionRepo;
        transaction: TransactionRepo;
    }) => {
        // 口座存在確認
        const account = await repos.account.findByAccountNumber({
            accountNumber: params.object.toLocation.accountNumber
        });

        // 取引ファクトリーで新しい進行中取引オブジェクトを作成
        const startParams: factory.transaction.IStartParams<factory.transactionType.Deposit> = {
            project: { typeOf: params.project.typeOf, id: params.project.id },
            typeOf: factory.transactionType.Deposit,
            agent: params.agent,
            recipient: params.recipient,
            object: {
                clientUser: params.object.clientUser,
                amount: params.object.amount,
                toLocation: {
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
        let transaction: factory.transaction.deposit.ITransaction;
        try {
            // 取引識別子が指定されていれば、進行中取引のユニークネスを保証する
            transaction = await repos.transaction.startByIdentifier<factory.transactionType.Deposit>(
                factory.transactionType.Deposit, startParams
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

        // 入金先口座に進行中取引を追加
        await repos.account.startTransaction({
            accountNumber: params.object.toLocation.accountNumber,
            transaction: pendingTransaction
        });

        // アクション開始
        const moneyTransferActionAttributes = createMoneyTransferActionAttributes({ transaction });
        // await repos.action.start(moneyTransferActionAttributes);
        await repos.action.startByIdentifier(moneyTransferActionAttributes);

        // 結果返却
        return transaction;
    };
}
