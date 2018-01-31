/**
 * 口座に対する支払アクションサービス
 * @namespace account
 */

import * as createDebug from 'debug';

import * as factory from '../../../factory';

import { MongoRepository as AccountRepo } from '../../../repo/account';
import { MongoRepository as PayActionRepo } from '../../../repo/action/trade/pay';
import { MongoRepository as TransactionRepo } from '../../../repo/transaction';

const debug = createDebug('pecorino-domain:service:account');

/**
 * 支払中止
 */
export function cancel(transactionId: string) {
    return async (accountRepo: AccountRepo, transactionRepo: TransactionRepo) => {
        debug(`canceling pay transaction ${transactionId}...`);

        // 取引存在確認
        const transaction = await transactionRepo.findPayById(transactionId);

        // 残高調整
        try {
            await accountRepo.accountModel.findOneAndUpdate(
                {
                    _id: transaction.object.accountId,
                    'pendingTransactions.id': transaction.id
                },
                {
                    $inc: {
                        safeBalance: transaction.object.price // 残高を元に戻す
                    },
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
 * 支払完了
 */
export function execute(transactionId: string) {
    return async (actionRepo: PayActionRepo, accountRepo: AccountRepo, transactionRepo: TransactionRepo) => {
        debug(`executing pay transaction ${transactionId}...`);

        // 取引存在確認
        const transaction = await transactionRepo.findPayById(transactionId);
        const transactionResult = <factory.transaction.pay.IResult>transaction.result;
        const payAction = transactionResult.payAction;

        // 残高調整
        await accountRepo.accountModel.findOneAndUpdate(
            {
                _id: transaction.object.accountId,
                'pendingTransactions.id': transaction.id
            },
            {
                $inc: {
                    balance: -transaction.object.price // 残高調整
                },
                $pull: {
                    pendingTransactions: { id: transaction.id } // 進行中取引削除
                }
            }
        ).exec();

        // 支払アクション追加
        await actionRepo.actionModel.findByIdAndUpdate(
            payAction.id,
            {
                ...payAction,
                endDate: new Date()
            },
            { upsert: true }
        ).exec();
    };
}
