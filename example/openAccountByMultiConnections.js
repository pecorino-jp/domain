/**
 * 口座開設サンプル
 */
const moment = require('moment');
const pecorino = require('../');

async function main(mongooseConnection, redisConnection) {
    const accountRepo = new pecorino.repository.Account(mongooseConnection);
    const accountNumberRepo = new pecorino.repository.AccountNumber(redisConnection);
    // const account = await accountRepo.open({
    //     name: 'account name',
    //     // accountNumber: moment().
    //     initialBalance: 0,
    //     openDate: new Date()
    // });
    const account = await pecorino.service.account.open({
        accountType: 'Coin',
        accountNumber: moment().unix().toString(),
        name: 'PECORINO TARO',
        initialBalance: 0
    })({ account: accountRepo, accountNumber: accountNumberRepo });
    console.log('account opened.', account.id);
}

async function openAccounts() {
    return new Promise((resolve) => {
        // MongoDB接続確保
        const mongooseConnection = mongoose.createConnection(process.env.MONGOLAB_URI);
        const redisClient = new pecorino.ioredis({
            host: process.env.REDIS_HOST,
            // tslint:disable-next-line:no-magic-numbers
            port: parseInt(process.env.REDIS_PORT, 10),
            password: process.env.REDIS_KEY,
            tls: { servername: process.env.REDIS_HOST }
        });

        let count = 0;
        let numOpenedAccount = 0;
        const MAX_NUBMER_OF_PARALLEL_TASKS = 10;
        const MAX_NUBMER_OF_ACCOUNTS = 10;
        const INTERVAL_MILLISECONDS = 100;

        let timer;
        timer = setInterval(
            async () => {
                // if (count > MAX_NUBMER_OF_PARALLEL_TASKS) {
                //     return;
                // }
                if (numOpenedAccount >= MAX_NUBMER_OF_ACCOUNTS) {
                    console.log(numOpenedAccount, 'accounts opened.');
                    await mongooseConnection.close()
                    await redisClient.quit();
                    clearInterval(timer);
                    resolve();
                }

                count += 1;

                try {
                    await main(mongooseConnection, redisClient);
                    numOpenedAccount += 1;
                } catch (error) {
                    console.error(error.message);
                }

                count -= 1;
            },
            INTERVAL_MILLISECONDS
        );
    });
}

let promises = Array.from(new Array(20)).map(async () => {
    await openAccounts();
});
Promise.all(promises)
    .then(() => {
        console.log('success!');
    })
    .catch(console.error);
