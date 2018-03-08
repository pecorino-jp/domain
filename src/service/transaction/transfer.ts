/**
 * 転送取引サービス
 * @namespace transaction.transfer
 */

import * as createDebug from 'debug';

import * as factory from '../../factory';
import { MongoRepository as AccountRepo } from '../../repo/account';
import { MongoRepository as TaskRepository } from '../../repo/task';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

const debug = createDebug('pecorino-domain:service:transaction:transfer');

export type ITransaction = factory.transaction.transfer.ITransaction;
export type IStartOperation<T> = (repos: {
    account: AccountRepo;
    transaction: TransactionRepo;
}) => Promise<T>;
export type ITaskAndTransactionOperation<T> = (repos: {
    task: TaskRepository;
    transaction: TransactionRepo;
}) => Promise<T>;
export type ITransactionOperation<T> = (repos: {
    transaction: TransactionRepo;
}) => Promise<T>;

export interface IStartParams {
    /**
     * 取引主体ID
     */
    agent: factory.transaction.transfer.IAgent;
    /**
     * 転送先
     */
    recipient: factory.transaction.transfer.IRecipient;
    object: factory.transaction.transfer.IObject;
    /**
     * 取引期限
     */
    expires: Date;
}

/**
 * 取引開始
 */
export function start(params: IStartParams): IStartOperation<ITransaction> {
    return async (repos: {
        account: AccountRepo;
        transaction: TransactionRepo;
    }) => {
        debug(`${params.agent.name} is starting transfer transaction... amount:${params.object.price}`);

        // 口座存在確認
        await repos.account.accountModel.findById(params.object.fromAccountId).exec().then((doc) => {
            if (doc === null) {
                throw new factory.errors.NotFound('fromAccount');
            }
        });
        await repos.account.accountModel.findById(params.object.toAccountId).exec().then((doc) => {
            if (doc === null) {
                throw new factory.errors.NotFound('toAccount');
            }
        });

        // 取引ファクトリーで新しい進行中取引オブジェクトを作成
        const transactionAttributes = factory.transaction.transfer.createAttributes({
            status: factory.transactionStatusType.InProgress,
            agent: params.agent,
            recipient: params.recipient,
            object: {
                clientUser: params.object.clientUser,
                price: params.object.price,
                fromAccountId: params.object.fromAccountId,
                toAccountId: params.object.toAccountId,
                notes: params.object.notes
            },
            expires: params.expires,
            tasksExportationStatus: factory.transactionTasksExportationStatus.Unexported
        });

        // 取引作成
        let transaction: ITransaction;
        try {
            transaction = await repos.transaction.start<ITransaction>(transactionAttributes);
        } catch (error) {
            if (error.name === 'MongoError') {
                // no op
            }

            throw error;
        }

        const pendingTransaction: factory.account.IPendingTransaction = { typeOf: transaction.typeOf, id: transaction.id };

        // 残高確認
        const fromAccount = await repos.account.accountModel.findOneAndUpdate(
            {
                _id: params.object.fromAccountId,
                safeBalance: { $gte: params.object.price }
            },
            {
                $inc: {
                    safeBalance: -params.object.price // 残高を減らす
                },
                $push: {
                    pendingTransactions: pendingTransaction // 進行中取引追加
                }
            }
        ).exec();

        if (fromAccount === null) {
            throw new Error('Insufficient balance.');
        }

        // 転送先口座に進行中取引を追加
        await repos.account.accountModel.findOneAndUpdate(
            {
                _id: params.object.toAccountId
            },
            {
                $push: {
                    pendingTransactions: pendingTransaction // 進行中取引追加
                }
            }
        ).exec();

        // 結果返却
        return transaction;
    };
}

/**
 * 取引確定
 */
export function confirm(transactionId: string): ITransactionOperation<void> {
    return async (repos: {
        transaction: TransactionRepo;
    }) => {
        debug(`confirming transfer transaction ${transactionId}...`);

        // 取引存在確認
        const transaction = await repos.transaction.findInProgressById<ITransaction>(factory.transactionType.Transfer, transactionId);

        // 現金転送アクション属性作成
        const moneyTransferActionAttributes = factory.action.transfer.moneyTransfer.createAttributes({
            result: {
                price: transaction.object.price
            },
            object: {
            },
            agent: transaction.agent,
            recipient: transaction.recipient,
            amount: transaction.object.price,
            fromLocation: {
                typeOf: transaction.agent.typeOf,
                accountId: transaction.object.fromAccountId,
                name: transaction.agent.name
            },
            toLocation: {
                typeOf: transaction.recipient.typeOf,
                accountId: transaction.object.toAccountId,
                name: transaction.recipient.name
            },
            purpose: {
                typeOf: transaction.typeOf,
                id: transaction.id
            }
        });
        const potentialActions: factory.transaction.pay.IPotentialActions = {
            moneyTransfer: moneyTransferActionAttributes
        };

        // 取引確定
        await repos.transaction.confirmTransfer(transaction.id, {}, potentialActions);
    };
}

/**
 * ひとつの取引のタスクをエクスポートする
 */
export function exportTasks(status: factory.transactionStatusType) {
    return async (repos: {
        task: TaskRepository;
        transaction: TransactionRepo;
    }) => {
        const statusesTasksExportable = [factory.transactionStatusType.Expired, factory.transactionStatusType.Confirmed];
        if (statusesTasksExportable.indexOf(status) < 0) {
            throw new factory.errors.Argument('status', `transaction status should be in [${statusesTasksExportable.join(',')}]`);
        }

        const transaction = await repos.transaction.startExportTasks(factory.transactionType.Transfer, status);
        if (transaction === null) {
            return;
        }

        // 失敗してもここでは戻さない(RUNNINGのまま待機)
        await exportTasksById(transaction.id)(repos);

        await repos.transaction.setTasksExportedById(transaction.id);
    };
}

/**
 * ID指定で取引のタスク出力
 */
export function exportTasksById(transactionId: string): ITaskAndTransactionOperation<factory.task.ITask[]> {
    return async (repos: {
        task: TaskRepository;
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.findById(transactionId, factory.transactionType.Transfer);
        const potentialActions = transaction.potentialActions;

        const taskAttributes: factory.task.IAttributes[] = [];
        switch (transaction.status) {
            case factory.transactionStatusType.Confirmed:
                if (potentialActions !== undefined) {
                    if (potentialActions.moneyTransfer !== undefined) {
                        taskAttributes.push(factory.task.moneyTransfer.createAttributes({
                            status: factory.taskStatus.Ready,
                            runsAt: new Date(), // なるはやで実行
                            remainingNumberOfTries: 10,
                            lastTriedAt: null,
                            numberOfTried: 0,
                            executionResults: [],
                            data: {
                                actionAttributes: potentialActions.moneyTransfer
                            }
                        }));
                    }
                }

                break;

            // tslint:disable-next-line:no-suspicious-comment
            // TODO 期限切れの場合は、タスクリストを作成する
            case factory.transactionStatusType.Canceled:
            case factory.transactionStatusType.Expired:
                // taskAttributes.push(factory.task.cancelPayAction.createAttributes({
                //     status: factory.taskStatus.Ready,
                //     runsAt: new Date(), // なるはやで実行
                //     remainingNumberOfTries: 10,
                //     lastTriedAt: null,
                //     numberOfTried: 0,
                //     executionResults: [],
                //     data: {
                //         transactionId: transaction.id
                //     }
                // }));

                break;

            default:
                throw new factory.errors.NotImplemented(`Transaction status "${transaction.status}" not implemented.`);
        }
        debug('taskAttributes prepared', taskAttributes);

        return Promise.all(taskAttributes.map(async (taskAttribute) => {
            return repos.task.save(taskAttribute);
        }));
    };
}