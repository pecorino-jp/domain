import * as mongoose from 'mongoose';

const modelName = 'Task';

const safe = { j: true, w: 'majority', wtimeout: 10000 };

/**
 * タスクスキーマ
 */
const schema = new mongoose.Schema(
    {
        project: mongoose.SchemaTypes.Mixed,
        name: String,
        status: String,
        runsAt: Date,
        remainingNumberOfTries: Number,
        lastTriedAt: Date,
        numberOfTried: Number,
        executionResults: [mongoose.SchemaTypes.Mixed],
        data: mongoose.SchemaTypes.Mixed
    },
    {
        collection: 'tasks',
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

schema.index(
    { createdAt: 1 },
    { name: 'searchByCreatedAt' }
);
schema.index(
    { updatedAt: 1 },
    { name: 'searchByUpdatedAt' }
);

schema.index(
    { 'project.id': 1, runsAt: -1 },
    {
        name: 'searchByProjectId',
        partialFilterExpression: {
            'project.id': { $exists: true }
        }
    }
);

schema.index(
    { name: 1, runsAt: -1 },
    { name: 'searchByName-v2' }
);

schema.index(
    { status: 1, runsAt: -1 },
    { name: 'searchByStatus-v2' }
);

schema.index(
    { runsAt: -1 },
    { name: 'searchByRunsAt-v2' }
);

schema.index(
    { lastTriedAt: 1, runsAt: -1 },
    {
        name: 'searchByLastTriedAt-v2',
        partialFilterExpression: {
            lastTriedAt: { $type: 'date' }
        }
    }
);

schema.index(
    { remainingNumberOfTries: 1, runsAt: -1 },
    { name: 'searchByRemainingNumberOfTries-v2' }
);

schema.index(
    { status: 1, name: 1, numberOfTried: 1, runsAt: 1 },
    {
        name: 'executeOneByName'
    }
);

schema.index(
    { status: 1, remainingNumberOfTries: 1, lastTriedAt: 1 },
    {
        name: 'retry',
        partialFilterExpression: {
            lastTriedAt: { $type: 'date' }
        }
    }
);

schema.index(
    { 'data.transactionId': 1 },
    {
        partialFilterExpression: {
            'data.transactionId': { $exists: true }
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
