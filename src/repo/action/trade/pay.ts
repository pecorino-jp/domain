import { Connection } from 'mongoose';

import ActionModel from '../../../repo/mongoose/model/action';

/**
 * 支払アクションレポジトリー
 * @export
 * @class
 */
export class MongoRepository {
    public readonly actionModel: typeof ActionModel;

    constructor(connection: Connection) {
        this.actionModel = connection.model(ActionModel.modelName);
    }
}
