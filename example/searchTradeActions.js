/**
 * 取引履歴検索サンプル
 * @ignore
 */

const moment = require('moment');
const pecorino = require('../');

pecorino.mongoose.connect(process.env.MONGOLAB_URI);

async function main() {
    const actionRepo = new pecorino.repository.Action(pecorino.mongoose.connection);
    const tradeActions = await pecorino.service.account.searchTradeActionsById({
        accountId: 'accountId'
    })(actionRepo);
    console.log(tradeActions.map((a) => `${moment(a.endDate).format('YYYY-MM-DD')} ${a.typeOf} ${a.object.price} ${a.recipient.name}`).join('\n'));
}

main()
    .then(() => {
        console.log('success!');
    })
    .catch(console.error)
    .then(() => {
        pecorino.mongoose.disconnect();
    });
