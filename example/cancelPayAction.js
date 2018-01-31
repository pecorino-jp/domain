/**
 * 支払取引中止
 * @ignore
 */

const moment = require('moment');
const pecorino = require('../');

pecorino.mongoose.connect(process.env.MONGOLAB_URI);

let count = 0;

const MAX_NUBMER_OF_PARALLEL_TASKS = 10;
const INTERVAL_MILLISECONDS = 200;
const taskRepository = new pecorino.repository.Task(pecorino.mongoose.connection);

setInterval(
    async () => {
        if (count > MAX_NUBMER_OF_PARALLEL_TASKS) {
            return;
        }

        count += 1;

        try {
            await pecorino.service.task.executeByName(
                pecorino.factory.taskName.CancelPayAction
            )(taskRepository, pecorino.mongoose.connection);
        } catch (error) {
            console.error(error.message);
        }

        count -= 1;
    },
    INTERVAL_MILLISECONDS
);
