const domain = require('../lib');
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGOLAB_URI, { autoIndex: false });

    // Access the underlying database object provided by the MongoDB driver.
    let db = mongoose.connection.db;

    // Rename the `test` collection to `foobar`
    const result = await db.collection('actions')
        .rename('accountActions', { dropTarget: true });

    console.log(result);
}

main().then(console.log).catch(console.error);
