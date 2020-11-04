/**
 * 通知サービス
 */
import * as createDebug from 'debug';
import * as httpStatus from 'http-status';
import * as request from 'request';

export type Operation<T> = () => Promise<T>;

const debug = createDebug('pecorino-domain:service');

export const LINE_NOTIFY_URL = 'https://notify-api.line.me/api/notify';

/**
 * report to developers
 * 開発者に報告する
 * @see https://notify-bot.line.me/doc/ja/
 */
export function report2developers(subject: string, content: string, imageThumbnail?: string, imageFullsize?: string): Operation<void> {
    return async () => {
        if (process.env.LINE_NOTIFY_ACCESS_TOKEN === undefined) {
            throw new Error('access token for LINE Notify undefined');
        }

        const message = `
env[${process.env.NODE_ENV}]
------------------------
${subject}
------------------------
${content}`
            ;

        // LINE通知APIにPOST
        const formData: any = {
            message: message,
            ...(typeof imageThumbnail === 'string') ? { imageThumbnail } : undefined,
            ...(typeof imageFullsize === 'string') ? { imageFullsize } : undefined
        };

        return new Promise<void>((resolve, reject) => {
            request.post(
                {
                    url: LINE_NOTIFY_URL,
                    auth: { bearer: process.env.LINE_NOTIFY_ACCESS_TOKEN },
                    form: formData,
                    json: true
                },
                (error, response, body) => {
                    debug('posted to LINE Notify.', error, body);
                    if (error !== null) {
                        reject(error);
                    } else {
                        if (response.statusCode !== httpStatus.OK) {
                            reject(new Error(body.message));
                        } else {
                            resolve();
                        }
                    }
                }
            );
        });
    };
}
