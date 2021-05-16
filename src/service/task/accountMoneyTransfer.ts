import * as factory from '../../factory';

import { MongoRepository as AccountRepo } from '../../repo/account';
import { MongoRepository as ActionRepo } from '../../repo/action';

import * as AccountService from '../account';

import { IConnectionSettings, IOperation } from '../task';

export function call(data: factory.task.accountMoneyTransfer.IData): IOperation<void> {
    return async (settings: IConnectionSettings) => {
        const accountRepo = new AccountRepo(settings.connection);
        const actionRepo = new ActionRepo(settings.connection);
        await AccountService.transferMoney(data.actionAttributes)({
            action: actionRepo,
            account: accountRepo
        });
    };
}
