/**
 * 口座開設サンプル
 * @ignore
 */

const moment = require('moment');
const pecorino = require('../');

pecorino.mongoose.connect(process.env.MONGOLAB_URI);

async function main() {
    const accountRepo = new pecorino.repository.Account(pecorino.mongoose.connection);
    const account = await pecorino.service.account.open()({ account: accountRepo });
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
