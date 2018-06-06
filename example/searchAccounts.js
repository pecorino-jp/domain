/**
 * 口座検索サンプル
 * @ignore
 */

const moment = require('moment');
const pecorino = require('../');

pecorino.mongoose.connect(process.env.MONGOLAB_URI);

async function main() {
    const accountRepo = new pecorino.repository.Account(pecorino.mongoose.connection);
    const accounts = await accountRepo.search({
        // ids: ['5af55d3821f0fa00a210f51c'],
        // statuses: ['Opened'],
        // name: 'tets'
    });
    // console.log(accounts)
    console.log(accounts.length, 'accounts found.')
}

main().then(() => {
    console.log('success!');
}).catch(console.error)
    .then(() => {
        pecorino.mongoose.disconnect();
    });
