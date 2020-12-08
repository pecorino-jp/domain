const mongoose = require('mongoose');
const moment = require('moment');

const pecorino = require('../');

mongoose.connect(process.env.MONGOLAB_URI);

// const identifier = 'sample';

async function main() {
    const transactionRepo = new pecorino.repository.Transaction(mongoose.connection);
    const transaction = await transactionRepo.startByIdentifier(
        pecorino.factory.transactionType.Deposit,
        {
            project: { id: 'cinerino', typeOf: 'Project' },
            typeOf: pecorino.factory.transactionType.Deposit,
            // identifier,
            transactionNumber: moment().valueOf(),
            agent: { typeOf: 'Person', name: 'sample' },
            recipient: { typeOf: 'Person', name: 'sample' },
            object: {
                amount: 1,
                toLocation: {
                    typeOf: 'PrepaidPaymentCard',
                    accountType: 'JPY',
                    accountNumber: '139485855034733'
                }
            },
            expires: moment().add(10, 'seconds').toDate()
        });
    console.log(transaction);
}

main().then(() => {
    console.log('success!');
}).catch(console.error)
    .then(() => {
        // mongoose.disconnect();
    });
