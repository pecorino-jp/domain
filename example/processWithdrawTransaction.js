/**
 * 支払取引プロセスサンプル
 * @ignore
 */

const moment = require('moment');
const pecorino = require('../');

async function main() {
    await pecorino.mongoose.connect(process.env.MONGOLAB_URI);

    const accountRepo = new pecorino.repository.Account(pecorino.mongoose.connection);
    const transactionRepo = new pecorino.repository.Transaction(pecorino.mongoose.connection);
    const transaction = await pecorino.service.transaction.withdraw.start({
        object: {
            clientUser: {},
            accountType: 'Coin',
            fromAccountId: 'fromAccountId',
            toAccountId: 'toAccountId',
            price: 100,
            notes: 'agentId'
        },
        expires: moment().add(30, 'seconds').toDate(),
        agent: {
            id: 'agentId',
            name: 'agentName'
        },
        recipient: {
            id: 'recipientId',
            name: 'recipientName'
        }
    })({ account: accountRepo, transaction: transactionRepo });
    console.log('transaction started.', transaction.id);

    // await pecorino.service.transaction.pay.cancel('agentId', transaction.id)(accountRepo, transactionRepo);

    await pecorino.service.transaction.pay.confirm(transaction.id)({ transaction: transactionRepo });

    // await pecorino.service.transaction.pay.execute(transaction.id)(accountRepo, transactionRepo);
}

main()
    .then(() => {
        console.log('success!');
    })
    .catch(console.error)
    .then(async () => {
        await pecorino.mongoose.disconnect();
    });
