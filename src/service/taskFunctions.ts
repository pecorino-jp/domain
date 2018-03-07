/**
 * タスクファンクションサービス
 * タスク名ごとに、実行するファンクションをひとつずつ定義しています
 * @namespace service.taskFunctions
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
    __: factory.task.cancelMoneyTransfer.IData
): IOperation<void> {
    return async (__2: {
        connection: mongoose.Connection;
    }) => {
        // const accountRepo = new AccountRepo(settings.connection);
        // const transactionRepo = new TransactionRepo(settings.connection);
        // await AccountService.action.pay.cancel(data.transactionId)({
        //     account: accountRepo,
        //     transaction: transactionRepo
        // });
    };
}

export function moneyTransfer(
    data: factory.task.moneyTransfer.IData
): IOperation<void> {
    return async (settings: {
        connection: mongoose.Connection;
    }) => {
        const accountRepo = new AccountRepo(settings.connection);
        const actionRepo = new ActionRepo(settings.connection);
        const transactionRepo = new TransactionRepo(settings.connection);
        await AccountService.transferMoney(data.actionAttributes)({
            action: actionRepo,
            account: accountRepo,
            transaction: transactionRepo
        });
    };
}
