import * as mongoose from 'mongoose';

const modelName = 'Action';

const safe = { j: true, w: 'majority', wtimeout: 10000 };

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
const errorSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);
const objectSchema = mongoose.SchemaTypes.Mixed;
const resultSchema = mongoose.SchemaTypes.Mixed;
const purposeSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);
const potentialActionsSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);
const locationSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);
const instrumentSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

/**
 * アクションスキーマ
 */
const schema = new mongoose.Schema(
    {
        project: mongoose.SchemaTypes.Mixed,
        actionStatus: String,
        typeOf: String,
        description: String,
        agent: agentSchema,
        recipient: recipientSchema,
        result: resultSchema,
        error: errorSchema,
        object: objectSchema,
        startDate: Date,
        endDate: Date,
        purpose: purposeSchema,
        potentialActions: potentialActionsSchema,
        amount: Number,
        fromLocation: locationSchema,
        toLocation: locationSchema,
        instrument: instrumentSchema
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
        toJSON: {
            getters: true,
            virtuals: true,
            minimize: false,
            versionKey: false
        },
        toObject: {
            getters: true,
            virtuals: true,
            minimize: false,
            versionKey: false
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
    { typeOf: 1, startDate: -1 },
    { name: 'searchByTypeOf-v2' }
);
schema.index(
    { actionStatus: 1, startDate: -1 },
    { name: 'searchByActionStatus-v2' }
);
schema.index(
    { startDate: -1 },
    { name: 'searchByStartDate-v2' }
);
schema.index(
    { endDate: -1, startDate: -1 },
    {
        name: 'searchByEndDate-v2',
        partialFilterExpression: {
            endDate: { $exists: true }
        }
    }
);
schema.index(
    { 'purpose.typeOf': 1, startDate: -1 },
    {
        name: 'searchByPurposeTypeOf-v2',
        partialFilterExpression: {
            'purpose.typeOf': { $exists: true }
        }
    }
);
schema.index(
    { 'purpose.id': 1, startDate: -1 },
    {
        name: 'searchByPurposeId-v2',
        partialFilterExpression: {
            'purpose.id': { $exists: true }
        }
    }
);
schema.index(
    { 'object.typeOf': 1, startDate: -1 },
    {
        name: 'searchByObjectTypeOf-v2',
        partialFilterExpression: {
            'object.typeOf': { $exists: true }
        }
    }
);
schema.index(
    { 'fromLocation.typeOf': 1, startDate: -1 },
    {
        name: 'searchByFromLocationTypeOf-v2',
        partialFilterExpression: {
            'fromLocation.typeOf': { $exists: true }
        }
    }
);
schema.index(
    { 'fromLocation.accountNumber': 1, startDate: -1 },
    {
        name: 'searchByFromLocationAccountNumber-v2',
        partialFilterExpression: {
            'fromLocation.accountNumber': { $exists: true }
        }
    }
);
schema.index(
    { 'fromLocation.accountType': 1, startDate: -1 },
    {
        name: 'searchByFromLocationAccountType-v2',
        partialFilterExpression: {
            'fromLocation.accountType': { $exists: true }
        }
    }
);
schema.index(
    { 'toLocation.typeOf': 1, startDate: -1 },
    {
        name: 'searchByToLocationTypeOf-v2',
        partialFilterExpression: {
            'toLocation.typeOf': { $exists: true }
        }
    }
);
schema.index(
    { 'toLocation.accountNumber': 1, startDate: -1 },
    {
        name: 'searchByToLocationAccountNumber-v2',
        partialFilterExpression: {
            'toLocation.accountNumber': { $exists: true }
        }
    }
);
schema.index(
    { 'toLocation.accountType': 1, startDate: -1 },
    {
        name: 'searchByToLocationAccountType-v2',
        partialFilterExpression: {
            'toLocation.accountType': { $exists: true }
        }
    }
);

schema.index(
    { 'fromLocation.typeOf': 1, 'fromLocation.accountType': 1, 'fromLocation.accountNumber': 1, endDate: -1 },
    {
        name: 'searchTransferActionsByFromAccountLocation',
        partialFilterExpression: {
            'fromLocation.typeOf': { $exists: true },
            'fromLocation.accountType': { $exists: true },
            'fromLocation.accountNumber': { $exists: true }
        }
    }
);
schema.index(
    { 'toLocation.typeOf': 1, 'toLocation.accountType': 1, 'toLocation.accountNumber': 1, endDate: -1 },
    {
        name: 'searchTransferActionsByToAccountLocation',
        partialFilterExpression: {
            'toLocation.typeOf': { $exists: true },
            'toLocation.accountType': { $exists: true },
            'toLocation.accountNumber': { $exists: true }
        }
    }
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
