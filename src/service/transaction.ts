/**
 * 取引サービス
 */
import { MongoRepository as TaskRepository } from '../repo/task';
import { MongoRepository as TransactionRepo } from '../repo/transaction';

import * as factory from '../factory';

import * as DepositTransactionService from './transaction/deposit';
import * as TransferTransactionService from './transaction/transfer';
import * as WithdrawTransactionService from './transaction/withdraw';

import { createMoneyTransferActionAttributes } from './transaction/factory';

export type IConfirmOperation<T> = (repos: {
    transaction: TransactionRepo;
}) => Promise<T>;
export type ITaskAndTransactionOperation<T> = (repos: {
    task: TaskRepository;
    transaction: TransactionRepo;
}) => Promise<T>;

export import deposit = DepositTransactionService;
export import transfer = TransferTransactionService;
export import withdraw = WithdrawTransactionService;

/**
 * 取引確定
 */
export function confirm(params: {
    id: string;
    typeOf: factory.transactionType;
}): IConfirmOperation<void> {
    return async (repos: {
        transaction: TransactionRepo;
    }) => {
        // 取引存在確認
        const transaction = await repos.transaction.findById(params.typeOf, params.id);

        // 現金転送アクション属性作成
        const moneyTransferActionAttributes = createMoneyTransferActionAttributes({ transaction });
        const potentialActions: factory.transaction.IPotentialActions<typeof params.typeOf> = {
            moneyTransfer: moneyTransferActionAttributes
        };

        // 取引確定
        await repos.transaction.confirm(transaction.typeOf, transaction.id, {}, potentialActions);
    };
}

/**
 * ひとつの取引のタスクをエクスポートする
 */
export function exportTasks(params: {
    status: factory.transactionStatusType;
    typeOf: factory.transactionType;
}) {
    return async (repos: {
        task: TaskRepository;
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.startExportTasks(params.typeOf, params.status);
        if (transaction === null) {
            return;
        }

        // 失敗してもここでは戻さない(RUNNINGのまま待機)
        await exportTasksById({ id: transaction.id, typeOf: transaction.typeOf })(repos);

        await repos.transaction.setTasksExportedById(transaction.id);
    };
}

/**
 * 取引のタスク出力
 */
export function exportTasksById(params: {
    id: string;
    typeOf: factory.transactionType;
}): ITaskAndTransactionOperation<factory.task.ITask[]> {
    return async (repos: {
        task: TaskRepository;
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.findById(params.typeOf, params.id);
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
                        const moneyTransferTask: factory.task.moneyTransfer.IAttributes = {
                            project: transaction.project,
                            name: factory.taskName.MoneyTransfer,
                            status: factory.taskStatus.Ready,
                            runsAt: new Date(), // なるはやで実行
                            remainingNumberOfTries: 10,
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
                    project: transaction.project,
                    name: factory.taskName.CancelMoneyTransfer,
                    status: factory.taskStatus.Ready,
                    runsAt: new Date(), // なるはやで実行
                    remainingNumberOfTries: 10,
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

        return Promise.all(taskAttributes.map(async (a) => repos.task.save(a)));
    };
}
