/**
 * 口座開設サンプル
 * @ignore
 */

const moment = require('moment');
const pecorino = require('../');

pecorino.mongoose.connect(process.env.MONGOLAB_URI);

async function main() {
    const accountRepo = new pecorino.repository.Account(pecorino.mongoose.connection);
    const account = await pecorino.service.account.open({
        id: 'sskts-movieTheater-118',
        name: '[development]シネマサンシャイン姶良',
        initialBalance: 1000000000
    })({ account: accountRepo });
    console.log('account opend.', account);
}

main()
    .then(() => {
        console.log('success!');
    })
    .catch(console.error)
    .then(() => {
        pecorino.mongoose.disconnect();
    });
