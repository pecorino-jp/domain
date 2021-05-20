/**
 * 取引サービス
 */
import { MongoRepository as AccountTransactionRepo } from '../repo/accountTransaction';
import { MongoRepository as TaskRepository } from '../repo/task';

import * as factory from '../factory';

import * as DepositTransactionService from './accountTransaction/deposit';
import * as TransferTransactionService from './accountTransaction/transfer';
import * as WithdrawTransactionService from './accountTransaction/withdraw';

import { createMoneyTransferActionAttributes } from './accountTransaction/factory';

export type IConfirmOperation<T> = (repos: {
    accountTransaction: AccountTransactionRepo;
}) => Promise<T>;
export type ITaskAndTransactionOperation<T> = (repos: {
    task: TaskRepository;
    accountTransaction: AccountTransactionRepo;
}) => Promise<T>;

export import deposit = DepositTransactionService;
export import transfer = TransferTransactionService;
export import withdraw = WithdrawTransactionService;

/**
 * 取引確定
 */
export function confirm(params: {
    id?: string;
    transactionNumber?: string;
    typeOf: factory.account.transactionType;
}): IConfirmOperation<void> {
    return async (repos: {
        accountTransaction: AccountTransactionRepo;
    }) => {
        let transaction: factory.account.transaction.ITransaction<any>;

        // 取引存在確認
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (typeof params.id === 'string') {
            transaction = await repos.accountTransaction.findById(params.typeOf, params.id);
        } else if (typeof params.transactionNumber === 'string') {
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore next */
            transaction = await repos.accountTransaction.findByTransactionNumber({
                typeOf: params.typeOf,
                transactionNumber: params.transactionNumber
            });
        } else {
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore next */
            throw new factory.errors.ArgumentNull('Transaction ID or Transaction Number');
        }

        // 現金転送アクション属性作成
        const moneyTransferActionAttributes = createMoneyTransferActionAttributes({ transaction });
        const potentialActions: factory.account.transaction.IPotentialActions<typeof params.typeOf> = {
            moneyTransfer: moneyTransferActionAttributes
        };

        // 取引確定
        await repos.accountTransaction.confirm(transaction.typeOf, transaction.id, {}, potentialActions);
    };
}

/**
 * ひとつの取引のタスクをエクスポートする
 */
export function exportTasks(params: {
    status: factory.transactionStatusType;
    typeOf: factory.account.transactionType;
}) {
    return async (repos: {
        task: TaskRepository;
        accountTransaction: AccountTransactionRepo;
    }) => {
        const transaction = await repos.accountTransaction.startExportTasks(params.typeOf, params.status);
        if (transaction === null) {
            return;
        }

        // 失敗してもここでは戻さない(RUNNINGのまま待機)
        await exportTasksById({ id: transaction.id, typeOf: transaction.typeOf })(repos);

        await repos.accountTransaction.setTasksExportedById(transaction.id);
    };
}

/**
 * 取引のタスク出力
 */
export function exportTasksById(params: {
    id: string;
    typeOf: factory.account.transactionType;
}): ITaskAndTransactionOperation<factory.task.ITask<factory.taskName>[]> {
    return async (repos: {
        task: TaskRepository;
        accountTransaction: AccountTransactionRepo;
    }) => {
        const transaction = await repos.accountTransaction.findById(params.typeOf, params.id);
        const potentialActions = transaction.potentialActions;

        const taskAttributes: factory.task.IAttributes<factory.taskName>[] = [];
        switch (transaction.status) {
            case factory.transactionStatusType.Confirmed:
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore else */
                if (potentialActions !== undefined) {
                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore else */
                    if (potentialActions.moneyTransfer !== undefined) {
                        const moneyTransferTask: factory.task.accountMoneyTransfer.IAttributes = {
                            project: transaction.project,
                            name: factory.taskName.AccountMoneyTransfer,
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
                const cancelMoneyTransferTask: factory.task.cancelAccountMoneyTransfer.IAttributes = {
                    project: transaction.project,
                    name: factory.taskName.CancelAccountMoneyTransfer,
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
