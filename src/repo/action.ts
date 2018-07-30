import * as createDebug from 'debug';
import { Connection } from 'mongoose';

import * as factory from '../factory';
import ActionModel from './mongoose/model/action';

const debug = createDebug('pecorino-domain:repository:action');

export type IAction<T extends factory.actionType> =
    T extends factory.actionType.MoneyTransfer ? factory.action.transfer.moneyTransfer.IAction<factory.account.AccountType> :
    factory.action.IAction<factory.action.IAttributes<any, any>>;
/**
 * 転送アクション検索条件インターフェース
 */
export interface ISearchTransferActionsConditions<T extends factory.account.AccountType> {
    accountType: T;
    accountNumber: string;
    limit?: number;
}

/**
 * アクションリポジトリー
 */
export class MongoRepository {
    public readonly actionModel: typeof ActionModel;

    constructor(connection: Connection) {
        this.actionModel = connection.model(ActionModel.modelName);
    }
    /**
     * アクション開始
     */
    public async start<T extends factory.actionType>(params: factory.action.IAttributes<any, any>): Promise<IAction<T>> {
        return this.actionModel.create({
            ...params,
            actionStatus: factory.actionStatusType.ActiveActionStatus,
            startDate: new Date()
        }).then(
            (doc) => doc.toObject()
        );
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
        ).exec().then((doc) => {
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
        ).exec()
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
        ).exec().then((doc) => {
            if (doc === null) {
                throw new factory.errors.NotFound('action');
            }

            return doc.toObject();
        });
    }
    /**
     * IDで取得する
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
        ).exec()
            .then((doc) => {
                if (doc === null) {
                    throw new factory.errors.NotFound('action');
                }

                return doc.toObject();
            });
    }
    /**
     * 転送アクションを検索する
     * @param searchConditions 検索条件
     */
    public async searchTransferActions<T extends factory.account.AccountType>(
        searchConditions: ISearchTransferActionsConditions<T>
    ): Promise<factory.action.transfer.moneyTransfer.IAction<T>[]> {
        // tslint:disable-next-line:no-magic-numbers no-single-line-block-comment
        const limit = (searchConditions.limit !== undefined) ? searchConditions.limit : /* istanbul ignore next*/ 100;

        return this.actionModel.find({
            $or: [
                {
                    typeOf: factory.actionType.MoneyTransfer,
                    'fromLocation.typeOf': factory.account.TypeOf.Account,
                    'fromLocation.accountType': searchConditions.accountType,
                    'fromLocation.accountNumber': searchConditions.accountNumber
                },
                {
                    typeOf: factory.actionType.MoneyTransfer,
                    'toLocation.typeOf': factory.account.TypeOf.Account,
                    'toLocation.accountType': searchConditions.accountType,
                    'toLocation.accountNumber': searchConditions.accountNumber
                }
            ]
        })
            .sort({ endDate: -1 }).limit(limit)
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
            .sort({ _id: 1 })
            .limit(searchConditions.limit)
            .exec()
            .then((docs) => docs.map((doc) => doc.toObject()));
    }
}
