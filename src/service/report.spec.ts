// tslint:disable:no-implicit-dependencies
/**
 * レポートサービステスト
 * @ignore
 */
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

    it('リポジトリーが正常であれば開設できるはず', async () => {
        const transactions = [{
            typeOf: pecorino.factory.transactionType.Deposit,
            agent: {},
            recipient: {},
            object: {},
            expires: new Date(),
            status: pecorino.factory.transactionStatusType.Confirmed,
            result: {},
            startDate: new Date(),
            endDate: new Date(),
            tasksExportedAt: new Date(),
            tasksExportationStatus: pecorino.factory.transactionTasksExportationStatus.Exported,
            potentialActions: {}
        }];
        const transactionRepo = new pecorino.repository.Transaction(pecorino.mongoose.connection);
        sandbox.mock(transactionRepo).expects('search').once().resolves(transactions);

        const result = await pecorino.service.report.download(<any>{}, 'csv')({
            transaction: transactionRepo
        });
        assert.equal(typeof result, 'string');
        sandbox.verify();
    });
});
