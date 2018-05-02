import { Connection } from 'mongoose';

import * as factory from '../factory';
import ActionModel from './mongoose/model/action';

export type IAction = factory.action.IAction<factory.action.IAttributes<any, any>>;

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
    public async start<T extends IAction>(params: factory.action.IAttributes<any, any>): Promise<T> {
        return this.actionModel.create({
            ...params,
            actionStatus: factory.actionStatusType.ActiveActionStatus,
            startDate: new Date()
        }).then(
            (doc) => <T>doc.toObject()
        );
    }

    /**
     * アクション完了
     */
    public async complete<T extends IAction>(
        typeOf: factory.actionType,
        actionId: string,
        result: any
    ): Promise<T> {
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

            return <T>doc.toObject();
        });
    }

    /**
     * アクション中止
     */
    public async cancel<T extends IAction>(
        typeOf: factory.actionType,
        actionId: string
    ): Promise<T> {
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

                return <T>doc.toObject();
            });
    }

    /**
     * アクション失敗
     */
    public async giveUp<T extends IAction>(
        typeOf: factory.actionType,
        actionId: string,
        error: any
    ): Promise<T> {
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

            return <T>doc.toObject();
        });
    }

    /**
     * IDで取得する
     */
    public async findById<T extends IAction>(
        typeOf: factory.actionType,
        actionId: string
    ): Promise<T> {
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

                return <T>doc.toObject();
            });
    }
}
