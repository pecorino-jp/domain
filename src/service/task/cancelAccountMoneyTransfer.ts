import * as factory from '../../factory';

import { MongoRepository as AccountRepo } from '../../repo/account';
import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

import * as AccountService from '../account';

import { IConnectionSettings, IOperation } from '../task';

export function call(data: factory.task.cancelAccountMoneyTransfer.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        const accountRepo = new AccountRepo(settings.connection);
        const actionRepo = new ActionRepo(settings.connection);
        const transactionRepo = new TransactionRepo(settings.connection);
        await AccountService.cancelMoneyTransfer(data)({
            account: accountRepo,
            action: actionRepo,
            transaction: transactionRepo
        });
    };
}
