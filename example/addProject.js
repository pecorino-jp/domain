
const chevre = require('../lib/index');
const mongoose = require('mongoose');

const project = { typeOf: 'Project', id: process.env.PROJECT_ID };

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const accountRepo = new chevre.repository.Account(mongoose.connection);

    const cursor = await accountRepo.accountModel.find(
        {
            // modifiedTime: {
            //     $gte: moment().add(-24, 'months').toDate(),
            //     $lte: moment().add(-12, 'months').toDate(),
            // },
        },
        {
            project: 1,
            createdAt: 1,
        }
    )
        // .sort({ modifiedTime: 1, })
        .cursor();
    console.log('accounts found');

    let i = 0;
    let updateCount = 0;
    await cursor.eachAsync(async (doc) => {
        i += 1;
        const account = doc.toObject();

        if (account.project !== undefined && account.project !== null) {
            console.log('already exists', account.id, account.createdAt, i);
        } else {
            updateCount += 1;
            await accountRepo.accountModel.findOneAndUpdate(
                { _id: account.id },
                { project: project }
            )
                .exec();
            console.log('updated', account.id, i);
        }
    });

    console.log(i, 'accounts checked');
    console.log(updateCount, 'accounts updated');
}

main()
    .then()
    .catch(console.error);
