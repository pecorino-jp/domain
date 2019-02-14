import * as mongoose from 'mongoose';

const safe = { j: true, w: 'majority', wtimeout: 10000 };

/**
 * 口座スキーマ
 * @ignore
 */
const schema = new mongoose.Schema(
    {
    },
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
        toJSON: { getters: true },
        toObject: { getters: true }
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
    { typeOf: 1, status: 1, name: 1, openDate: 1 },
    {
        name: 'searchAccounts'
    }
);

export default mongoose.model('Account', schema)
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
