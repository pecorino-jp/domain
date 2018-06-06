/**
 * 現金転送実行
 * @ignore
 */

const pecorino = require('../');

pecorino.mongoose.connect(process.env.MONGOLAB_URI)
    .then(async () => {
        const taskRepo = new pecorino.repository.Task(pecorino.mongoose.connection);

        try {
            await pecorino.service.task.executeByName(
                pecorino.factory.taskName.MoneyTransfer
            )({ taskRepo: taskRepo, connection: pecorino.mongoose.connection });
        } catch (error) {
            console.error(error.message);
        }

        await pecorino.mongoose.disconnect();
    });
