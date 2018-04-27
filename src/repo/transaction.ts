import * as moment from 'moment';
import { Connection } from 'mongoose';

import TransactionModel from './mongoose/model/transaction';

import * as factory from '../factory';

/**
 * 取引Mongoリポジトリー
 */
export class MongoRepository {
    public readonly transactionModel: typeof TransactionModel;

    constructor(connection: Connection) {
        this.transactionModel = connection.model(TransactionModel.modelName);
    }

    /**
     * 取引を開始する
     */
    public async start<T extends factory.transactionType>(
        typeOf: T,
        params: factory.transaction.IStartParams<T>
    ): Promise<factory.transaction.ITransaction<T>> {
        return this.transactionModel.create({
            typeOf: typeOf,
            ...<Object>params,
            status: factory.transactionStatusType.InProgress,
            startDate: new Date(),
            endDate: undefined,
            tasksExportationStatus: factory.transactionTasksExportationStatus.Unexported
        }).then((doc) => doc.toObject());
    }

    /**
     * IDで取引を取得する
     * @param transactionId 取引ID
     */
    public async findById<T extends factory.transactionType>(
        typeOf: T,
        transactionId: string
    ): Promise<factory.transaction.ITransaction<T>> {
        const doc = await this.transactionModel.findOne({
            _id: transactionId,
            typeOf: typeOf
        }).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('transaction');
        }

        return doc.toObject();
    }

    /**
     * 進行中の取引を取得する
     */
    public async findInProgressById<T extends factory.transactionType>(
        typeOf: T,
        transactionId: string
    ): Promise<factory.transaction.ITransaction<T>> {
        const doc = await this.transactionModel.findOne({
            _id: transactionId,
            typeOf: typeOf,
            status: factory.transactionStatusType.InProgress
        }).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('transaction in progress');
        }

        return doc.toObject();
    }

    /**
     * 取引を確定する
     */
    public async confirm<T extends factory.transactionType>(
        typeOf: T,
        transactionId: string,
        result: factory.transaction.IResult<T>,
        potentialActions: factory.transaction.IPotentialActions<T>
    ): Promise<factory.transaction.ITransaction<T>> {
        const doc = await this.transactionModel.findOneAndUpdate(
            {
                _id: transactionId,
                typeOf: typeOf,
                status: factory.transactionStatusType.InProgress
            },
            {
                status: factory.transactionStatusType.Confirmed, // ステータス変更
                endDate: new Date(),
                result: result, // resultを更新
                potentialActions: potentialActions
            },
            { new: true }
        ).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('transaction in progress');
        }

        return doc.toObject();
    }

    /**
     * タスク未エクスポートの取引をひとつ取得してエクスポートを開始する
     * @param typeOf 取引タイプ
     * @param status 取引ステータス
     */
    public async startExportTasks<T extends factory.transactionType>(
        typeOf: T, status: factory.transactionStatusType
    ): Promise<factory.transaction.ITransaction<T> | null> {
        return this.transactionModel.findOneAndUpdate(
            {
                typeOf: typeOf,
                status: status,
                tasksExportationStatus: factory.transactionTasksExportationStatus.Unexported
            },
            { tasksExportationStatus: factory.transactionTasksExportationStatus.Exporting },
            { new: true }
        ).exec().then((doc) => (doc === null) ? null : doc.toObject());
    }

    /**
     * タスクエクスポートリトライ
     * todo updatedAtを基準にしているが、タスクエクスポートトライ日時を持たせた方が安全か？
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
    // public async searchPay(
    //     conditions: {
    //         startFrom: Date;
    //         startThrough: Date;
    //     }
    // ): Promise<factory.transaction.pay.ITransaction[]> {
    //     return this.transactionModel.find(
    //         {
    //             typeOf: factory.transactionType.Pay,
    //             startDate: {
    //                 $gte: conditions.startFrom,
    //                 $lte: conditions.startThrough
    //             }
    //         }
    //     ).exec()
    //         .then((docs) => docs.map((doc) => <factory.transaction.pay.ITransaction>doc.toObject()));
    // }
}
