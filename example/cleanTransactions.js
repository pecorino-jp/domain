const moment = require('moment');
const mongoose = require('mongoose');
const domain = require('../');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI, { autoIndex: false });

    const now = new Date();
    const startThrough = moment(now)
        .add(-12, 'months')
        .toDate();

    console.log('deleting...startThrough:', startThrough);

    const transactionRepo = new domain.repository.AccountTransaction(mongoose.connection);

    let result;

    result = await transactionRepo.transactionModel.deleteMany({
        status: { $in: [domain.factory.transactionStatusType.Canceled, domain.factory.transactionStatusType.Confirmed, domain.factory.transactionStatusType.Expired] },
        startDate: { $lt: startThrough }
    })
        .exec();
    console.log('transactions deleted', result);

    // await mongoose.disconnect();
}

main().then(() => {
    console.log('success!');
}).catch((error) => {
    console.error(error);
    process.exit(1);
});
