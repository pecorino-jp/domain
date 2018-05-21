/**
 * 取引レポート出力
 * @ignore
 */
// const fs = require('fs');
const moment = require('moment');
const pecorino = require('../');

pecorino.mongoose.connect(process.env.MONGOLAB_URI);

async function main() {
    const transactionRepo = new pecorino.repository.Transaction(pecorino.mongoose.connection);
    const report = await pecorino.service.report.download(
        {
            startFrom: moment().add(-1, 'week').toDate(),
            startThrough: moment().toDate()
        },
        'csv'
    )({ transaction: transactionRepo });
    console.log('report created.', report);
    // fs.writeFileSync(`${__dirname}/transactions.csv`, report);
}

main()
    .then(() => {
        console.log('success!');
    })
    .catch(console.error)
    .then(async () => {
        await pecorino.mongoose.disconnect();
    });
