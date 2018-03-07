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


    const actionsStr = tradeActions.map(
        (a) => {
            let actionName = '';
            switch (a.typeOf) {
                case 'PayAction':
                    actionName = '支払';
                    break;
                case 'TakeAction':
                    actionName = '入金';

                default:
            }

            return [
                '●',
                (a.typeOf === 'PayAction') ? '出' : '入',
                actionName,
                moment(a.endDate).format('YY.MM.DD HH:mm'),
                `${a.object.price}円`
            ].join(' ')
                + '\n'
                + [
                    (a.typeOf === 'PayAction') ? a.recipient.name : a.agent.name,
                    a.object.notes
                ].join(' ');
        }
    ).join('\n');
    console.log(actionsStr);
    // console.log(tradeActions.map((a) => `${moment(a.endDate).format('YYYY-MM-DD')} ${a.typeOf} ${a.object.price} ${a.recipient.name}`).join('\n'));
}

main()
    .then(() => {
        console.log('success!');
    })
    .catch(console.error)
    .then(() => {
        pecorino.mongoose.disconnect();
    });
