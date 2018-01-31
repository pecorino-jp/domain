import * as mongoose from 'mongoose';

const safe: any = { j: 1, w: 'majority', wtimeout: 10000 };

/**
 * 口座スキーマ
 * @ignore
 */
const schema = new mongoose.Schema(
    {
        _id: String
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

export default mongoose.model('Account', schema)
    .on('index', (error) => {
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore next */
        if (error !== undefined) {
            console.error(error);
        }
    });
