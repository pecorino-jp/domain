/**
 * タスクファンクションサービス
 * タスク名ごとに、実行するファンクションをひとつずつ定義しています
 * @namespace service.taskFunctions
 */

import * as mongoose from 'mongoose';

import * as factory from '../factory';

import { MongoRepository as AccountRepo } from '../repo/account';
import { MongoRepository as PayActionRepo } from '../repo/action/trade/pay';
import { MongoRepository as TransactionRepo } from '../repo/transaction';

import * as AccountService from '../service/account';

export type IOperation<T> = (connection: mongoose.Connection) => Promise<T>;

export function cancelPayAction(
    data: factory.task.cancelPayAction.IData
): IOperation<void> {
    return async (connection: mongoose.Connection) => {
        const accountRepo = new AccountRepo(connection);
        const transactionRepo = new TransactionRepo(connection);
        await AccountService.action.pay.cancel(data.transactionId)(accountRepo, transactionRepo);
    };
}

export function executePayAction(
    data: factory.task.executePayAction.IData
): IOperation<void> {
    return async (connection: mongoose.Connection) => {
        const accountRepo = new AccountRepo(connection);
        const actionRepo = new PayActionRepo(connection);
        const transactionRepo = new TransactionRepo(connection);
        await AccountService.action.pay.execute(data.transactionId)(actionRepo, accountRepo, transactionRepo);
    };
}
