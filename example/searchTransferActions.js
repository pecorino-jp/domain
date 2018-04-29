/**
 * 取引履歴検索サンプル
 * @ignore
 */

const moment = require('moment');
const pecorino = require('../');

async function main() {
    await pecorino.mongoose.connect(process.env.MONGOLAB_URI);

    const actionRepo = new pecorino.repository.Action(pecorino.mongoose.connection);
    const actions = await pecorino.service.account.searchTransferActions({
        accountId: 'sskts-ilovegadd'
    })({ action: actionRepo });
    console.log(actions.map((a) => `${moment(a.endDate).format('YYYY-MM-DD HH:mm')} ${a.typeOf} ${a.amount} ${a.recipient.name} @${a.purpose.typeOf}`).join('\n'));
}

main()
    .then(() => {
        console.log('success!');
    })
    .catch(console.error)
    .then(() => {
        pecorino.mongoose.disconnect();
    });
