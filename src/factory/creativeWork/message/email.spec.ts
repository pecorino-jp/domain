// tslint:disable:no-implicit-dependencies

/**
 * creativeWork.message.email test
 * @ignore
 */

import * as assert from 'power-assert';

import * as errors from '../../errors';
import * as EmailFactory from './email';

let TEST_CREATE_PARAMS: any;

describe('creativeWork.message.email.create()', () => {
    beforeEach(() => {
        TEST_CREATE_PARAMS = {
            identifier: 'identifier',
            sender: {
                email: 'test@example.com'
            },
            toRecipient: {
                email: 'test@example.com'
            },
            about: 'about',
            text: 'text'
        };
    });

    it('作成できる', () => {
        assert.doesNotThrow(() => {
            EmailFactory.create(TEST_CREATE_PARAMS);
        });
    });

    it('送信者が空であればArgumentNullError', () => {
        assert.throws(
            () => {
                const params = { ...TEST_CREATE_PARAMS, ...{ sender: null } };
                EmailFactory.create(params);
            },
            (err: any) => {
                assert(err instanceof errors.ArgumentNull);

                return true;
            }
        );
    });

    it('送信者にメールアドレスがセットされていなければArgumentError', () => {
        assert.throws(
            () => {
                const params = { ...TEST_CREATE_PARAMS, ...{ sender: {} } };
                EmailFactory.create(params);
            },
            (err: any) => {
                assert(err instanceof errors.Argument);

                return true;
            }
        );
    });

    it('受信者が空であればArgumentNullError', () => {
        assert.throws(
            () => {
                const params = { ...TEST_CREATE_PARAMS, ...{ toRecipient: null } };
                EmailFactory.create(params);
            },
            (err: any) => {
                assert(err instanceof errors.ArgumentNull);

                return true;
            }
        );
    });

    it('受信者にメールアドレスがセットされていなければArgumentError', () => {
        assert.throws(
            () => {
                const params = { ...TEST_CREATE_PARAMS, ...{ toRecipient: {} } };
                EmailFactory.create(params);
            },
            (err: any) => {
                assert(err instanceof errors.Argument);

                return true;
            }
        );
    });

    it('件名が空であればArgumentNullError', () => {
        assert.throws(
            () => {
                TEST_CREATE_PARAMS.about = '';
                EmailFactory.create(TEST_CREATE_PARAMS);
            },
            (err: any) => {
                assert(err instanceof errors.ArgumentNull);

                return true;
            }
        );
    });

    it('本文が空であればArgumentNullError', () => {
        assert.throws(
            () => {
                TEST_CREATE_PARAMS.text = '';
                EmailFactory.create(TEST_CREATE_PARAMS);
            },
            (err: any) => {
                assert(err instanceof errors.ArgumentNull);

                return true;
            }
        );
    });
});
