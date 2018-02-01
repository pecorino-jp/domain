/**
 * 入金取引サービス
 * @namespace transaction.deposit
 */

import * as createDebug from 'debug';

import * as factory from '../../factory';
import { MongoRepository as AccountRepo } from '../../repo/account';
import { MongoRepository as TaskRepository } from '../../repo/task';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';
import { MongoRepository as DepositTransactionRepo } from '../../repo/transaction/deposit';

const debug = createDebug('pecorino-domain:service:transaction:deposit');

export type IStartOperation<T> = (accountRepo: AccountRepo, transactionRepo: DepositTransactionRepo) => Promise<T>;
export type ITransactionOperation<T> = (transactionRepo: DepositTransactionRepo) => Promise<T>;
export type ITaskAndTransactionOperation<T> = (taskRepository: TaskRepository, transactionRepo: TransactionRepo) => Promise<T>;

export interface IStartParams {
    /**
     * 取引主体ID
     */
    agent: factory.transaction.deposit.IAgent;
    /**
     * 支払先
     */
    recipient: factory.transaction.deposit.IRecipient;
    object: factory.transaction.deposit.IObject;
    /**
     * 取引期限
     */
    expires: Date;
}

/**
 * 取引開始
 */
export function start(params: IStartParams): IStartOperation<factory.transaction.deposit.ITransaction> {
    return async (accountRepo: AccountRepo, transactionRepo: DepositTransactionRepo) => {
        debug(`${params.agent.name} is starting deposit transaction... amount:${params.object.price}`);

        // 口座存在確認
        await accountRepo.accountModel.findById(params.object.toAccountId).exec()
            .then((doc) => {
                if (doc === null) {
                    throw new factory.errors.NotFound('Account');
                }
            });

        // 取引ファクトリーで新しい進行中取引オブジェクトを作成
        const transactionAttributes = factory.transaction.deposit.createAttributes({
            status: factory.transactionStatusType.InProgress,
            agent: params.agent,
            recipient: params.recipient,
            object: {
                clientUser: params.object.clientUser,
                price: params.object.price,
                toAccountId: params.object.toAccountId,
                notes: params.object.notes
            },
            expires: params.expires,
            startDate: new Date(),
            tasksExportationStatus: factory.transactionTasksExportationStatus.Unexported
        });

        // 取引作成
        let transaction: factory.transaction.deposit.ITransaction;
        try {
            transaction = await transactionRepo.start(transactionAttributes);
        } catch (error) {
            if (error.name === 'MongoError') {
                // no op
            }

            throw error;
        }

        // 残高確認
        const account = await accountRepo.accountModel.findOneAndUpdate(
            {
                // 入金なので、条件があるとすれば、口座max預金金額設定くらいか
                _id: params.object.toAccountId
            },
            {
                $push: {
                    pendingTransactions: transaction // 進行中取引追加
                }
            }
        ).exec();

        if (account === null) {
            throw new factory.errors.NotFound('Account');
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
        debug(`${agentId} is canceling deposit transaction ${transactionId}...`);

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
export function confirm(transactionId: string): ITransactionOperation<factory.transaction.deposit.IResult> {
    return async (transactionRepo: DepositTransactionRepo) => {
        debug(`confirming deposit transaction ${transactionId}...`);

        // 取引存在確認
        const transaction = await transactionRepo.findInProgressById(transactionId);

        // 結果作成
        const depositActionAttributes = factory.action.transfer.take.createAttributes({
            actionStatus: factory.actionStatusType.CompletedActionStatus,
            result: {
                price: transaction.object.price
            },
            object: {
                transactionId: transaction.id,
                clientUser: transaction.object.clientUser,
                price: transaction.object.price,
                accountId: transaction.object.toAccountId,
                notes: transaction.object.notes
            },
            agent: transaction.agent,
            recipient: transaction.recipient,
            startDate: new Date()
            // endDate?: Date;
        });
        const result = {
            takeAction: { id: `${transaction.agent.id}-${transactionId}`, ...depositActionAttributes }
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
                typeOf: factory.transactionType.Deposit,
                status: status,
                tasksExportationStatus: factory.transactionTasksExportationStatus.Unexported
            },
            { tasksExportationStatus: factory.transactionTasksExportationStatus.Exporting },
            { new: true }
        ).exec()
            .then((doc) => (doc === null) ? null : <factory.transaction.deposit.ITransaction>doc.toObject());

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
    return async (taskRepository: TaskRepository, transactionRepo: TransactionRepo) => {
        const transaction = <factory.transaction.deposit.ITransaction>await transactionRepo.findById(transactionId);

        const taskAttributes: factory.task.IAttributes[] = [];
        switch (transaction.status) {
            case factory.transactionStatusType.Confirmed:
                taskAttributes.push(factory.task.executeTakeAction.createAttributes({
                    status: factory.taskStatus.Ready,
                    runsAt: new Date(), // なるはやで実行
                    remainingNumberOfTries: 10,
                    lastTriedAt: null,
                    numberOfTried: 0,
                    executionResults: [],
                    data: {
                        transactionId: transaction.id,
                        accountId: transaction.object.toAccountId
                    }
                }));

                break;

            // 期限切れの場合は、タスクリストを作成する
            case factory.transactionStatusType.Canceled:
            case factory.transactionStatusType.Expired:
                taskAttributes.push(factory.task.cancelTakeAction.createAttributes({
                    status: factory.taskStatus.Ready,
                    runsAt: new Date(), // なるはやで実行
                    remainingNumberOfTries: 10,
                    lastTriedAt: null,
                    numberOfTried: 0,
                    executionResults: [],
                    data: {
                        transactionId: transaction.id,
                        accountId: transaction.object.toAccountId
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
