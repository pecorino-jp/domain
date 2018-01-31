/**
 * 支払取引サービス
 * @namespace transaction.pay
 */

import * as createDebug from 'debug';

import * as factory from '../../factory';
import { MongoRepository as AccountRepo } from '../../repo/account';
import { MongoRepository as TaskRepository } from '../../repo/task';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

const debug = createDebug('pecorino-domain:service:transaction:pay');

export type IStartOperation<T> = (accountRepo: AccountRepo, transactionRepo: TransactionRepo) => Promise<T>;
export type ITaskAndTransactionOperation<T> = (taskRepository: TaskRepository, transactionRepo: TransactionRepo) => Promise<T>;
export type ITransactionOperation<T> = (transactionRepo: TransactionRepo) => Promise<T>;

export interface IStartParams {
    /**
     * 取引主体ID
     */
    agent: factory.transaction.pay.IAgent;
    /**
     * 支払先
     */
    recipient: factory.transaction.pay.IRecipient;
    object: factory.transaction.pay.IObject;
    /**
     * 取引期限
     */
    expires: Date;
}

/**
 * 取引開始
 */
export function start(params: IStartParams): IStartOperation<factory.transaction.pay.ITransaction> {
    return async (accountRepo: AccountRepo, transactionRepo: TransactionRepo) => {
        debug(`${params.agent.name} is starting pay transaction... amount:${params.object.price}`);

        // 口座存在確認
        await accountRepo.accountModel.findById(params.object.accountId).exec()
            .then((doc) => {
                if (doc === null) {
                    throw new factory.errors.NotFound('Account');
                }
            });

        // 取引ファクトリーで新しい進行中取引オブジェクトを作成
        const transactionAttributes = factory.transaction.pay.createAttributes({
            status: factory.transactionStatusType.InProgress,
            agent: params.agent,
            recipient: params.recipient,
            object: {
                clientUser: params.object.clientUser,
                price: params.object.price,
                accountId: params.object.accountId,
                notes: params.object.notes
            },
            expires: params.expires,
            startDate: new Date(),
            tasksExportationStatus: factory.transactionTasksExportationStatus.Unexported
        });

        // 取引作成
        let transaction: factory.transaction.pay.ITransaction;
        try {
            transaction = await transactionRepo.startPay(transactionAttributes);
        } catch (error) {
            if (error.name === 'MongoError') {
                // no op
            }

            throw error;
        }

        // 残高確認
        const account = await accountRepo.accountModel.findOneAndUpdate(
            {
                _id: params.object.accountId,
                safeBalance: { $gte: params.object.price }
            },
            {
                $inc: {
                    safeBalance: -params.object.price // 残高を減らす
                },
                $push: {
                    pendingTransactions: transaction // 進行中取引追加
                }
            }
        ).exec();

        if (account === null) {
            throw new Error('Insufficient balance.');
        }

        // 結果返却
        return transaction;
    };
}

/**
 * 取引中止
 */
export function cancel(agentId: string, transactionId: string) {
    return async (accountRepo: AccountRepo, transactionRepo: TransactionRepo) => {
        debug(`${agentId} is canceling pay transaction ${transactionId}...`);

        // 取引存在確認
        const transaction = await transactionRepo.findPayInProgressById(transactionId);

        if (transaction.agent.id !== agentId) {
            throw new factory.errors.Forbidden('A specified transaction is not yours.');
        }

        // 取引ステータス変更
        await transactionRepo.transactionModel.findOneAndUpdate(
            { _id: transaction.id, status: factory.transactionStatusType.InProgress },
            { status: factory.transactionStatusType.Canceled }
        ).exec();

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
 * 取引確定
 */
export function confirm(transactionId: string): ITransactionOperation<factory.transaction.pay.IResult> {
    return async (transactionRepo: TransactionRepo) => {
        debug(`confirming pay transaction ${transactionId}...`);

        // 取引存在確認
        const transaction = await transactionRepo.findPayInProgressById(transactionId);

        // 結果作成
        const payActionAttributes = factory.action.trade.pay.createAttributes({
            actionStatus: factory.actionStatusType.CompletedActionStatus,
            result: {
                price: transaction.object.price
            },
            object: {
                transactionId: transaction.id,
                ...transaction.object
            },
            agent: transaction.agent,
            recipient: transaction.recipient,
            startDate: new Date()
            // endDate?: Date;
        });
        const result = {
            history: {
                name: 'PayTransaction', price: transaction.object.price
            },
            payAction: { id: `${transaction.agent.id}-${transactionId}`, ...payActionAttributes }
        };

        // 取引ステータス変更
        await transactionRepo.transactionModel.findOneAndUpdate(
            { _id: transaction.id, status: factory.transactionStatusType.InProgress },
            {
                status: factory.transactionStatusType.Confirmed,
                result: result
            }
        ).exec();

        // 取引結果返却
        return result;
    };
}

/**
 * ひとつの取引のタスクをエクスポートする
 */
export function exportTasks(status: factory.transactionStatusType) {
    return async (taskRepository: TaskRepository, transactionRepo: TransactionRepo) => {
        const statusesTasksExportable = [factory.transactionStatusType.Expired, factory.transactionStatusType.Confirmed];
        if (statusesTasksExportable.indexOf(status) < 0) {
            throw new factory.errors.Argument('status', `transaction status should be in [${statusesTasksExportable.join(',')}]`);
        }

        const transaction = await transactionRepo.transactionModel.findOneAndUpdate(
            {
                status: status,
                tasksExportationStatus: factory.transactionTasksExportationStatus.Unexported
            },
            { tasksExportationStatus: factory.transactionTasksExportationStatus.Exporting },
            { new: true }
        ).exec()
            .then((doc) => (doc === null) ? null : <factory.transaction.pay.ITransaction>doc.toObject());

        if (transaction === null) {
            return;
        }

        // 失敗してもここでは戻さない(RUNNINGのまま待機)
        await exportTasksById(transaction.id)(
            taskRepository,
            transactionRepo
        );

        await transactionRepo.setTasksExportedById(transaction.id);
    };
}

/**
 * ID指定で取引のタスク出力
 */
export function exportTasksById(transactionId: string): ITaskAndTransactionOperation<factory.task.ITask[]> {
    // tslint:disable-next-line:max-func-body-length
    return async (taskRepository: TaskRepository, transactionRepo: TransactionRepo) => {
        const transaction = await transactionRepo.findPayById(transactionId);

        const taskAttributes: factory.task.IAttributes[] = [];
        switch (transaction.status) {
            case factory.transactionStatusType.Confirmed:
                taskAttributes.push(factory.task.executePayAction.createAttributes({
                    status: factory.taskStatus.Ready,
                    runsAt: new Date(), // なるはやで実行
                    remainingNumberOfTries: 10,
                    lastTriedAt: null,
                    numberOfTried: 0,
                    executionResults: [],
                    data: {
                        transactionId: transaction.id
                    }
                }));

                break;

            // 期限切れの場合は、タスクリストを作成する
            case factory.transactionStatusType.Canceled:
            case factory.transactionStatusType.Expired:
                taskAttributes.push(factory.task.cancelPayAction.createAttributes({
                    status: factory.taskStatus.Ready,
                    runsAt: new Date(), // なるはやで実行
                    remainingNumberOfTries: 10,
                    lastTriedAt: null,
                    numberOfTried: 0,
                    executionResults: [],
                    data: {
                        transactionId: transaction.id
                    }
                }));

                break;

            default:
                throw new factory.errors.NotImplemented(`Transaction status "${transaction.status}" not implemented.`);
        }
        debug('taskAttributes prepared', taskAttributes);

        return Promise.all(taskAttributes.map(async (taskAttribute) => {
            return taskRepository.save(taskAttribute);
        }));
    };
}
