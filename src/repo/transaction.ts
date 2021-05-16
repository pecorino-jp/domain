import * as moment from 'moment';
import { Connection } from 'mongoose';

import TransactionModel from './mongoose/model/transaction';

import * as factory from '../factory';

/**
 * 取引リポジトリ
 */
export class MongoRepository {
    public readonly transactionModel: typeof TransactionModel;

    constructor(connection: Connection) {
        this.transactionModel = connection.model(TransactionModel.modelName);
    }

    /**
     * 取引を開始する
     */
    public async start<T extends factory.account.transactionType>(
        typeOf: T,
        params: factory.account.transaction.IStartParams<T>
    ): Promise<factory.account.transaction.ITransaction<T>> {
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

    public async startByIdentifier<T extends factory.account.transactionType>(
        typeOf: T,
        params: factory.account.transaction.IStartParams<T>
    ): Promise<factory.account.transaction.ITransaction<T>> {
        const startDate = new Date();

        if (typeof params.identifier === 'string' && params.identifier.length > 0) {
            return this.transactionModel.findOneAndUpdate(
                {
                    identifier: {
                        $exists: true,
                        $eq: params.identifier
                    },
                    status: {
                        // InProgress,Confirmedについては、identifierで取引のユニークネスが保証されるように
                        $in: [factory.transactionStatusType.InProgress, factory.transactionStatusType.Confirmed]
                    }
                },
                {
                    $setOnInsert: {
                        typeOf: typeOf,
                        ...<Object>params,
                        status: factory.transactionStatusType.InProgress,
                        startDate: startDate,
                        endDate: undefined,
                        tasksExportationStatus: factory.transactionTasksExportationStatus.Unexported
                    }
                },
                {
                    new: true,
                    upsert: true
                }
            )
                .exec()
                .then((doc) => {
                    if (doc === null) {
                        throw new factory.errors.NotFound(this.transactionModel.modelName);
                    }

                    // 以前に開始した取引であればエラー
                    const transaction = <factory.account.transaction.ITransaction<T>>doc.toObject();
                    if (transaction.status === factory.transactionStatusType.Confirmed) {
                        throw new factory.errors.Argument('identifier', 'already confirmed');
                    }

                    if (!moment(transaction.startDate)
                        .isSame(startDate)) {
                        throw new factory.errors.Argument('identifier', 'another transaction in progress');
                    }

                    return doc.toObject();
                });
        } else {
            return this.start(typeOf, params);
        }
    }

    /**
     * 取引検索
     */
    public async findById<T extends factory.account.transactionType>(
        typeOf: T,
        /**
         * 取引ID
         */
        transactionId: string
    ): Promise<factory.account.transaction.ITransaction<T>> {
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

    // tslint:disable-next-line:no-single-line-block-comment
    /* istanbul ignore next */
    public async findByTransactionNumber<T extends factory.account.transactionType>(params: {
        typeOf: T;
        transactionNumber: string;
    }): Promise<factory.account.transaction.ITransaction<T>> {
        const doc = await this.transactionModel.findOne({
            transactionNumber: { $exists: true, $eq: params.transactionNumber },
            typeOf: params.typeOf
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
    public async confirm<T extends factory.account.transactionType>(
        typeOf: T,
        transactionId: string,
        result: factory.account.transaction.IResult<T>,
        potentialActions: factory.account.transaction.IPotentialActions<T>
    ): Promise<factory.account.transaction.ITransaction<T>> {
        const doc = await this.transactionModel.findOneAndUpdate(
            {
                _id: transactionId,
                typeOf: typeOf,
                status: factory.transactionStatusType.InProgress
            },
            {
                status: factory.transactionStatusType.Confirmed,
                endDate: new Date(),
                result: result, // resultを更新
                potentialActions: potentialActions
            },
            { new: true }
        )
            .exec();

        // NotFoundであれば取引状態確認
        if (doc === null) {
            const transaction = await this.findById<T>(typeOf, transactionId);
            if (transaction.status === factory.transactionStatusType.Confirmed) {
                return transaction;
            } else {
                throw new factory.errors.Argument('transactionId', `Transaction ${transaction.status}`);
            }
        }

        return doc.toObject();
    }

    /**
     * 取引を中止する
     */
    public async cancel<T extends factory.account.transactionType>(params: {
        typeOf: T;
        id?: string;
        transactionNumber?: string;
    }): Promise<factory.account.transaction.ITransaction<T>> {
        // 進行中ステータスの取引を中止する
        const doc = await this.transactionModel.findOneAndUpdate(
            {
                typeOf: params.typeOf,
                ...(typeof params.id === 'string') ? { _id: params.id } : /* istanbul ignore next */ undefined,
                ...(typeof params.transactionNumber === 'string')
                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore next */
                    ? { transactionNumber: { $exists: true, $eq: params.transactionNumber } }
                    : undefined,
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
            let transaction: factory.account.transaction.ITransaction<T>;
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (typeof params.id === 'string') {
                transaction = await this.findById<T>(params.typeOf, params.id);
            } else if (typeof params.transactionNumber === 'string') {
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore next */
                transaction = await this.findByTransactionNumber<T>({
                    typeOf: params.typeOf,
                    transactionNumber: params.transactionNumber
                });
            } else {
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore next */
                throw new factory.errors.ArgumentNull('Transaction ID or Transaction Number');
            }

            if (transaction.status === factory.transactionStatusType.Canceled) {
                return transaction;
            } else {
                throw new factory.errors.Argument('transactionId', `Transaction ${transaction.status}`);
            }
        }

        return doc.toObject();
    }

    /**
     * 取引を返金する
     */
    public async returnMoneyTransfer<T extends factory.account.transactionType>(params: {
        typeOf: T;
        id?: string;
        transactionNumber?: string;
    }): Promise<factory.account.transaction.ITransaction<T>> {
        // 進行中ステータスの取引を中止する
        const doc = await this.transactionModel.findOneAndUpdate(
            {
                typeOf: params.typeOf,
                ...(typeof params.id === 'string') ? { _id: params.id } : /* istanbul ignore next */ undefined,
                ...(typeof params.transactionNumber === 'string')
                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore next */
                    ? { transactionNumber: { $exists: true, $eq: params.transactionNumber } }
                    : undefined,
                status: factory.transactionStatusType.Confirmed
            },
            {
                status: factory.transactionStatusType.Returned,
                dateReturned: new Date()
            },
            { new: true }
        )
            .exec();

        // NotFoundであれば取引状態確認
        if (doc === null) {
            let transaction: factory.account.transaction.ITransaction<T>;
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (typeof params.id === 'string') {
                transaction = await this.findById<T>(params.typeOf, params.id);
            } else if (typeof params.transactionNumber === 'string') {
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore next */
                transaction = await this.findByTransactionNumber<T>({
                    typeOf: params.typeOf,
                    transactionNumber: params.transactionNumber
                });
            } else {
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore next */
                throw new factory.errors.ArgumentNull('Transaction ID or Transaction Number');
            }

            if (transaction.status === factory.transactionStatusType.Returned) {
                return transaction;
            } else {
                throw new factory.errors.Argument('transactionId', `Transaction ${transaction.status}`);
            }
        }

        return doc.toObject();
    }

    /**
     * タスク未エクスポートの取引をひとつ取得してエクスポートを開始する
     */
    public async startExportTasks<T extends factory.account.transactionType>(
        typeOf: T, status: factory.transactionStatusType
    ): Promise<factory.account.transaction.ITransaction<T> | null> {
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
     */
    public async search<T extends factory.account.transactionType>(params: {
        typeOf?: T;
        startFrom: Date;
        startThrough: Date;
    }): Promise<factory.account.transaction.ITransaction<T>[]> {
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
