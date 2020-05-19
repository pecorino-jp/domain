/**
 * タスクファンクションサービス
 * タスク名ごとに、実行するファンクションをひとつずつ定義しています
 */
import * as mongoose from 'mongoose';

import * as factory from '../factory';

import { MongoRepository as AccountRepo } from '../repo/account';
import { MongoRepository as ActionRepo } from '../repo/action';
import { MongoRepository as TransactionRepo } from '../repo/transaction';

import * as AccountService from '../service/account';

export type IOperation<T> = (settings: {
    connection: mongoose.Connection;
}) => Promise<T>;

export function cancelMoneyTransfer(
    task: factory.task.cancelMoneyTransfer.ITask
): IOperation<void> {
    return async (settings: {
        connection: mongoose.Connection;
    }) => {
        const accountRepo = new AccountRepo(settings.connection);
        const actionRepo = new ActionRepo(settings.connection);
        const transactionRepo = new TransactionRepo(settings.connection);
        await AccountService.cancelMoneyTransfer({ transaction: task.data.transaction })({
            account: accountRepo,
            action: actionRepo,
            transaction: transactionRepo
        });
    };
}

export function moneyTransfer(
    task: factory.task.moneyTransfer.ITask
): IOperation<void> {
    return async (settings: {
        connection: mongoose.Connection;
    }) => {
        const accountRepo = new AccountRepo(settings.connection);
        const actionRepo = new ActionRepo(settings.connection);
        await AccountService.transferMoney(task.data.actionAttributes)({
            action: actionRepo,
            account: accountRepo
        });
    };
}

export function returnMoneyTransfer(task: factory.task.returnMoneyTransfer.ITask): IOperation<void> {
    return async (settings: {
        connection: mongoose.Connection;
    }) => {
        const accountRepo = new AccountRepo(settings.connection);
        const actionRepo = new ActionRepo(settings.connection);
        const transactionRepo = new TransactionRepo(settings.connection);
        await AccountService.returnMoneyTransfer(task)({
            account: accountRepo,
            action: actionRepo,
            transaction: transactionRepo
        });
    };
}
