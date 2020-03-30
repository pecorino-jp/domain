import * as mongoose from 'mongoose';

const modelName = 'Account';

const safe = { j: true, w: 'majority', wtimeout: 10000 };

/**
 * 口座スキーマ
 */
const schema = new mongoose.Schema(
    {},
    {
        collection: 'accounts',
        id: true,
        read: 'primaryPreferred',
        safe: safe,
        strict: false,
        useNestedStrict: true,
        timestamps: {
            createdAt: 'createdAt',
            updatedAt: 'updatedAt'
        },
        toJSON: {
            getters: false,
            virtuals: true,
            minimize: false,
            versionKey: false
        },
        toObject: {
            getters: false,
            virtuals: true,
            minimize: false,
            versionKey: false
        }
    }
);

// 口座タイプと口座番号でユニーク
schema.index(
    {
        accountType: 1,
        accountNumber: 1
    },
    {
        unique: true,
        partialFilterExpression: {
            accountType: { $exists: true },
            accountNumber: { $exists: true }
        }
    }
);

schema.index(
    { createdAt: 1 },
    { name: 'searchByCreatedAt' }
);
schema.index(
    { updatedAt: 1 },
    { name: 'searchByUpdatedAt' }
);

schema.index(
    { 'project.id': 1, openDate: -1 },
    {
        name: 'searchByProjectId',
        partialFilterExpression: {
            'project.id': { $exists: true }
        }
    }
);

schema.index(
    { typeOf: 1, openDate: -1 },
    { name: 'searchByTypeOf-v2' }
);
schema.index(
    { accountNumber: 1, openDate: -1 },
    { name: 'searchByAccountNumber-v2' }
);
schema.index(
    { accountType: 1, openDate: -1 },
    { name: 'searchByAccountType-v2' }
);
schema.index(
    { name: 1, openDate: -1 },
    { name: 'searchByName-v2' }
);
schema.index(
    { openDate: -1 },
    { name: 'searchByOpenDate-v2' }
);
schema.index(
    { status: 1, openDate: -1 },
    { name: 'searchByStatus-v2' }
);

schema.index(
    { accountType: 1, accountNumber: 1, status: 1 },
    { name: 'authorizeAmount' }
);

export default mongoose.model(modelName, schema)
    .on(
        'index',
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore next */
        (error) => {
            if (error !== undefined) {
                // tslint:disable-next-line:no-console
                console.error(error);
            }
        }
    );
