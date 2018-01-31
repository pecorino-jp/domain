// tslint:disable:no-implicit-dependencies

/**
 * task test
 * @ignore
 */

import * as assert from 'power-assert';

import * as errors from './errors';
import * as TaskFactory from './task';

let TEST_CREATE_PARAMS: any;

describe('task.createAttributes()', () => {
    beforeEach(() => {
        TEST_CREATE_PARAMS = {
            name: 'name',
            status: 'status',
            runsAt: new Date(),
            remainingNumberOfTries: 1,
            lastTriedAt: new Date(),
            numberOfTried: 1,
            executionResults: [],
            data: {}
        };
    });

    it('作成できる', () => {
        assert.doesNotThrow(() => {
            TaskFactory.createAttributes(TEST_CREATE_PARAMS);
        });
    });

    it('タスク名が空であればArgumentNullError', () => {
        assert.throws(
            () => {
                const params = { ...TEST_CREATE_PARAMS, ...{ name: '' } };
                TaskFactory.createAttributes(params);
            },
            (err: any) => {
                assert(err instanceof errors.ArgumentNull);

                return true;
            }
        );
    });

    it('ステータスが空であればArgumentNullError', () => {
        assert.throws(
            () => {
                const params = { ...TEST_CREATE_PARAMS, ...{ status: '' } };
                TaskFactory.createAttributes(params);
            },
            (err: any) => {
                assert(err instanceof errors.ArgumentNull);

                return true;
            }
        );
    });

    it('実行日時がDateでなければArgumentError', () => {
        assert.throws(
            () => {
                const params = { ...TEST_CREATE_PARAMS, ...{ runsAt: null } };
                TaskFactory.createAttributes(params);
            },
            (err: any) => {
                assert(err instanceof errors.Argument);

                return true;
            }
        );
    });

    it('トライ残数が数字でなければArgumentError', () => {
        assert.throws(
            () => {
                const params = { ...TEST_CREATE_PARAMS, ...{ remainingNumberOfTries: '1' } };
                TaskFactory.createAttributes(params);
            },
            (err: any) => {
                assert(err instanceof errors.Argument);

                return true;
            }
        );
    });

    it('最終トライ日時がDateでなければArgumentError', () => {
        assert.throws(
            () => {
                const params = { ...TEST_CREATE_PARAMS, ...{ lastTriedAt: '2017-11-15T19:30:00Z' } };
                TaskFactory.createAttributes(params);
            },
            (err: any) => {
                assert(err instanceof errors.Argument);

                return true;
            }
        );
    });

    it('トライ回数が数字でなければArgumentError', () => {
        assert.throws(
            () => {
                const params = { ...TEST_CREATE_PARAMS, ...{ numberOfTried: '1' } };
                TaskFactory.createAttributes(params);
            },
            (err: any) => {
                assert(err instanceof errors.Argument);

                return true;
            }
        );
    });

    it('実行結果が配列でなければArgumentError', () => {
        assert.throws(
            () => {
                const params = { ...TEST_CREATE_PARAMS, ...{ executionResults: {} } };
                TaskFactory.createAttributes(params);
            },
            (err: any) => {
                assert(err instanceof errors.Argument);

                return true;
            }
        );
    });
});
