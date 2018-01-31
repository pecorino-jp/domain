// tslint:disable:no-implicit-dependencies

/**
 * transaction test
 * @ignore
 */

import * as assert from 'power-assert';

import * as errors from './errors';
import * as TransactionFactory from './transaction';

let TEST_CREATE_PARAMS: any;

describe('transaction.createAttributes()', () => {
    beforeEach(() => {
        TEST_CREATE_PARAMS = {
            typeOf: 'typeOf',
            status: 'status',
            agent: {},
            result: {},
            error: {},
            object: {},
            expires: new Date(),
            startDate: new Date(),
            endDate: new Date(),
            tasksExportedAt: new Date(),
            tasksExportationStatus: 'tasksExportationStatus'
        };
    });

    it('作成できる', () => {
        assert.doesNotThrow(() => {
            TransactionFactory.createAttributes(TEST_CREATE_PARAMS);
        });
    });

    it('ステータスが空であればArgumentNullError', () => {
        assert.throws(
            () => {
                const params = { ...TEST_CREATE_PARAMS, ...{ status: '' } };
                TransactionFactory.createAttributes(params);
            },
            (err: any) => {
                assert(err instanceof errors.ArgumentNull);

                return true;
            }
        );
    });

    it('タスクエクスポートステータスが空であればArgumentNullError', () => {
        assert.throws(
            () => {
                const params = { ...TEST_CREATE_PARAMS, ...{ tasksExportationStatus: '' } };
                TransactionFactory.createAttributes(params);
            },
            (err: any) => {
                assert(err instanceof errors.ArgumentNull);

                return true;
            }
        );
    });

    it('期限がDateでなければArgumentError', () => {
        assert.throws(
            () => {
                const params = { ...TEST_CREATE_PARAMS, ...{ expires: {} } };
                TransactionFactory.createAttributes(params);
            },
            (err: any) => {
                assert(err instanceof errors.Argument);

                return true;
            }
        );
    });

    it('開始日時がDateでなければArgumentError', () => {
        assert.throws(
            () => {
                const params = { ...TEST_CREATE_PARAMS, ...{ startDate: {} } };
                TransactionFactory.createAttributes(params);
            },
            (err: any) => {
                assert(err instanceof errors.Argument);

                return true;
            }
        );
    });

    it('終了日時がDateでなければArgumentError', () => {
        assert.throws(
            () => {
                const params = { ...TEST_CREATE_PARAMS, ...{ endDate: {} } };
                TransactionFactory.createAttributes(params);
            },
            (err: any) => {
                assert(err instanceof errors.Argument);

                return true;
            }
        );
    });

    it('タスクエクスポート日時がDateでなければArgumentError', () => {
        assert.throws(
            () => {
                const params = { ...TEST_CREATE_PARAMS, ...{ tasksExportedAt: {} } };
                TransactionFactory.createAttributes(params);
            },
            (err: any) => {
                assert(err instanceof errors.Argument);

                return true;
            }
        );
    });
});
