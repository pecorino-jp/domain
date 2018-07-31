/**
 * 支払取引サービス
 */
import * as createDebug from 'debug';

import * as factory from '../../factory';
import { MongoRepository as AccountRepo } from '../../repo/account';
import { MongoRepository as TaskRepository } from '../../repo/task';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

const debug = createDebug('pecorino-domain:*');

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
export function start<T extends factory.account.AccountType>(
    params: factory.transaction.IStartParams<factory.transactionType.Withdraw, T>
): IStartOperation<factory.transaction.withdraw.ITransaction<T>> {
    return async (repos: {
        account: AccountRepo;
        transaction: TransactionRepo;
    }) => {
        debug(`${params.agent.name} is starting withdraw transaction... amount:${params.object.amount}`);

        // 口座存在確認
        const account = await repos.account.findByAccountNumber<T>({
            accountType: params.object.accountType,
            accountNumber: params.object.fromAccountNumber
        });

        // 取引ファクトリーで新しい進行中取引オブジェクトを作成
        const startParams: factory.transaction.IStartParams<factory.transactionType.Withdraw, T> = {
            typeOf: factory.transactionType.Withdraw,
            agent: params.agent,
            recipient: params.recipient,
            object: {
                clientUser: params.object.clientUser,
                amount: params.object.amount,
                accountType: params.object.accountType,
                fromAccountNumber: account.accountNumber,
                notes: params.object.notes
            },
            expires: params.expires
        };

        // 取引作成
        let transaction: factory.transaction.withdraw.ITransaction<T>;
        try {
            transaction = await repos.transaction.start<factory.transactionType.Withdraw, T>(factory.transactionType.Withdraw, startParams);
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
        await repos.account.authorizeAmount<T>({
            accountType: params.object.accountType,
            accountNumber: params.object.fromAccountNumber,
            amount: params.object.amount,
            transaction: pendingTransaction
        });

        // 結果返却
        return transaction;
    };
}

/**
 * 取引確定
 */
export function confirm<T extends factory.account.AccountType>(params: {
    transactionId: string;
}): ITransactionOperation<factory.transaction.withdraw.IResult> {
    return async (repos: {
        transaction: TransactionRepo;
    }) => {
        debug(`confirming withdraw transaction ${params.transactionId}...`);

        // 取引存在確認
        const transaction = await repos.transaction.findById<factory.transactionType.Withdraw, T>(
            factory.transactionType.Withdraw, params.transactionId
        );

        // 現金転送アクション属性作成
        const moneyTransferActionAttributes: factory.action.transfer.moneyTransfer.IAttributes<T> = {
            typeOf: factory.actionType.MoneyTransfer,
            description: transaction.object.notes,
            result: {
                amount: transaction.object.amount
            },
            object: {
            },
            agent: transaction.agent,
            recipient: transaction.recipient,
            amount: transaction.object.amount,
            fromLocation: {
                typeOf: factory.account.TypeOf.Account,
                accountType: transaction.object.accountType,
                accountNumber: transaction.object.fromAccountNumber,
                name: transaction.agent.name
            },
            toLocation: {
                typeOf: transaction.recipient.typeOf,
                name: transaction.recipient.name
            },
            purpose: {
                typeOf: transaction.typeOf,
                id: transaction.id
            }
        };
        const potentialActions: factory.transaction.withdraw.IPotentialActions<T> = {
            moneyTransfer: moneyTransferActionAttributes
        };

        // 取引確定
        await repos.transaction.confirm(factory.transactionType.Withdraw, transaction.id, {}, potentialActions);
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
        const transaction = await repos.transaction.startExportTasks(factory.transactionType.Withdraw, status);
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
export function exportTasksById<T extends factory.account.AccountType>(
    transactionId: string
): ITaskAndTransactionOperation<factory.task.ITask[]> {
    return async (repos: {
        task: TaskRepository;
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.findById<factory.transactionType.Withdraw, T>(
            factory.transactionType.Withdraw, transactionId
        );
        const potentialActions = transaction.potentialActions;

        const taskAttributes: factory.task.IAttributes[] = [];
        switch (transaction.status) {
            case factory.transactionStatusType.Confirmed:
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore else */
                if (potentialActions !== undefined) {
                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore else */
                    if (potentialActions.moneyTransfer !== undefined) {
                        const moneyTransferTask: factory.task.moneyTransfer.IAttributes<T> = {
                            name: factory.taskName.MoneyTransfer,
                            status: factory.taskStatus.Ready,
                            runsAt: new Date(), // なるはやで実行
                            remainingNumberOfTries: 10,
                            lastTriedAt: null,
                            numberOfTried: 0,
                            executionResults: [],
                            data: {
                                actionAttributes: potentialActions.moneyTransfer
                            }
                        };
                        taskAttributes.push(moneyTransferTask);
                    }
                }
                break;

            case factory.transactionStatusType.Canceled:
            case factory.transactionStatusType.Expired:
                const cancelMoneyTransferTask: factory.task.cancelMoneyTransfer.IAttributes = {
                    name: factory.taskName.CancelMoneyTransfer,
                    status: factory.taskStatus.Ready,
                    runsAt: new Date(), // なるはやで実行
                    remainingNumberOfTries: 10,
                    lastTriedAt: null,
                    numberOfTried: 0,
                    executionResults: [],
                    data: {
                        transaction: { typeOf: transaction.typeOf, id: transaction.id }
                    }
                };
                taskAttributes.push(cancelMoneyTransferTask);
                break;

            default:
                throw new factory.errors.NotImplemented(`Transaction status "${transaction.status}" not implemented.`);
        }
        debug('taskAttributes prepared', taskAttributes);

        return Promise.all(taskAttributes.map(async (a) => repos.task.save(a)));
    };
}
