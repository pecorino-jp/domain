import * as mongoose from 'mongoose';

const modelName = 'Transaction';

const safe = { j: true, w: 'majority', wtimeout: 10000 };

const objectSchema = new mongoose.Schema(
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

const potentialActionsSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

/**
 * 取引スキーマ
 */
const schema = new mongoose.Schema(
    {
        status: String,
        typeOf: String,
        agent: agentSchema,
        recipient: recipientSchema,
        error: errorSchema,
        result: resultSchema,
        object: objectSchema,
        expires: Date,
        startDate: Date,
        endDate: Date,
        tasksExportedAt: Date,
        tasksExportationStatus: String,
        potentialActions: potentialActionsSchema
    },
    {
        collection: 'transactions',
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
    { typeOf: 1 },
    { name: 'searchByTypeOf' }
);
schema.index(
    { status: 1 },
    { name: 'searchByStatus' }
);
schema.index(
    { startDate: 1 },
    { name: 'searchByStartDate' }
);
schema.index(
    { endDate: 1 },
    {
        name: 'searchByEndDate',
        partialFilterExpression: {
            endDate: { $exists: true }
        }
    }
);
schema.index(
    { expires: 1 },
    { name: 'searchByExpires' }
);
schema.index(
    { tasksExportationStatus: 1 },
    { name: 'searchByTasksExportationStatus' }
);
schema.index(
    { tasksExportedAt: 1 },
    {
        name: 'searchByTasksExportedAt',
        partialFilterExpression: {
            tasksExportedAt: { $exists: true }
        }
    }
);
schema.index(
    { 'agent.typeOf': 1 },
    {
        name: 'searchByAgentTypeOf',
        partialFilterExpression: {
            'agent.typeOf': { $exists: true }
        }
    }
);
schema.index(
    { 'agent.id': 1 },
    {
        name: 'searchByAgentId',
        partialFilterExpression: {
            'agent.id': { $exists: true }
        }
    }
);
schema.index(
    { 'agent.identifier': 1 },
    {
        name: 'searchByAgentIdentifier',
        partialFilterExpression: {
            'agent.identifier': { $exists: true }
        }
    }
);
schema.index(
    { 'recipient.typeOf': 1 },
    {
        name: 'searchByRecipientTypeOf',
        partialFilterExpression: {
            'recipient.typeOf': { $exists: true }
        }
    }
);
schema.index(
    { 'recipient.id': 1 },
    {
        name: 'searchByRecipientId',
        partialFilterExpression: {
            'recipient.id': { $exists: true }
        }
    }
);
schema.index(
    { typeOf: 1, status: 1, tasksExportationStatus: 1 },
    {
        name: 'startExportTasks'
    }
);
schema.index(
    { tasksExportationStatus: 1, updatedAt: 1 },
    {
        name: 'reexportTasks'
    }
);
schema.index(
    { status: 1, expires: 1 },
    {
        name: 'makeExpired'
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
