import * as moment from 'moment';
import { Connection } from 'mongoose';

import TransactionModel from './mongoose/model/transaction';

import * as factory from '../factory';

/**
 * 取引リポジトリー
 */
export class MongoRepository {
    public readonly transactionModel: typeof TransactionModel;

    constructor(connection: Connection) {
        this.transactionModel = connection.model(TransactionModel.modelName);
    }
    /**
     * 取引を開始する
     */
    public async start<T extends factory.transactionType, T1 extends factory.account.AccountType>(
        typeOf: T,
        params: factory.transaction.IStartParams<T, T1>
    ): Promise<factory.transaction.ITransaction<T, T1>> {
        return this.transactionModel.create({
            typeOf: typeOf,
            ...<Object>params,
            status: factory.transactionStatusType.InProgress,
            startDate: new Date(),
            endDate: undefined,
            tasksExportationStatus: factory.transactionTasksExportationStatus.Unexported
        })
            .then((doc) => doc.toObject());
    }
    /**
     * 取引検索
     */
    public async findById<T extends factory.transactionType, T1 extends factory.account.AccountType>(
        typeOf: T,
        /**
         * 取引ID
         */
        transactionId: string
    ): Promise<factory.transaction.ITransaction<T, T1>> {
        const doc = await this.transactionModel.findOne({
            _id: transactionId,
            typeOf: typeOf
        })
            .exec();

        if (doc === null) {
            throw new factory.errors.NotFound('Transaction');
        }

        return doc.toObject();
    }
    /**
     * 取引を確定する
     */
    public async confirm<T extends factory.transactionType, T1 extends factory.account.AccountType>(
        typeOf: T,
        transactionId: string,
        result: factory.transaction.IResult<T>,
        potentialActions: factory.transaction.IPotentialActions<T, T1>
    ): Promise<factory.transaction.ITransaction<T, T1>> {
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
        )
            .exec();

        // NotFoundであれば取引状態確認
        if (doc === null) {
            const transaction = await this.findById<T, T1>(typeOf, transactionId);
            if (transaction.status === factory.transactionStatusType.Confirmed) {
                // すでに確定済の場合
                return transaction;
            } else if (transaction.status === factory.transactionStatusType.Expired) {
                throw new factory.errors.Argument('accountNumber', 'Transaction already expired');
            } else if (transaction.status === factory.transactionStatusType.Canceled) {
                throw new factory.errors.Argument('accountNumber', 'Transaction already canceled');
            } else {
                throw new factory.errors.NotFound('Transaction');
            }
        }

        return doc.toObject();
    }
    /**
     * 取引を中止する
     */
    public async cancel<T extends factory.transactionType, T1 extends factory.account.AccountType>(
        typeOf: T,
        transactionId: string
    ): Promise<factory.transaction.ITransaction<T, T1>> {
        // 進行中ステータスの取引を中止する
        const doc = await this.transactionModel.findOneAndUpdate(
            {
                typeOf: typeOf,
                _id: transactionId,
                status: factory.transactionStatusType.InProgress
            },
            {
                status: factory.transactionStatusType.Canceled,
                endDate: new Date()
            },
            { new: true }
        )
            .exec();

        // NotFoundであれば取引状態確認
        if (doc === null) {
            const transaction = await this.findById<T, T1>(typeOf, transactionId);
            if (transaction.status === factory.transactionStatusType.Canceled) {
                // すでに中止済の場合
                return transaction;
            } else if (transaction.status === factory.transactionStatusType.Expired) {
                throw new factory.errors.Argument('accountNumber', 'Transaction already expired');
            } else if (transaction.status === factory.transactionStatusType.Confirmed) {
                throw new factory.errors.Argument('accountNumber', 'Confirmed transaction unable to cancel');
            } else {
                throw new factory.errors.NotFound('Transaction');
            }
        }

        return doc.toObject();
    }
    /**
     * タスク未エクスポートの取引をひとつ取得してエクスポートを開始する
     * @param typeOf 取引タイプ
     * @param status 取引ステータス
     */
    public async startExportTasks<T extends factory.transactionType, T1 extends factory.account.AccountType>(
        typeOf: T, status: factory.transactionStatusType
    ): Promise<factory.transaction.ITransaction<T, T1> | null> {
        return this.transactionModel.findOneAndUpdate(
            {
                typeOf: typeOf,
                status: status,
                tasksExportationStatus: factory.transactionTasksExportationStatus.Unexported
            },
            { tasksExportationStatus: factory.transactionTasksExportationStatus.Exporting },
            { new: true }
        )
            .exec()
            // tslint:disable-next-line:no-null-keyword
            .then((doc) => (doc === null) ? null : doc.toObject());
    }
    /**
     * タスクエクスポートリトライ
     * todo updatedAtを基準にしているが、タスクエクスポートトライ日時を持たせた方が安全か？
     */
    public async reexportTasks(intervalInMinutes: number): Promise<void> {
        await this.transactionModel.findOneAndUpdate(
            {
                tasksExportationStatus: factory.transactionTasksExportationStatus.Exporting,
                updatedAt: {
                    $lt: moment()
                        .add(-intervalInMinutes, 'minutes')
                        .toISOString()
                }
            },
            {
                tasksExportationStatus: factory.transactionTasksExportationStatus.Unexported
            }
        )
            .exec();
    }
    /**
     * タスクをエクスポート済に変更する
     * @param transactionId transaction id
     */
    public async setTasksExportedById(transactionId: string): Promise<void> {
        await this.transactionModel.findByIdAndUpdate(
            transactionId,
            {
                tasksExportationStatus: factory.transactionTasksExportationStatus.Exported,
                tasksExportedAt: moment()
                    .toDate()
            }
        )
            .exec();
    }
    /**
     * 取引を期限切れにする
     */
    public async makeExpired(params: {
        expires: Date;
    }): Promise<void> {
        // ステータスと期限を見て更新
        await this.transactionModel.update(
            {
                status: factory.transactionStatusType.InProgress,
                expires: { $lt: params.expires }
            },
            {
                status: factory.transactionStatusType.Expired,
                endDate: new Date()
            },
            { multi: true }
        )
            .exec();
    }
    /**
     * 取引を検索する
     * @param conditions 検索条件
     */
    public async search<T extends factory.transactionType, T1 extends factory.account.AccountType>(params: {
        typeOf?: T;
        startFrom: Date;
        startThrough: Date;
    }): Promise<factory.transaction.ITransaction<T, T1>[]> {
        const conditions: any = {
            startDate: {
                $gte: params.startFrom,
                $lte: params.startThrough
            }
        };

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.typeOf !== undefined) {
            conditions.typeOf = params.typeOf;
        }

        return this.transactionModel.find(conditions)
            .exec()
            .then((docs) => docs.map((doc) => doc.toObject()));
    }
}
