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

/**
 * 取引開始
 */
// tslint:disable-next-line:max-func-body-length
export function start(
    params: factory.transaction.transfer.IStartParamsWithoutDetail
): IStartOperation<factory.transaction.transfer.ITransaction> {
    return async (repos: {
        account: AccountRepo;
        action: ActionRepo;
        transaction: TransactionRepo;
    }) => {
        debug(`${params.agent.name} is starting transfer transaction... amount:${params.object.amount}`);

        // 口座存在確認
        const fromAccount = await repos.account.findByAccountNumber({
            accountNumber: params.object.fromLocation.accountNumber
        });
        const toAccount = await repos.account.findByAccountNumber({
            accountNumber: params.object.toLocation.accountNumber
        });

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore if */
        if (fromAccount.accountType !== toAccount.accountType) {
            throw new factory.errors.Argument('accountType', 'FromLocation accountType must be the same as ToLocation');
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore if */
        if (fromAccount.accountNumber === toAccount.accountNumber) {
            throw new factory.errors.Argument('accountNumber', 'FromLocation accountType must be different from ToLocation');
        }

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
                    typeOf: fromAccount.typeOf,
                    accountType: fromAccount.accountType,
                    accountNumber: fromAccount.accountNumber,
                    name: fromAccount.name
                },
                toLocation: {
                    typeOf: toAccount.typeOf,
                    accountType: toAccount.accountType,
                    accountNumber: toAccount.accountNumber,
                    name: toAccount.name
                },
                description: params.object.description
            },
            expires: params.expires,
            ...(typeof params.identifier === 'string' && params.identifier.length > 0) ? { identifier: params.identifier } : undefined,
            ...(typeof params.transactionNumber === 'string') ? { transactionNumber: params.transactionNumber } : undefined
        };

        // 取引作成
        let transaction: factory.transaction.transfer.ITransaction;
        try {
            // 取引識別子が指定されていれば、進行中取引のユニークネスを保証する
            transaction = await repos.transaction.startByIdentifier<factory.transactionType.Transfer>(
                factory.transactionType.Transfer, startParams
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

        // 残高確認
        await repos.account.authorizeAmount({
            accountNumber: params.object.fromLocation.accountNumber,
            amount: params.object.amount,
            transaction: pendingTransaction
        });

        // 転送先口座に進行中取引を追加
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
