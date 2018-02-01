import * as moment from 'moment';
import { Connection } from 'mongoose';

import TransactionModel from './mongoose/model/transaction';

import * as factory from '../factory';

/**
 * transaction repository
 * @class
 */
export class MongoRepository {
    public readonly transactionModel: typeof TransactionModel;

    constructor(connection: Connection) {
        this.transactionModel = connection.model(TransactionModel.modelName);
    }

    public async startPay(
        transactionAttributes: factory.transaction.pay.IAttributes
    ): Promise<factory.transaction.pay.ITransaction> {
        return this.transactionModel.create(transactionAttributes).then(
            (doc) => <factory.transaction.pay.ITransaction>doc.toObject()
        );
    }

    /**
     * find pay transaction by id
     * @param {string} transactionId transaction id
     */
    public async findPayById(transactionId: string): Promise<factory.transaction.pay.ITransaction> {
        const doc = await this.transactionModel.findOne({
            _id: transactionId,
            typeOf: factory.transactionType.Pay
        }).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('transaction');
        }

        return <factory.transaction.pay.ITransaction>doc.toObject();
    }

    /**
     * 進行中の取引を取得する
     */
    public async findPayInProgressById(transactionId: string): Promise<factory.transaction.pay.ITransaction> {
        const doc = await this.transactionModel.findOne({
            _id: transactionId,
            typeOf: factory.transactionType.Pay,
            status: factory.transactionStatusType.InProgress
        }).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('transaction in progress');
        }

        return <factory.transaction.pay.ITransaction>doc.toObject();
    }

    /**
     * confirm a pay
     * 注文取引を確定する
     * @param {string} transactionId transaction id
     * @param {Date} endDate end date
     * @param {factory.action.authorize.IAction[]} authorizeActions authorize actions
     * @param {factory.transaction.pay.IResult} result transaction result
     */
    public async confirmPay(
        transactionId: string,
        endDate: Date,
        result: factory.transaction.pay.IResult
    ): Promise<factory.transaction.pay.ITransaction> {
        const doc = await this.transactionModel.findOneAndUpdate(
            {
                _id: transactionId,
                typeOf: factory.transactionType.Pay,
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

        return <factory.transaction.pay.ITransaction>doc.toObject();
    }

    /**
     * find transaction by id
     * @param {string} transactionId transaction id
     */
    public async findById(transactionId: string): Promise<factory.transaction.ITransaction> {
        const doc = await this.transactionModel.findById(transactionId).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('transaction');
        }

        return <factory.transaction.ITransaction>doc.toObject();
    }

    /**
     * タスクエクスポートリトライ
     * todo updatedAtを基準にしているが、タスクエクスポートトライ日時を持たせた方が安全か？
     * @param {number} intervalInMinutes
     */
    public async reexportTasks(intervalInMinutes: number): Promise<void> {
        await this.transactionModel.findOneAndUpdate(
            {
                tasksExportationStatus: factory.transactionTasksExportationStatus.Exporting,
                updatedAt: { $lt: moment().add(-intervalInMinutes, 'minutes').toISOString() }
            },
            {
                tasksExportationStatus: factory.transactionTasksExportationStatus.Unexported
            }
        ).exec();
    }

    /**
     * set task status exported by transaction id
     * IDでタスクをエクスポート済に変更する
     * @param transactionId transaction id
     */
    public async setTasksExportedById(transactionId: string) {
        await this.transactionModel.findByIdAndUpdate(
            transactionId,
            {
                tasksExportationStatus: factory.transactionTasksExportationStatus.Exported,
                tasksExportedAt: moment().toDate()
            }
        ).exec();
    }

    /**
     * 取引を期限切れにする
     */
    public async makeExpired(): Promise<void> {
        const endDate = moment().toDate();

        // ステータスと期限を見て更新
        await this.transactionModel.update(
            {
                status: factory.transactionStatusType.InProgress,
                expires: { $lt: endDate }
            },
            {
                status: factory.transactionStatusType.Expired,
                endDate: endDate
            },
            { multi: true }
        ).exec();
    }

    /**
     * 注文取引を検索する
     * @param conditions 検索条件
     */
    public async searchPay(
        conditions: {
            startFrom: Date;
            startThrough: Date;
        }
    ): Promise<factory.transaction.pay.ITransaction[]> {
        return this.transactionModel.find(
            {
                typeOf: factory.transactionType.Pay,
                startDate: {
                    $gte: conditions.startFrom,
                    $lte: conditions.startThrough
                }
            }
        ).exec()
            .then((docs) => docs.map((doc) => <factory.transaction.pay.ITransaction>doc.toObject()));
    }
}
