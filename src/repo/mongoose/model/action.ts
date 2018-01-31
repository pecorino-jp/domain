import * as mongoose from 'mongoose';

const safe: any = { j: 1, w: 'majority', wtimeout: 10000 };

const agentSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const recipientSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const resultSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const errorSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const objectSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const purposeSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

/**
 * アクションスキーマ
 * @ignore
 */
const schema = new mongoose.Schema(
    {
        _id: String,
        actionStatus: String,
        typeOf: String,
        agent: agentSchema,
        recipient: recipientSchema,
        result: resultSchema,
        error: errorSchema,
        object: objectSchema,
        startDate: Date,
        endDate: Date,
        purpose: purposeSchema
    },
    {
        collection: 'actions',
        id: true,
        read: 'primaryPreferred',
        safe: safe,
        strict: true,
        useNestedStrict: true,
        timestamps: {
            createdAt: 'createdAt',
            updatedAt: 'updatedAt'
        },
        toJSON: { getters: true },
        toObject: { getters: true }
    }
);

schema.index(
    { typeOf: 1, _id: 1 }
);

// 取引の承認アクション検索に使用
schema.index(
    { typeOf: 1, 'object.transactionId': 1 },
    {
        partialFilterExpression: {
            'object.transactionId': { $exists: true }
        }
    }
);

// 取引の承認アクション状態変更に使用
schema.index(
    { 'purpose.typeOf': 1, 'object.transactionId': 1, typeOf: 1, _id: 1 },
    {
        partialFilterExpression: {
            'purpose.typeOf': { $exists: true },
            'object.transactionId': { $exists: true }
        }
    }
);

export default mongoose.model('Action', schema)
    .on('index', (error) => {
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore next */
        if (error !== undefined) {
            console.error(error);
        }
    });
