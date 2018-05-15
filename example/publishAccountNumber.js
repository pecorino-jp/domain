/**
 * 口座番号発行サンプル
 * @ignore
 */

const moment = require('moment');
const pecorino = require('../');

const redisClient = new pecorino.ioredis({
    host: process.env.REDIS_HOST,
    // tslint:disable-next-line:no-magic-numbers
    port: parseInt(process.env.REDIS_PORT, 10),
    password: process.env.REDIS_KEY,
    tls: { servername: process.env.REDIS_HOST }
});

async function main() {
    const accountNumberRepo = new pecorino.repository.AccountNumber(redisClient);
    const no = await accountNumberRepo.publish(moment().format('YYMMDD'));
    console.log('account number published.', no);
}

main().then(() => {
    console.log('success!');
}).catch(console.error)
    .then(async () => {
        await redisClient.quit();
    });
