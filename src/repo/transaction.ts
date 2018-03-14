import * as moment from 'moment';
import { Connection } from 'mongoose';

import TransactionModel from './mongoose/model/transaction';

import * as factory from '../factory';

export type ITransactionAttributes =
    factory.transaction.pay.IAttributes |
    factory.transaction.transfer.IAttributes |
    factory.transaction.deposit.IAttributes;

export type ITransaction =
    factory.transaction.pay.ITransaction |
    factory.transaction.transfer.ITransaction |
    factory.transaction.deposit.ITransaction;

/**
 * transaction repository
 */
export class MongoRepository {
    public readonly transactionModel: typeof TransactionModel;

    constructor(connection: Connection) {
        this.transactionModel = connection.model(TransactionModel.modelName);
    }

    /**
     * 取引を開始する
     * @param transactionAttributes 取引属性
     */
    public async start<T extends ITransaction>(
        transactionAttributes: ITransactionAttributes
    ): Promise<T> {
        return this.transactionModel.create({
            ...transactionAttributes,
            status: factory.transactionStatusType.InProgress,
            startDate: new Date(),
            endDate: undefined,
            tasksExportationStatus: factory.transactionTasksExportationStatus.Unexported
        }).then(
            (doc) => <T>doc.toObject()
        );
    }

    /**
     * IDで取引を取得する
     * @param transactionId 取引ID
     */
    public async findById<T extends ITransaction>(
        transactionId: string,
        typeOf: factory.transactionType
    ): Promise<T> {
        const doc = await this.transactionModel.findOne({
            _id: transactionId,
            typeOf: typeOf
        }).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('transaction');
        }

        return <T>doc.toObject();
    }

    /**
     * 進行中の取引を取得する
     */
    public async findInProgressById<T extends ITransaction>(
        typeOf: factory.transactionType, transactionId: string
    ): Promise<T> {
        const doc = await this.transactionModel.findOne({
            _id: transactionId,
            typeOf: typeOf,
            status: factory.transactionStatusType.InProgress
        }).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('transaction in progress');
        }

        return <T>doc.toObject();
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
     * 進行中の入金取引を取得する
     */
    public async findDepositInProgressById(transactionId: string): Promise<factory.transaction.deposit.ITransaction> {
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
     * 支払取引を確定する
     */
    public async confirmPay(
        transactionId: string,
        result: factory.transaction.pay.IResult,
        potentialActions: factory.transaction.pay.IPotentialActions
    ): Promise<factory.transaction.pay.ITransaction> {
        const doc = await this.transactionModel.findOneAndUpdate(
            {
                _id: transactionId,
                typeOf: factory.transactionType.Pay,
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

        return <factory.transaction.pay.ITransaction>doc.toObject();
    }

    /**
     * 入金取引を確定する
     */
    public async confirmDeposit(
        transactionId: string,
        result: factory.transaction.deposit.IResult,
        potentialActions: factory.transaction.deposit.IPotentialActions
    ): Promise<factory.transaction.deposit.ITransaction> {
        const doc = await this.transactionModel.findOneAndUpdate(
            {
                _id: transactionId,
                typeOf: factory.transactionType.Deposit,
                status: factory.transactionStatusType.InProgress
            },
            {
                status: factory.transactionStatusType.Confirmed, // ステータス変更
                endDate: new Date(),
                result: result,
                potentialActions: potentialActions
            },
            { new: true }
        ).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('transaction in progress');
        }

        return <factory.transaction.deposit.ITransaction>doc.toObject();
    }

    /**
     * 転送取引を確定する
     */
    public async confirmTransfer(
        transactionId: string,
        result: factory.transaction.transfer.IResult,
        potentialActions: factory.transaction.transfer.IPotentialActions
    ): Promise<factory.transaction.transfer.ITransaction> {
        const doc = await this.transactionModel.findOneAndUpdate(
            {
                _id: transactionId,
                typeOf: factory.transactionType.Transfer,
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

        return <factory.transaction.transfer.ITransaction>doc.toObject();
    }

    /**
     * タスク未エクスポートの取引をひとつ取得してエクスポートを開始する
     * @param typeOf 取引タイプ
     * @param status 取引ステータス
     */
    public async startExportTasks(typeOf: factory.transactionType, status: factory.transactionStatusType):
        Promise<ITransaction | null> {
        return this.transactionModel.findOneAndUpdate(
            {
                typeOf: typeOf,
                status: status,
                tasksExportationStatus: factory.transactionTasksExportationStatus.Unexported
            },
            { tasksExportationStatus: factory.transactionTasksExportationStatus.Exporting },
            { new: true }
        ).exec().then((doc) => (doc === null) ? null : <ITransaction>doc.toObject());
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
