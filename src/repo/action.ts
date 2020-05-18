import * as createDebug from 'debug';
import { Connection } from 'mongoose';

import * as factory from '../factory';
import ActionModel from './mongoose/model/action';

const debug = createDebug('pecorino-domain:repository');

export type IAction<T extends factory.actionType> =
    T extends factory.actionType.MoneyTransfer ? factory.action.transfer.moneyTransfer.IAction :
    factory.action.IAction<factory.action.IAttributes<any, any>>;

/**
 * アクションリポジトリ
 */
export class MongoRepository {
    public readonly actionModel: typeof ActionModel;

    constructor(connection: Connection) {
        this.actionModel = connection.model(ActionModel.modelName);
    }

    // tslint:disable-next-line:max-func-body-length
    public static CREATE_MONEY_TRANSFER_ACTIONS_MONGO_CONDITIONS(
        params: factory.action.transfer.moneyTransfer.ISearchConditions
    ) {
        const andConditions: any[] = [
            { typeOf: factory.actionType.MoneyTransfer }
        ];

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.project !== undefined && params.project !== null) {
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (params.project.id !== undefined && params.project.id !== null) {
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore else */
                if (typeof params.project.id.$eq === 'string') {
                    andConditions.push({
                        'project.id': {
                            $exists: true,
                            $eq: params.project.id.$eq
                        }
                    });
                }

                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore else */
                if (typeof params.project.id.$ne === 'string') {
                    andConditions.push({
                        'project.id': {
                            $ne: params.project.id.$ne
                        }
                    });
                }
            }
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (typeof params.accountType === 'string') {
            andConditions.push({
                $or: [
                    {
                        'fromLocation.typeOf': {
                            $exists: true,
                            $eq: factory.account.TypeOf.Account
                        },
                        'fromLocation.accountType': {
                            $exists: true,
                            $eq: params.accountType
                        }
                    },
                    {
                        'toLocation.typeOf': {
                            $exists: true,
                            $eq: factory.account.TypeOf.Account
                        },
                        'toLocation.accountType': {
                            $exists: true,
                            $eq: params.accountType
                        }
                    }
                ]
            });
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (typeof params.accountNumber === 'string') {
            andConditions.push({
                $or: [
                    {
                        'fromLocation.accountNumber': {
                            $exists: true,
                            $eq: params.accountNumber
                        }
                    },
                    {
                        'toLocation.accountNumber': {
                            $exists: true,
                            $eq: params.accountNumber
                        }
                    }
                ]
            });
        }

        const actionStatusIn = params.actionStatus?.$in;
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray(actionStatusIn)) {
            andConditions.push({
                actionStatus: { $in: actionStatusIn }
            });
        }
        const purposeTypeOfEq = params.purpose?.typeOf?.$eq;
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (typeof purposeTypeOfEq === 'string') {
            andConditions.push({
                'purpose.typeOf': {
                    $exists: true,
                    $eq: purposeTypeOfEq
                }
            });
        }

        const purposeIdEq = params.purpose?.id?.$eq;
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (typeof purposeIdEq === 'string') {
            andConditions.push({
                'purpose.id': {
                    $exists: true,
                    $eq: purposeIdEq
                }
            });
        }

        const startDateGte = params.startDate?.$gte;
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (startDateGte instanceof Date) {
            andConditions.push({
                startDate: { $gte: startDateGte }
            });
        }

        const startDateLte = params.startDate?.$lte;
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (startDateLte instanceof Date) {
            andConditions.push({
                startDate: { $lte: startDateLte }
            });
        }

        return andConditions;
    }

    /**
     * アクション開始
     */
    public async start<T extends factory.actionType>(params: factory.action.IAttributes<any, any>): Promise<IAction<T>> {
        return this.actionModel.create({
            ...params,
            actionStatus: factory.actionStatusType.ActiveActionStatus,
            startDate: new Date()
        })
            .then(
                (doc) => doc.toObject()
            );
    }

    public async startByIdentifier<T extends factory.actionType>(params: factory.action.IAttributes<any, any>): Promise<IAction<T>> {
        if (typeof params.identifier === 'string') {
            return this.actionModel.findOneAndUpdate(
                {
                    identifier: {
                        $exists: true,
                        $eq: params.identifier
                    }
                },
                {
                    $setOnInsert: {
                        ...params,
                        actionStatus: factory.actionStatusType.ActiveActionStatus,
                        startDate: new Date()
                    }
                },
                {
                    upsert: true
                }
            )
                .exec()
                .then((doc) => {
                    if (doc === null) {
                        throw new factory.errors.NotFound(this.actionModel.modelName);
                    }

                    return doc.toObject();
                });
        } else {
            return this.actionModel.create({
                ...params,
                actionStatus: factory.actionStatusType.ActiveActionStatus,
                startDate: new Date()
            })
                .then(
                    (doc) => doc.toObject()
                );
        }
    }

    /**
     * アクション完了
     */
    public async complete<T extends factory.actionType>(
        typeOf: T,
        actionId: string,
        result: any
    ): Promise<IAction<T>> {
        return this.actionModel.findOneAndUpdate(
            {
                typeOf: typeOf,
                _id: actionId
            },
            {
                actionStatus: factory.actionStatusType.CompletedActionStatus,
                result: result,
                endDate: new Date()
            },
            { new: true }
        )
            .exec()
            .then((doc) => {
                if (doc === null) {
                    throw new factory.errors.NotFound('action');
                }

                return doc.toObject();
            });
    }

    /**
     * アクション中止
     */
    public async cancel<T extends factory.actionType>(
        typeOf: T,
        actionId: string
    ): Promise<IAction<T>> {
        return this.actionModel.findOneAndUpdate(
            {
                typeOf: typeOf,
                _id: actionId
            },
            { actionStatus: factory.actionStatusType.CanceledActionStatus },
            { new: true }
        )
            .exec()
            .then((doc) => {
                if (doc === null) {
                    throw new factory.errors.NotFound('action');

                }

                return doc.toObject();
            });
    }

    /**
     * アクション失敗
     */
    public async giveUp<T extends factory.actionType>(
        typeOf: T,
        actionId: string,
        error: any
    ): Promise<IAction<T>> {
        return this.actionModel.findOneAndUpdate(
            {
                typeOf: typeOf,
                _id: actionId
            },
            {
                actionStatus: factory.actionStatusType.FailedActionStatus,
                error: error,
                endDate: new Date()
            },
            { new: true }
        )
            .exec()
            .then((doc) => {
                if (doc === null) {
                    throw new factory.errors.NotFound('action');
                }

                return doc.toObject();
            });
    }

    /**
     * アクション検索
     */
    public async findById<T extends factory.actionType>(
        typeOf: T,
        actionId: string
    ): Promise<IAction<T>> {
        return this.actionModel.findOne(
            {
                typeOf: typeOf,
                _id: actionId
            }
        )
            .exec()
            .then((doc) => {
                if (doc === null) {
                    throw new factory.errors.NotFound('action');
                }

                return doc.toObject();
            });
    }

    public async countTransferActions(
        params: factory.action.transfer.moneyTransfer.ISearchConditions
    ): Promise<number> {
        const conditions = MongoRepository.CREATE_MONEY_TRANSFER_ACTIONS_MONGO_CONDITIONS(params);

        return this.actionModel.countDocuments({ $and: conditions })
            .setOptions({ maxTimeMS: 10000 })
            .exec();
    }

    /**
     * 転送アクションを検索する
     */
    public async searchTransferActions(
        params: factory.action.transfer.moneyTransfer.ISearchConditions
    ): Promise<factory.action.transfer.moneyTransfer.IAction[]> {
        const conditions = MongoRepository.CREATE_MONEY_TRANSFER_ACTIONS_MONGO_CONDITIONS(params);
        const query = this.actionModel.find(
            { $and: conditions },
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0
            }
        );
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.limit !== undefined && params.page !== undefined) {
            query.limit(params.limit)
                .skip(params.limit * (params.page - 1));
        }
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (params.sort !== undefined) {
            query.sort(params.sort);
        }

        return query.setOptions({ maxTimeMS: 10000 })
            .exec()
            .then((docs) => docs.map((doc) => doc.toObject()));
    }

    /**
     * アクションを検索する
     * @param searchConditions 検索条件
     */
    public async search<T extends factory.actionType>(searchConditions: {
        typeOf: T;
        actionStatuses?: factory.accountStatusType[];
        startDateFrom?: Date;
        startDateThrough?: Date;
        purposeTypeOfs?: factory.transactionType[];
        fromLocationAccountNumbers?: string[];
        toLocationAccountNumbers?: string[];
        limit: number;
    }): Promise<IAction<T>[]> {
        const andConditions: any[] = [
            { typeOf: searchConditions.typeOf },
            {
                startDate: {
                    $exists: true,
                    $gte: searchConditions.startDateFrom,
                    $lte: searchConditions.startDateThrough
                }
            }
        ];

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray(searchConditions.actionStatuses) && searchConditions.actionStatuses.length > 0) {
            andConditions.push({
                actionStatus: { $in: searchConditions.actionStatuses }
            });
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray(searchConditions.purposeTypeOfs) && searchConditions.purposeTypeOfs.length > 0) {
            andConditions.push({
                'purpose.typeOf': {
                    $exists: true,
                    $in: searchConditions.purposeTypeOfs
                }
            });
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray(searchConditions.fromLocationAccountNumbers) && searchConditions.fromLocationAccountNumbers.length > 0) {
            andConditions.push({
                'fromLocation.accountNumber': {
                    $exists: true,
                    $in: searchConditions.fromLocationAccountNumbers
                }
            });
        }

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (Array.isArray(searchConditions.toLocationAccountNumbers) && searchConditions.toLocationAccountNumbers.length > 0) {
            andConditions.push({
                'toLocation.accountNumber': {
                    $exists: true,
                    $in: searchConditions.toLocationAccountNumbers
                }
            });
        }

        debug('finding actions...', andConditions);

        return this.actionModel.find(
            { $and: andConditions },
            {
                __v: 0,
                createdAt: 0,
                updatedAt: 0
            }
        )
            .limit(searchConditions.limit)
            .exec()
            .then((docs) => docs.map((doc) => doc.toObject()));
    }
}
