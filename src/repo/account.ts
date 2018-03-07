import { Connection } from 'mongoose';

import AccountModel from './mongoose/model/account';

/**
 * 口座リポジトリー
 */
export class MongoRepository {
    public readonly accountModel: typeof AccountModel;

    constructor(connection: Connection) {
        this.accountModel = connection.model(AccountModel.modelName);
    }
}
