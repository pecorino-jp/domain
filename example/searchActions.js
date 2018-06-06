/**
 * アクション検索サンプル
 * @ignore
 */

const moment = require('moment');
const pecorino = require('../');

pecorino.mongoose.connect(process.env.MONGOLAB_URI);

async function main() {
    const actionRepo = new pecorino.repository.Action(pecorino.mongoose.connection);
    const actions = await actionRepo.search({
        typeOf: pecorino.factory.actionType.MoneyTransfer,
        startDateFrom: moment().add(-1, 'hour').toDate(),
        startDateThrough: moment().toDate(),
        // actionStatuses: [pecorino.factory.actionStatusType.CompletedActionStatus],
        // purposeTypeOfs: [pecorino.factory.transactionType.Transfer],
        fromLocationIds: ['5aeadf43a05f55009c25c5ae'],
        toLocationIds: ['5ae90f810343d35ebde45c68'],
        limit: 100
    });
    console.log(actions.length, 'actions found.')
}

main().then(() => {
    console.log('success!');
}).catch(console.error)
    .then(() => {
        pecorino.mongoose.disconnect();
    });
