import { Connection } from 'mongoose';

import TransactionModel from '../mongoose/model/transaction';

import * as factory from '../../factory';

/**
 * 入金取引リポジトリー
 * @class
 */
export class MongoRepository {
    public readonly transactionModel: typeof TransactionModel;

    constructor(connection: Connection) {
        this.transactionModel = connection.model(TransactionModel.modelName);
    }

    public async start(
        transactionAttributes: factory.transaction.deposit.IAttributes
    ): Promise<factory.transaction.deposit.ITransaction> {
        return this.transactionModel.create(transactionAttributes).then(
            (doc) => <factory.transaction.deposit.ITransaction>doc.toObject()
        );
    }

    /**
     * find deposit transaction by id
     * @param {string} transactionId transaction id
     */
    public async findById(transactionId: string): Promise<factory.transaction.deposit.ITransaction> {
        const doc = await this.transactionModel.findOne({
            _id: transactionId,
            typeOf: factory.transactionType.Deposit
        }).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('transaction');
        }

        return <factory.transaction.deposit.ITransaction>doc.toObject();
    }

    /**
     * 進行中の取引を取得する
     */
    public async findInProgressById(transactionId: string): Promise<factory.transaction.deposit.ITransaction> {
        const doc = await this.transactionModel.findOne({
            _id: transactionId,
            typeOf: factory.transactionType.Deposit,
            status: factory.transactionStatusType.InProgress
        }).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('transaction in progress');
        }

        return <factory.transaction.deposit.ITransaction>doc.toObject();
    }

    /**
     * confirm a deposit
     * 注文取引を確定する
     * @param {string} transactionId transaction id
     * @param {Date} endDate end date
     * @param {factory.action.authorize.IAction[]} authorizeActions authorize actions
     * @param {factory.transaction.deposit.IResult} result transaction result
     */
    public async confirm(
        transactionId: string,
        endDate: Date,
        result: factory.transaction.deposit.IResult
    ): Promise<factory.transaction.deposit.ITransaction> {
        const doc = await this.transactionModel.findOneAndUpdate(
            {
                _id: transactionId,
                typeOf: factory.transactionType.Deposit,
                status: factory.transactionStatusType.InProgress
            },
            {
                status: factory.transactionStatusType.Confirmed, // ステータス変更
                endDate: endDate,
                result: result // resultを更新
            },
            { new: true }
        ).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('transaction in progress');
        }

        return <factory.transaction.deposit.ITransaction>doc.toObject();
    }

    /**
     * 入金取引を検索する
     * @param conditions 検索条件
     */
    public async search(
        conditions: {
            startFrom: Date;
            startThrough: Date;
        }
    ): Promise<factory.transaction.deposit.ITransaction[]> {
        return this.transactionModel.find(
            {
                typeOf: factory.transactionType.Deposit,
                startDate: {
                    $gte: conditions.startFrom,
                    $lte: conditions.startThrough
                }
            }
        ).exec()
            .then((docs) => docs.map((doc) => <factory.transaction.deposit.ITransaction>doc.toObject()));
    }
}
