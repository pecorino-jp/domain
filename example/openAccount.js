/**
 * 口座開設サンプル
 */
const moment = require('moment');
const mongoose = require('mongoose');

const pecorino = require('../');

mongoose.connect(process.env.MONGOLAB_URI);

async function main() {

    const accountRepo = new pecorino.repository.Account(mongoose.connection);

    const accountNumber = moment().valueOf();
    const accounts = await accountRepo.open([{
        project: {
            typeOf: 'Project',
            id: 'cinerino'
        },
        typeOf: 'Account',
        accountType: 'Point',
        name: 'sample name',
        accountNumber: accountNumber,
        initialBalance: 0,
        openDate: new Date(),
    }]);
    console.log(accounts)
    console.log(accounts.length, 'accounts found.')
}

main().then(() => {
    console.log('success!');
}).catch(console.error)
    .then(() => {
        // mongoose.disconnect();
    });
