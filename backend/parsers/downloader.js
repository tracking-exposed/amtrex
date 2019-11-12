const _ = require('lodash');
const nconf = require('nconf');
const debug = require('debug')('parsers:downloader');
const moment = require('moment');
const fetch = require('node-fetch');
const fs = require('fs');

const utils = require('../lib/utils');
const mongo3 = require('../lib/mongo3');

nconf.argv().env().file({ file: 'config/settings.json' });


async function update(metadata) {

    /* list of url and unique ids */
    const urls = _.uniqBy(_.map(metadata[1].related, function(r) {
        const id = utils.hash({ thumbnail: r.thumbnail });
        _.set(r.thumbnailId, id);
        return {
            id,
            thumbnail: r.thumbnail
        }
    }), 'id');

    const downloadable = [];
    const mongoc = await mongo3.clientConnect({concurrency: 1});

    /* check in the DB if the ID exists */
    for (const t of urls) {
        const exists = await mongo3.count(mongoc,
            nconf.get('schema').thumbnails, { id: t.id });
        if(exists == 1)
            return;
        else if(exists == 0)
            downloadable.push(t);
        else
            debug("fatal error, you forget the index!");
    }

    debug("Unique ID to fetch are %d", _.size(downloadable));
    for (const d of downloadable) {
        debug("Connecting to fetch: %s", d.thumbnail);

        await fetch(d.thumbnail)
            .then(function(response) {
                return [ response.buffer(), response.headers.raw() ];
            })
            .then(function(response) {
                const destpath = nconf.get('pictures') + '/' + d.id + '.jpg';
                fs.writeFileSync(destpath, response[0]);
                return mongo3.writeOne(mongoc, nconf.get('schema').thumbnails, {
                    id: d.id,
                    url: d.thumbnail,
                    content: destpath,
                    headers: response[1],
                });
            })
            .catch(function(e) {
                debug("Error in managing fetch %s: %s", d.id, e.message);
            });
    }

    return _.size(downloadable);
};

module.exports = {
    update
}
