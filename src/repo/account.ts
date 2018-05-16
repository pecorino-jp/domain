import * as createDebug from 'debug';
import { Connection } from 'mongoose';

import AccountModel from './mongoose/model/account';

import * as factory from '../factory';

const debug = createDebug('pecorino-domain:repository:account');

/**
 * 口座リポジトリー
 */
export class MongoRepository {
    public readonly accountModel: typeof AccountModel;

    constructor(connection: Connection) {
        this.accountModel = connection.model(AccountModel.modelName);
    }

    /**
     * 未開設であれば口座を開設する
     * @param params 口座開設初期設定
     */
    public async open(params: {
        name: string;
        accountNumber: string;
        initialBalance: number;
        openDate: Date;
    }): Promise<factory.account.IAccount> {
        debug('opening account...');
        const account: factory.account.IAccount = {
            typeOf: factory.account.AccountType.Account,
            id: '',
            accountNumber: params.accountNumber,
            name: params.name,
            balance: params.initialBalance,
            availableBalance: params.initialBalance,
            pendingTransactions: [],
            openDate: params.openDate,
            status: factory.accountStatusType.Opened
        };

        const doc = await this.accountModel.create(account);

        if (doc === null) {
            throw new factory.errors.NotFound('Account');
        }

        return doc.toObject();
    }

    /**
     * 口座を閉鎖する
     * @param params.accountNumber 口座番号
     */
    public async close(params: {
        accountNumber: string;
    }) {
        debug('closing account...');
        const doc = await this.accountModel.findOneAndUpdate(
            {
                accountNumber: params.accountNumber,
                pendingTransactions: { $size: 0 },
                status: factory.accountStatusType.Opened
            },
            {
                closeDate: new Date(),
                status: factory.accountStatusType.Closed
            },
            {
                upsert: true,
                new: true
            }
        ).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('Account');
        }
    }

    public async findByAccountNumber(accountNumber: string) {
        return this.accountModel.findOne({ accountNumber: accountNumber }).exec().then((doc) => {
            if (doc === null) {
                throw new factory.errors.NotFound('Account');
            }

            return <factory.account.IAccount>doc.toObject();
        });
    }

    /**
     * 金額を確保する
     * @param params.accountNumber 口座番号
     * @param params.amount 金額
     * @param params.transaction 進行取引
     * @see https://en.wikipedia.org/wiki/Authorization_hold
     */
    public async authorizeAmount(params: {
        accountNumber: string;
        amount: number;
        transaction: factory.account.IPendingTransaction;
    }) {
        const fromAccount = await this.accountModel.findOneAndUpdate(
            {
                accountNumber: params.accountNumber,
                availableBalance: { $gte: params.amount }
            },
            {
                $inc: { availableBalance: -params.amount }, // 残高を減らす
                $push: { pendingTransactions: params.transaction } // 進行中取引追加
            }
        ).exec();

        if (fromAccount === null) {
            throw new factory.errors.Argument('amount', 'Insufficient balance.');
        }
    }

    /**
     * 取引を開始する
     * @param params.accountNumber 口座番号
     * @param params.transaction 進行取引
     */
    public async startTransaction(params: {
        accountNumber: string;
        transaction: factory.account.IPendingTransaction;
    }) {
        const account = await this.accountModel.findOneAndUpdate(
            { accountNumber: params.accountNumber },
            { $push: { pendingTransactions: params.transaction } }
        ).exec();

        if (account === null) {
            throw new factory.errors.NotFound('Account');
        }
    }

    /**
     * 決済処理を実行する
     * 口座上で進行中の取引について、実際に金額移動処理を実行します。
     */
    public async settleTransaction(params: {
        fromAccountNumber?: string;
        toAccountNumber?: string;
        amount: number;
        transactionId: string;
    }) {
        // 転送元があれば残高調整
        if (params.fromAccountNumber !== undefined) {
            await this.accountModel.findOneAndUpdate(
                {
                    accountNumber: params.fromAccountNumber,
                    'pendingTransactions.id': params.transactionId
                },
                {
                    $inc: {
                        balance: -params.amount // 残高調整
                    },
                    $pull: { pendingTransactions: { id: params.transactionId } }
                }
            ).exec();
        }

        // 転送先へがあれば入金
        if (params.toAccountNumber !== undefined) {
            await this.accountModel.findOneAndUpdate(
                {
                    accountNumber: params.toAccountNumber,
                    'pendingTransactions.id': params.transactionId
                },
                {
                    $inc: {
                        balance: params.amount,
                        availableBalance: params.amount
                    },
                    $pull: { pendingTransactions: { id: params.transactionId } }
                }
            ).exec();
        }
    }

    /**
     * 取引を取り消す
     * 口座上で進行中の取引を中止します。
     * @see https://www.investopedia.com/terms/v/void-transaction.asp
     */
    public async voidTransaction(params: {
        fromAccountNumber?: string;
        toAccountNumber?: string;
        amount: number;
        transactionId: string;
    }) {
        // 転送元があればhold解除
        if (params.fromAccountNumber !== undefined) {
            await this.accountModel.findOneAndUpdate(
                {
                    accountNumber: params.fromAccountNumber,
                    'pendingTransactions.id': params.transactionId
                },
                {
                    $inc: {
                        availableBalance: params.amount // 残高調整
                    },
                    $pull: { pendingTransactions: { id: params.transactionId } }
                }
            ).exec();
        }

        // 転送先へがあれば進行中取引削除
        if (params.toAccountNumber !== undefined) {
            await this.accountModel.findOneAndUpdate(
                {
                    accountNumber: params.toAccountNumber,
                    'pendingTransactions.id': params.transactionId
                },
                {
                    $pull: { pendingTransactions: { id: params.transactionId } }
                }
            ).exec();
        }
    }

    /**
     * 口座を検索する
     * @param searchConditions 検索条件
     */
    public async search(searchConditions: {
        accountNumbers: string[];
        statuses: factory.accountStatusType[];
        /**
         * 口座名義
         */
        name?: string;
        limit: number;
    }): Promise<factory.account.IAccount[]> {
        const andConditions: any[] = [
            { typeOf: factory.account.AccountType.Account }
        ];

        if (Array.isArray(searchConditions.accountNumbers) && searchConditions.accountNumbers.length > 0) {
            andConditions.push({
                accountNumber: { $in: searchConditions.accountNumbers }
            });
        }

        if (Array.isArray(searchConditions.statuses) && searchConditions.statuses.length > 0) {
            andConditions.push({
                status: { $in: searchConditions.statuses }
            });
        }

        if (typeof searchConditions.name === 'string') {
            andConditions.push({
                name: new RegExp(searchConditions.name, 'gi')
            });
        }

        debug('finding accounts...', andConditions);

        return this.accountModel.find(
            { $and: andConditions },
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0,
                pendingTransactions: 0
            }
        )
            .sort({ accountNumber: 1 })
            .limit(searchConditions.limit)
            .exec()
            .then((docs) => docs.map((doc) => doc.toObject()));
    }
}
