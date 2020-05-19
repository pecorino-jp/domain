/**
 * 通貨転送返金
 */
const mongoose = require('mongoose');

const pecorino = require('../');

mongoose.connect(process.env.MONGOLAB_URI)
    .then(async () => {
        const accountRepo = new pecorino.repository.Account(mongoose.connection);
        const actionRepo = new pecorino.repository.Action(mongoose.connection);
        const transactionRepo = new pecorino.repository.Transaction(mongoose.connection);

        try {
            await pecorino.service.account.returnMoneyTransfer({
                data: {
                    id: '5ec0d8be4e823f2c287a47c1',
                    purpose: {
                        typeOf: 'Deposit',
                        id: '5ebf28bed3ae7f0008f7a646'
                    }
                }
            })({
                account: accountRepo,
                action: actionRepo,
                transaction: transactionRepo
            });
        } catch (error) {
            console.error(error.message);
        }

        // await mongoose.disconnect();
    });
