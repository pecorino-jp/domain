/**
 * 期限切れ取引監視
 * @ignore
 */

const moment = require('moment');
const pecorino = require('../');

pecorino.mongoose.connect(process.env.MONGOLAB_URI);

let countExecute = 0;

const MAX_NUBMER_OF_PARALLEL_TASKS = 10;
const INTERVAL_MILLISECONDS = 200;
const taskRepository = new pecorino.repository.Task(pecorino.mongoose.connection);
const transactionRepository = new pecorino.repository.Transaction(pecorino.mongoose.connection);

setInterval(
    async () => {
        if (countExecute > MAX_NUBMER_OF_PARALLEL_TASKS) {
            return;
        }

        countExecute += 1;

        try {
            console.log('exporting tasks...');
            await pecorino.service.transaction.pay.exportTasks(
                pecorino.factory.transactionStatusType.Expired
            )(taskRepository, transactionRepository);
        } catch (error) {
            console.error(error.message);
        }

        countExecute -= 1;
    },
    INTERVAL_MILLISECONDS
);

console.log('test');


