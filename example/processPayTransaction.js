/**
 * 支払取引プロセスサンプル
 * @ignore
 */

const moment = require('moment');
const pecorino = require('../');

pecorino.mongoose.connect(process.env.MONGOLAB_URI);

async function main() {
    const accountRepo = new pecorino.repository.Account(pecorino.mongoose.connection);
    const transactionRepo = new pecorino.repository.Transaction(pecorino.mongoose.connection);
    const transaction = await pecorino.service.transaction.pay.start({
        object: {
            clientUser: {},
            accountId: 'accountId',
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
    })(accountRepo, transactionRepo);
    console.log('transaction started.', transaction.id);

    // await pecorino.service.transaction.pay.cancel('agentId', transaction.id)(accountRepo, transactionRepo);

    await pecorino.service.transaction.pay.confirm(transaction.id)(transactionRepo);

    // await pecorino.service.transaction.pay.execute(transaction.id)(accountRepo, transactionRepo);
}

main()
    .then(() => {
        console.log('success!');
    })
    .catch(console.error)
    .then(() => {
        pecorino.mongoose.disconnect();
    });
