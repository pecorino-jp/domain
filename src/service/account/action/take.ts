/**
 * 入金受取アクションサービス
 * @namespace account.take
 */

import * as createDebug from 'debug';

import * as factory from '../../../factory';

import { MongoRepository as AccountRepo } from '../../../repo/account';
import { MongoRepository as PayActionRepo } from '../../../repo/action/trade/pay';
import { MongoRepository as TransactionRepo } from '../../../repo/transaction';

const debug = createDebug('pecorino-domain:service:account');

/**
 * 受取中止
 */
export function cancel(transactionId: string, acconutId: string) {
    return async (accountRepo: AccountRepo, transactionRepo: TransactionRepo) => {
        debug(`canceling pay transaction ${transactionId}...`);

        // 取引存在確認
        const transaction = await transactionRepo.findById(transactionId);

        // 残高調整
        try {
            await accountRepo.accountModel.findOneAndUpdate(
                {
                    _id: acconutId,
                    'pendingTransactions.id': transaction.id
                },
                {
                    $pull: {
                        pendingTransactions: { id: transaction.id } // 進行中取引削除
                    }
                }
            ).exec();
        } catch (error) {
            // no op
            // 失敗したとしてもタスクにまかせる
        }
    };
}

/**
 * 受取実行
 */
export function execute(transactionId: string, acconutId: string) {
    return async (actionRepo: PayActionRepo, accountRepo: AccountRepo, transactionRepo: TransactionRepo) => {
        debug(`executing pay transaction ${transactionId}...`);

        // 取引存在確認
        const transaction = await transactionRepo.findById(transactionId);
        const transactionResult = <factory.transaction.deposit.IResult>transaction.result;
        const takeAction = transactionResult.takeAction;

        // 残高調整
        await accountRepo.accountModel.findOneAndUpdate(
            {
                _id: acconutId,
                'pendingTransactions.id': transaction.id
            },
            {
                $inc: {
                    balance: transaction.object.price // 残高調整
                },
                $pull: {
                    pendingTransactions: { id: transaction.id } // 進行中取引削除
                }
            }
        ).exec();

        // 支払アクション追加
        await actionRepo.actionModel.findByIdAndUpdate(
            takeAction.id,
            {
                ...takeAction,
                endDate: new Date()
            },
            { upsert: true }
        ).exec();
    };
}
