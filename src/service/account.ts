/**
 * 口座サービス
 * 開設、閉鎖等、口座に対するアクションを定義します。
 * @namespace account
 */

import * as createDebug from 'debug';

import * as factory from '../factory';

import { MongoRepository as AccountRepo } from '../repo/account';
import { MongoRepository as ActionRepo } from '../repo/action';
import { MongoRepository as TransactionRepo } from '../repo/transaction';

const debug = createDebug('pecorino-domain:service:account');

export type IAccountOperation<T> = (repos: { account: AccountRepo }) => Promise<T>;
export type IActionRepo<T> = (repos: { action: ActionRepo }) => Promise<T>;

/**
 * 口座を開設する
 * @param params 口座開設初期設定
 */
export function open(params: {
    id: string;
    name: string;
    initialBalance: number;
}): IAccountOperation<factory.account.IAccount> {
    return async (repos: { account: AccountRepo }) => {
        debug('opening account...');
        const account: factory.account.IAccount = {
            typeOf: factory.account.AccountType.Account,
            id: params.id,
            name: params.name,
            balance: params.initialBalance,
            safeBalance: params.initialBalance,
            pendingTransactions: [],
            openDate: new Date(),
            status: 'status'
        };

        // no op
        await repos.account.accountModel.create({ ...account, _id: account.id });

        return account;
    };
}

export function close() {
    return () => {
        // no op
    };
}

export interface ISearchConditions {
    accountId: string;
}

/**
 * 取引履歴を検索する
 * @param searchConditions 検索条件
 */
export function searchTransferActions(searchConditions: ISearchConditions): IActionRepo<factory.action.transfer.moneyTransfer.IAction[]> {
    return async (repos: { action: ActionRepo }) => {
        const LIMIT = 100;

        return repos.action.actionModel.find({
            $or: [
                {
                    typeOf: factory.actionType.MoneyTransfer,
                    'fromLocation.typeOf': factory.account.AccountType.Account,
                    'fromLocation.id': searchConditions.accountId
                },
                {
                    typeOf: factory.actionType.MoneyTransfer,
                    'toLocation.typeOf': factory.account.AccountType.Account,
                    'toLocation.id': searchConditions.accountId
                }
            ]
        }).sort({ endDate: 1 }).limit(LIMIT)
            .exec().then((docs) => docs.map((doc) => <factory.action.transfer.moneyTransfer.IAction>doc.toObject()));
    };
}

/**
 * 現金転送
 */
export function transferMoney(actionAttributes: factory.action.transfer.moneyTransfer.IAttributes) {
    return async (repos: {
        action: ActionRepo;
        account: AccountRepo;
        transaction: TransactionRepo;
    }) => {
        debug(`transfering money... ${actionAttributes.purpose.typeOf} ${actionAttributes.purpose.id}`);

        type IMoneyTransferAction = factory.action.transfer.moneyTransfer.IAction;

        // アクション開始
        const action = await repos.action.start<IMoneyTransferAction>(actionAttributes);

        try {
            // 取引存在確認
            const transaction = await repos.transaction.findById(actionAttributes.purpose.id, actionAttributes.purpose.typeOf);

            // 転送元があれば残高調整
            if (actionAttributes.fromLocation.typeOf === factory.account.AccountType.Account) {
                await repos.account.accountModel.findOneAndUpdate(
                    {
                        _id: (<factory.action.transfer.moneyTransfer.IAccount>actionAttributes.fromLocation).id,
                        'pendingTransactions.id': transaction.id
                    },
                    {
                        $inc: {
                            balance: -actionAttributes.amount // 残高調整
                        },
                        $pull: {
                            pendingTransactions: { id: transaction.id } // 進行中取引削除
                        }
                    }
                ).exec();
            }

            // 転送先へがあれば入金
            if (actionAttributes.toLocation.typeOf === factory.account.AccountType.Account) {
                await repos.account.accountModel.findOneAndUpdate(
                    {
                        _id: (<factory.action.transfer.moneyTransfer.IAccount>actionAttributes.toLocation).id,
                        'pendingTransactions.id': transaction.id
                    },
                    {
                        $inc: {
                            balance: actionAttributes.amount,
                            safeBalance: actionAttributes.amount
                        },
                        $pull: {
                            pendingTransactions: { id: transaction.id } // 進行中取引削除
                        }
                    }
                ).exec();
            }
        } catch (error) {
            // actionにエラー結果を追加
            try {
                // tslint:disable-next-line:max-line-length no-single-line-block-comment
                const actionError = (error instanceof Error) ? { ...error, ...{ message: error.message } } : /* istanbul ignore next */ error;
                await repos.action.giveUp(action.typeOf, action.id, actionError);
            } catch (__) {
                // 失敗したら仕方ない
            }

            throw new Error(error);
        }

        // アクション完了
        debug('ending action...');
        const actionResult: factory.action.transfer.moneyTransfer.IResult = {};
        await repos.action.complete(action.typeOf, action.id, actionResult);
    };
}
