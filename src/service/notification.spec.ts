// tslint:disable:no-implicit-dependencies
/**
 * 通知サービステスト
 */
import { BAD_REQUEST, OK } from 'http-status';
import * as nock from 'nock';
import * as assert from 'power-assert';
import * as sinon from 'sinon';
import * as pecorino from '../index';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('report2developers()', () => {
    beforeEach(() => {
        process.env.LINE_NOTIFY_ACCESS_TOKEN = 'accessToken';
    });

    afterEach(() => {
        process.env.LINE_NOTIFY_ACCESS_TOKEN = 'accessToken';
        nock.cleanAll();
        sandbox.restore();
    });

    it('LINE Notifyのアクセストークンを環境変数に未設定であれば、エラーになるはず', async () => {
        delete process.env.LINE_NOTIFY_ACCESS_TOKEN;

        const scope = nock('https://notify-api.line.me')
            .post('/api/notify')
            .reply(OK, {});
        const imageThumbnail = 'https://example.com';
        const imageFullsize = 'https://example.com';

        const result = await pecorino.service.notification.report2developers('', '', imageThumbnail, imageFullsize)()
            .catch((err) => err);

        assert(result instanceof Error);
        assert(!scope.isDone());
    });

    it('LINE Notifyが200を返せば、エラーにならないはず', async () => {
        const scope = nock('https://notify-api.line.me')
            .post('/api/notify')
            .reply(OK, {});
        const imageThumbnail = 'https://example.com';
        const imageFullsize = 'https://example.com';

        const result = await pecorino.service.notification.report2developers('', '', imageThumbnail, imageFullsize)();

        assert.equal(result, undefined);
        assert(scope.isDone());
    });

    it('LINE Notifyの200を返さなければ、エラーになるはず', async () => {
        const scope = nock('https://notify-api.line.me')
            .post('/api/notify')
            .reply(BAD_REQUEST, { message: 'message' });

        const result = await pecorino.service.notification.report2developers('', '')()
            .catch((err) => err);

        assert(result instanceof Error);
        assert(scope.isDone());
    });

    it('LINE Notifyの状態が正常でなければ、エラーになるはず', async () => {
        const scope = nock('https://notify-api.line.me')
            .post('/api/notify')
            .replyWithError(new Error('lineError'));

        const result = await pecorino.service.notification.report2developers('', '')()
            .catch((err) => err);
        assert(result instanceof Error);
        assert(scope.isDone());
    });
});
