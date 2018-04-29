/**
 * 転送取引サービス
 */

import * as createDebug from 'debug';

import * as factory from '../../factory';
import { MongoRepository as AccountRepo } from '../../repo/account';
import { MongoRepository as TaskRepository } from '../../repo/task';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

const debug = createDebug('pecorino-domain:service:transaction:transfer');

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

/**
 * 取引開始
 */
export function start(
    params: factory.transaction.IStartParams<factory.transactionType.Transfer>
): IStartOperation<factory.transaction.transfer.ITransaction> {
    return async (repos: {
        account: AccountRepo;
        transaction: TransactionRepo;
    }) => {
        debug(`${params.agent.name} is starting transfer transaction... amount:${params.object.price}`);

        // 口座存在確認
        const fromAccount = await repos.account.findById(params.object.fromAccountId);
        const toAccount = await repos.account.findById(params.object.toAccountId);

        // 取引ファクトリーで新しい進行中取引オブジェクトを作成
        const startParams: factory.transaction.IStartParams<factory.transactionType.Transfer> = {
            typeOf: factory.transactionType.Transfer,
            agent: params.agent,
            recipient: params.recipient,
            object: {
                clientUser: params.object.clientUser,
                price: params.object.price,
                fromAccountId: fromAccount.id,
                toAccountId: toAccount.id,
                notes: params.object.notes
            },
            expires: params.expires
        };

        // 取引作成
        let transaction: factory.transaction.transfer.ITransaction;
        try {
            transaction = await repos.transaction.start(factory.transactionType.Transfer, startParams);
        } catch (error) {
            if (error.name === 'MongoError') {
                // no op
            }

            throw error;
        }

        const pendingTransaction: factory.account.IPendingTransaction = { typeOf: transaction.typeOf, id: transaction.id };

        // 残高確認
        await repos.account.authorizeAmount({
            id: params.object.fromAccountId,
            amount: params.object.price,
            transaction: pendingTransaction
        });

        // 転送先口座に進行中取引を追加
        await repos.account.startTransaction({
            id: params.object.toAccountId,
            transaction: pendingTransaction
        });

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
        const transaction = await repos.transaction.findInProgressById(factory.transactionType.Transfer, transactionId);

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
                typeOf: factory.account.AccountType.Account,
                id: transaction.object.fromAccountId,
                name: transaction.agent.name
            },
            toLocation: {
                typeOf: factory.account.AccountType.Account,
                id: transaction.object.toAccountId,
                name: transaction.recipient.name
            },
            purpose: {
                typeOf: transaction.typeOf,
                id: transaction.id
            }
        });
        const potentialActions: factory.transaction.transfer.IPotentialActions = {
            moneyTransfer: moneyTransferActionAttributes
        };

        // 取引確定
        await repos.transaction.confirm(factory.transactionType.Transfer, transaction.id, {}, potentialActions);
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
        const transaction = await repos.transaction.findById(factory.transactionType.Transfer, transactionId);
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

            case factory.transactionStatusType.Canceled:
            case factory.transactionStatusType.Expired:
                taskAttributes.push(factory.task.cancelMoneyTransfer.createAttributes({
                    status: factory.taskStatus.Ready,
                    runsAt: new Date(), // なるはやで実行
                    remainingNumberOfTries: 10,
                    lastTriedAt: null,
                    numberOfTried: 0,
                    executionResults: [],
                    data: {
                        transaction: { typeOf: transaction.typeOf, id: transaction.id }
                    }
                }));

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
