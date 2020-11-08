/**
 * アクション検索サンプル
 */
const mongoose = require('mongoose');

const pecorino = require('../');

mongoose.connect(process.env.MONGOLAB_URI);

async function main() {
    const actionRepo = new pecorino.repository.Action(mongoose.connection);
    const actions = await actionRepo.searchTransferActions({
        limit: 100,
        page: 1,
        // amount: { currency: { $eq: 'JPY' } },
        location: {
            typeOf: { $eq: 'PrepaidPaymentCard' },
            //  accountNumber: { $eq: '139485855034733' } 
        }
    });
    console.log(actions)
    console.log(actions.length, 'actions found.')
}

main().then(() => {
    console.log('success!');
}).catch(console.error)
    .then(() => {
        // mongoose.disconnect();
    });
