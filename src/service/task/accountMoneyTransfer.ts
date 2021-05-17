import * as factory from '../../factory';

import { MongoRepository as AccountRepo } from '../../repo/account';
import { MongoRepository as AccountActionRepo } from '../../repo/accountAction';

import * as AccountService from '../account';

import { IConnectionSettings, IOperation } from '../task';

export function call(data: factory.task.accountMoneyTransfer.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        const accountRepo = new AccountRepo(settings.connection);
        const actionRepo = new AccountActionRepo(settings.connection);
        await AccountService.transferMoney(data.actionAttributes)({
            accountAction: actionRepo,
            account: accountRepo
        });
    };
}
