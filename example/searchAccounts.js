/**
 * 口座検索サンプル
 */
const moment = require('moment');
const pecorino = require('../');

mongoose.connect(process.env.MONGOLAB_URI);

async function main() {
    const accountRepo = new pecorino.repository.Account(mongoose.connection);
    const accounts = await accountRepo.search({
        accountType: 'Coin',
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
        mongoose.disconnect();
    });
