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

    const actionRepo = new domain.repository.AccountAction(mongoose.connection);

    let result;

    result = await actionRepo.actionModel.deleteMany({
        actionStatus: { $in: [domain.factory.actionStatusType.CanceledActionStatus, domain.factory.actionStatusType.CompletedActionStatus, domain.factory.actionStatusType.FailedActionStatus] },
        startDate: { $lt: startThrough }
    })
        .exec();
    console.log('actions deleted', result);

    // await mongoose.disconnect();
}

main().then(() => {
    console.log('success!');
}).catch((error) => {
    console.error(error);
    process.exit(1);
});
