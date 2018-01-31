/**
 * 口座サービス
 * 開設、閉鎖等、口座に対するアクションを定義します。
 * @namespace account
 */

import * as createDebug from 'debug';

import * as factory from '../factory';

import { MongoRepository as AccountRepo } from '../repo/account';
import { MongoRepository as ActionRepo } from '../repo/action';

import * as PayActionService from './account/action/pay';

const debug = createDebug('pecorino-domain:service:account');

export type IAccountOperation<T> = (accountRepo: AccountRepo) => Promise<T>;
export type IActionRepo<T> = (actionRepo: ActionRepo) => Promise<T>;
export type ITradeAction = factory.action.trade.IAction;

export function open() {
    return async (accountRepo: AccountRepo) => {
        debug('opening account...');
        const account: factory.account.IAccount = {
            id: 'accountId',
            name: 'accountName',
            balance: 999999,
            safeBalance: 999999,
            pendingTransactions: [],
            openDate: new Date(),
            status: 'status'
        };

        // no op
        await accountRepo.accountModel.create({ ...account, _id: account.id });

        return account;
    };
}

export function close() {
    return () => {
        // no op
    };
}

export namespace action {
    export import pay = PayActionService;
}

export interface ISearchConditions {
    accountId: string;
}

/**
 * 取引履歴を検索する
 * @param searchConditions 検索条件
 */
export function searchTradeActionsById(searchConditions: ISearchConditions): IActionRepo<ITradeAction[]> {
    return async (actionRepo: ActionRepo) => {
        return actionRepo.actionModel.find({
            // typeOf: '',
            'object.accountId': searchConditions.accountId
        }).sort({ endDate: 1 }).exec().then((docs) => docs.map((doc) => <ITradeAction>doc.toObject()));
    };
}
