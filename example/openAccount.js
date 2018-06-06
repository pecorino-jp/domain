/**
 * 口座開設サンプル
 * @ignore
 */

const moment = require('moment');
const pecorino = require('../');

pecorino.mongoose.connect(process.env.MONGOLAB_URI);

const redisClient = new pecorino.ioredis({
    host: process.env.REDIS_HOST,
    // tslint:disable-next-line:no-magic-numbers
    port: parseInt(process.env.REDIS_PORT, 10),
    password: process.env.REDIS_KEY,
    tls: { servername: process.env.REDIS_HOST }
});

async function main() {
    const accountRepo = new pecorino.repository.Account(pecorino.mongoose.connection);
    const accountNumberRepo = new pecorino.repository.AccountNumber(redisClient);
    const account = await pecorino.service.account.open({
        name: 'PECORINO TARO',
        initialBalance: 1000000000
    })({ account: accountRepo, accountNumber: accountNumberRepo });
    console.log('account opened.', account);
}

main()
    .then(() => {
        console.log('success!');
    })
    .catch(console.error)
    .then(async () => {
        await pecorino.mongoose.disconnect();
        await redisClient.quit();
    });
