// tslint:disable:no-magic-numbers
import * as createDebug from 'debug';
import * as ioredis from 'ioredis';
import * as moment from 'moment';

import * as factory from '@motionpicture/pecorino-factory';

const debug = createDebug('pecorino-domain:repository:accountNumber');

/**
 * 口座番号リポジトリー
 */
export class RedisRepository {
    /**
     * チェックディジットを算出する際の係数
     * {RedisRepository.MAX_LENGTH_OF_SEQUENCE_NO}と数が連動している必要がある
     */
    public static CHECK_DIGIT_WEIGHTS: number[] = [3, 1, 4, 2, 4, 1, 5, 4, 5, 3];

    public static SORT_TYPES_PAYMENT_NO: number[][] = [
        [1, 0, 7, 4, 5, 6, 8, 2, 3, 9],
        [2, 7, 4, 1, 6, 3, 9, 8, 0, 5],
        [6, 0, 4, 8, 3, 5, 1, 9, 7, 2],
        [2, 9, 4, 1, 8, 7, 6, 3, 0, 5],
        [4, 5, 2, 6, 9, 1, 7, 8, 0, 3],
        [6, 7, 9, 0, 3, 4, 2, 1, 8, 5],
        [8, 4, 6, 5, 0, 9, 1, 3, 2, 7],
        [0, 2, 6, 9, 5, 3, 7, 1, 8, 4],
        [1, 0, 7, 3, 5, 6, 2, 4, 9, 8],
        [7, 4, 0, 1, 3, 9, 6, 8, 5, 2]
    ];

    public static REDIS_KEY_PREFIX: string = 'pecorino-domain:accountNumber';
    public static MAX_LENGTH_OF_SEQUENCE_NO: number = 10;

    public readonly redisClient: ioredis.Redis;

    constructor(redisClient: ioredis.Redis) {
        this.redisClient = redisClient;
    }

    /**
     * チェックディジットを求める
     */
    public static GET_CHECK_DIGIT(source: string): number {
        if (source.length !== RedisRepository.MAX_LENGTH_OF_SEQUENCE_NO) {
            throw new factory.errors.Argument('source', `Source length must be ${RedisRepository.MAX_LENGTH_OF_SEQUENCE_NO}.`);
        }

        let sum = 0;
        source.split('').reverse().forEach((digitNumber, index) => {
            sum += parseInt(digitNumber, 10) * RedisRepository.CHECK_DIGIT_WEIGHTS[index];
        });
        const checkDigit = 11 - (sum % 11);

        // 2桁の場合0、1桁であればそのまま(必ず1桁になるように)
        return (checkDigit >= 10) ? 0 : checkDigit;
    }

    // public static VALIDATE(paymentNo: string): boolean {
    //     // if (paymentNo.length !== RedisRepository.MAX_LENGTH_OF_SEQUENCE_NO + 2) {
    //     //     return false;
    //     // }
    //     if (paymentNo.length !== RedisRepository.MAX_LENGTH_OF_SEQUENCE_NO + 1) {
    //         return false;
    //     }

    //     const sequeceNo = RedisRepository.DECODE(paymentNo);
    //     const checkDigit = RedisRepository.GET_CHECK_DIGIT(
    //         RedisRepository.PAD(sequeceNo.toString(), RedisRepository.MAX_LENGTH_OF_SEQUENCE_NO, '0')
    //     );
    //     // const checkDigit2 = RedisRepository.getCheckDigit2(pad(sequeceNo.toString(), RedisRepository.MAX_LENGTH_OF_SEQUENCE_NO, '0'));
    //     debug('validating...', paymentNo, sequeceNo, checkDigit);

    //     return (
    //         // parseInt(paymentNo.substr(-1), 10) === checkDigit
    //         parseInt(paymentNo.substr(0, 1), 10) === checkDigit
    //     );
    // }

    // public static DECODE(paymentNo: string): number {
    //     // 購入番号から、並び替えられた連番を取り出し、元の連番に並び替えなおす
    //     // const checkDigit = parseInt(paymentNo.substr(-1), 10);
    //     const checkDigit = parseInt(paymentNo.substr(0, 1), 10);
    //     // const strs = paymentNo.substr(1, paymentNo.length - 2);
    //     const strs = paymentNo.substr(1);
    //     const sortType = RedisRepository.SORT_TYPES_PAYMENT_NO[checkDigit];
    //     debug(checkDigit, strs, sortType);

    //     const source = Array.from(Array(RedisRepository.MAX_LENGTH_OF_SEQUENCE_NO)).reduce(
    //         (a, __, weightNumber) => <string>a + strs.substr(sortType.indexOf(weightNumber), 1),
    //         ''
    //     );

    //     return Number(source);
    // }

    /**
     * 口座番号を発行する
     * @param date 採番対象の日付
     */
    public async publish(openDate: Date): Promise<string> {
        // 上映日を過ぎたら期限が切れるようにTTLを設定
        const now = moment();
        const TTL = moment(openDate).add(1, 'day').diff(now, 'seconds');
        debug(`TTL:${TTL} seconds`);
        const date = moment(openDate).format('YYMMDD');
        const key = `${RedisRepository.REDIS_KEY_PREFIX}.${date}`;

        const results = await this.redisClient.multi()
            .incr(key, debug)
            .expire(key, TTL)
            .exec();
        debug('results:', results);

        if (results[0] === undefined || !Number.isInteger(results[0][1])) {
            throw new factory.errors.ServiceUnavailable();
        }

        const no: number = results[0][1];
        debug('no incremented.', no);

        // {RedisRepository.MAX_LENGTH_OF_SEQUENCE_NO}桁になるように0で埋める
        const source = `${date}${`0000${no.toString()}`.slice(-(RedisRepository.MAX_LENGTH_OF_SEQUENCE_NO - date.length))}`;
        const checKDigit = RedisRepository.GET_CHECK_DIGIT(source);
        debug('source:', source, 'checKDigit:', checKDigit);

        // sortTypes[checkDigit]で並べ替える
        const sortType = RedisRepository.SORT_TYPES_PAYMENT_NO[checKDigit];
        debug('sortType:', sortType);

        return `${checKDigit.toString()}${sortType.map((index) => source.substr(index, 1)).join('')}`;
    }
}
