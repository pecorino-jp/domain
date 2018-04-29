import { Connection } from 'mongoose';

import AccountModel from './mongoose/model/account';

import * as factory from '../factory';

/**
 * 口座リポジトリー
 */
export class MongoRepository {
    public readonly accountModel: typeof AccountModel;

    constructor(connection: Connection) {
        this.accountModel = connection.model(AccountModel.modelName);
    }

    public async findById(id: string) {
        return this.accountModel.findById(id).exec().then((doc) => {
            if (doc === null) {
                throw new factory.errors.NotFound('Account');
            }

            return <factory.account.IAccount>doc.toObject();
        });
    }

    /**
     * 金額を確保する
     * @param params.id 口座ID
     * @param params.amount 金額
     * @param params.transaction 進行取引
     * @see https://en.wikipedia.org/wiki/Authorization_hold
     */
    public async authorizeAmount(params: {
        id: string;
        amount: number;
        transaction: factory.account.IPendingTransaction;
    }) {
        const fromAccount = await this.accountModel.findOneAndUpdate(
            {
                _id: params.id,
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
     * @param params.id 口座ID
     * @param params.transaction 進行取引
     */
    public async startTransaction(params: {
        id: string;
        transaction: factory.account.IPendingTransaction;
    }) {
        const account = await this.accountModel.findOneAndUpdate(
            { _id: params.id },
            { $push: { pendingTransactions: params.transaction } }
        ).exec();

        if (account === null) {
            throw new factory.errors.NotFound('Account');
        }
    }

    /**
     * 決済処理を実行する
     */
    public async settleTransaction(params: {
        fromAccountId?: string;
        toAccountId?: string;
        amount: number;
        transactionId: string;
    }) {
        // 転送元があれば残高調整
        if (params.fromAccountId !== undefined) {
            await this.accountModel.findOneAndUpdate(
                {
                    _id: params.fromAccountId,
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
        if (params.toAccountId !== undefined) {
            await this.accountModel.findOneAndUpdate(
                {
                    _id: params.toAccountId,
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
     * @see https://www.investopedia.com/terms/v/void-transaction.asp
     */
    public async voidTransaction(params: {
        fromAccountId?: string;
        toAccountId?: string;
        amount: number;
        transactionId: string;
    }) {
        // 転送元があればhold解除
        if (params.fromAccountId !== undefined) {
            await this.accountModel.findOneAndUpdate(
                {
                    _id: params.fromAccountId,
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
        if (params.toAccountId !== undefined) {
            await this.accountModel.findOneAndUpdate(
                {
                    _id: params.toAccountId,
                    'pendingTransactions.id': params.transactionId
                },
                {
                    $pull: { pendingTransactions: { id: params.transactionId } }
                }
            ).exec();
        }
    }
}
