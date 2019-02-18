/**
 * 現金転送実行
 */
const pecorino = require('../');

mongoose.connect(process.env.MONGOLAB_URI)
    .then(async () => {
        const taskRepo = new pecorino.repository.Task(mongoose.connection);

        try {
            await pecorino.service.task.executeByName(
                pecorino.factory.taskName.MoneyTransfer
            )({ taskRepo: taskRepo, connection: mongoose.connection });
        } catch (error) {
            console.error(error.message);
        }

        await mongoose.disconnect();
    });
