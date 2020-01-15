var _ = require('lodash');
var debug = require('debug')('routes:htmlunit');
var nconf = require('nconf');

const mongo3 = require('../lib/mongo3');

async function unitById(req) {
    // API v2, updated meaning: specify a metadataId, and return the HTMLs.
    const mongoc = await mongo3.clientConnect({concurrency: 1});

    var metadataId = req.params.metadataId;

    const htmls = await mongo3.readLimit(mongoc,
        nconf.get('schema').htmls, { metadataId }, { savingTime: -1 }, 10, 0);

    await mongoc.close();

    debug("HTMLs matching metadataId %s = %d (limit 10)", metadataId, _.size(htmls));
    return { json: htmls };
}

module.exports = {
    unitById
};
