import * as factory from '../../factory';

import { MongoRepository as AccountRepo } from '../../repo/account';
import { MongoRepository as AccountActionRepo } from '../../repo/accountAction';
import { MongoRepository as AccountTransactionRepo } from '../../repo/accountTransaction';

import * as AccountService from '../account';

import { IConnectionSettings, IOperation } from '../task';

export function call(data: factory.task.cancelAccountMoneyTransfer.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        const accountRepo = new AccountRepo(settings.connection);
        const actionRepo = new AccountActionRepo(settings.connection);
        const transactionRepo = new AccountTransactionRepo(settings.connection);
        await AccountService.cancelMoneyTransfer(data)({
            account: accountRepo,
            accountAction: actionRepo,
            accountTransaction: transactionRepo
        });
    };
}
