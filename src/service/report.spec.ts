// tslint:disable:no-implicit-dependencies
/**
 * レポートサービステスト
 */
import * as mongoose from 'mongoose';
import * as assert from 'power-assert';
import * as sinon from 'sinon';

import * as pecorino from '../index';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('取引レポートをダウンロードする', () => {
    beforeEach(() => {
        sandbox.restore();
    });

    it('リポジトリーが正常であればダウンロードできるはず', async () => {
        const transactions = [
            {
                typeOf: pecorino.factory.transactionType.Deposit,
                agent: {},
                recipient: {},
                object: {
                    toLocation: {},
                    description: 'description'
                },
                expires: new Date(),
                status: pecorino.factory.transactionStatusType.Confirmed,
                result: {},
                startDate: new Date(),
                endDate: new Date(),
                tasksExportedAt: new Date(),
                tasksExportationStatus: pecorino.factory.transactionTasksExportationStatus.Exported,
                potentialActions: {}
            },
            {
                typeOf: pecorino.factory.transactionType.Deposit,
                agent: {},
                recipient: {},
                object: {
                    toLocation: {},
                    description: 'description'
                },
                expires: new Date(),
                status: pecorino.factory.transactionStatusType.Expired,
                startDate: new Date(),
                endDate: new Date(),
                tasksExportedAt: new Date(),
                tasksExportationStatus: pecorino.factory.transactionTasksExportationStatus.Exported,
                potentialActions: {}
            },
            {
                typeOf: pecorino.factory.transactionType.Transfer,
                agent: {},
                recipient: {},
                object: {
                    fromLocation: {},
                    toLocation: {},
                    description: 'description'
                },
                expires: new Date(),
                status: pecorino.factory.transactionStatusType.Confirmed,
                result: {},
                startDate: new Date(),
                endDate: new Date(),
                tasksExportedAt: new Date(),
                tasksExportationStatus: pecorino.factory.transactionTasksExportationStatus.Exported,
                potentialActions: {}
            },
            {
                typeOf: pecorino.factory.transactionType.Withdraw,
                agent: {},
                recipient: {},
                object: {
                    fromLocation: {},
                    description: 'description'
                },
                expires: new Date(),
                status: pecorino.factory.transactionStatusType.Confirmed,
                result: {},
                startDate: new Date(),
                endDate: new Date(),
                tasksExportedAt: new Date(),
                tasksExportationStatus: pecorino.factory.transactionTasksExportationStatus.Exported,
                potentialActions: {}
            }];
        const transactionRepo = new pecorino.repository.Transaction(mongoose.connection);
        sandbox.mock(transactionRepo)
            .expects('search')
            .once()
            .resolves(transactions);

        const result = await pecorino.service.report.download(<any>{}, 'csv')({
            transaction: transactionRepo
        });
        assert.equal(typeof result, 'string');
        sandbox.verify();
    });

    it('非対応フォーマットを指定すれば、NotImplementedエラーとなるはず', async () => {
        const transactions = [];
        const transactionRepo = new pecorino.repository.Transaction(mongoose.connection);
        sandbox.mock(transactionRepo)
            .expects('search')
            .once()
            .resolves(transactions);

        const result = await pecorino.service.report.download(<any>{}, <any>'UnknownFormat')({
            transaction: transactionRepo
        })
            .catch((err) => err);
        assert(result instanceof pecorino.factory.errors.NotImplemented);
        sandbox.verify();
    });
});
