
const chevre = require('../lib/index');
const mongoose = require('mongoose');

const project = { typeOf: 'Project', id: process.env.PROJECT_ID };

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI);

    const actionRepo = new chevre.repository.Action(mongoose.connection);

    const cursor = await actionRepo.actionModel.find(
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
    console.log('actions found');

    let i = 0;
    let updateCount = 0;
    await cursor.eachAsync(async (doc) => {
        i += 1;
        const action = doc.toObject();

        if (action.project !== undefined && action.project !== null) {
            console.log('already exists', action.id, action.createdAt, i);
        } else {
            updateCount += 1;
            await actionRepo.actionModel.findOneAndUpdate(
                { _id: action.id },
                { project: project }
            )
                .exec();
            console.log('updated', action.id, i);
        }
    });

    console.log(i, 'actions checked');
    console.log(updateCount, 'actions updated');
}

main()
    .then()
    .catch(console.error);
