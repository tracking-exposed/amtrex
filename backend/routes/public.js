const _ = require('lodash');
const moment = require('moment');
const debug = require('debug')('routes:public');

const params = require('../lib/params');
const automo = require('../lib/automo');
const CSV = require('../lib/CSV');
const utils = require('../lib/utils');

// This variables is used as cap in every readLimit below
const PUBLIC_AMOUNT_ELEMS = 110;
// This is in regards of the 'last' API cache, (which might be discontinued?)
const CACHE_SECONDS = 10;

const cache = {
    seconds: CACHE_SECONDS,
    content: null,
    computedAt: null,
    next: null,
};

function formatReturn(updated) {
    if(updated) {
        cache.content = updated.content;
        cache.computedAt = updated.computedAt;
        cache.next = updated.next
    }
    return {
        json: {
            content: cache.content,
            computedt: cache.computedAt.toISOString(),
            next: cache.next.toISOString(),
            cacheTimeSeconds: cache.seconds,
        }
    };
};

async function getLast(req) {

    const amount = req.params.amount ? _.parseInt(req.params.amount) : 40;

    if(_.isNull(cache.content) || (cache.next && moment().isAfter(cache.next)) ) {
        // if not initialized ^^^^ or if the cache time is expired: do the query
        const last = await automo.getMetadataByFilter({
            type: 'search',
        }, { amount, skip: 0 });

        const uniquified = _.reduce(last, function(memo, m) {

            if(!m.href)
                return memo;

            if(memo.lastHref == m.href)
                return memo;

            memo.lastHref = m.href;
            memo.acc.push(m);
            return memo;
        }, { acc: [], lastHref: null } );

        const unique = _.take(_.sortBy(uniquified.acc, { savingTime: -1}), amount);
        debug("This should reviewed and made pointless by a more accurate collection - accu %d - returned %d - final %d limit %d",
            _.size(uniquified.acc), _.size(last), _.size(unique), amount);

        let freshContent = _.map(unique, function(meta) {
            const d = moment.duration( moment(meta.savingTime) - moment() );
            meta.timeago = d.humanize() + ' ago';
            meta.pseudo = utils.string2Food(meta.publicKey);
            meta.secondsago = d.asSeconds();
            meta.results = _.sortBy(meta.results, 'index');
            _.unset(meta, '_id');
            return meta;
        });
        let cacheFormat = {
            content: _.reverse(_.orderBy(freshContent, 'secondsago')),
            computedAt: moment(),
            next: moment().add(cache.seconds, 'seconds')
        };
        debug("Returning %d last research, which become part of a %f minutes long cache",
            _.size(freshContent), _.map(freshContent, 'title'), _.round(CACHE_SECONDS / 60, 1) );
        return formatReturn(cacheFormat);
    }
    else {
        debug("Returning cached search results");
        return formatReturn();
    }
};


async function getSearchCSV(req) {

    const quanto = await getLast({ params: { amount: 200 }});
    const produced = _.reduce(quanto.json.content, function(memo, e) {
        const sequence = _.flatten(_.map(e.results, 'price'));
        let avg = 0;
        if(_.size(sequence) > 0) {
            avg = _.round(_.sum(sequence) / _.size(sequence), 1);
        }
        const lines = _.map(e.results, function(r) {
            let productId = _.size(r.chunks) ? r.chunks[3] : null;

            if(!productId || _.size(productId) != 10)
                return null;

            return {
                pseudo: e.pseudo,
                timeago: e.timeago,
                query: e.query,
                savingTime: e.savingTime,
                order: r.order,
                index: r.index,
                rawndx: r.rawndx,
                product: r.name,
                productId,
                value: _.first(r.price),
                average: avg
            }
        });

        memo = _.concat(memo, _.compact(lines));
        return memo;
    }, []);

    const csv = CSV.produceCSVv1(produced);
    if(!_.size(csv))
        return { text: "Error, Zorry: 🤷" };

    return {
        headers: {
            "Content-Type": "csv/text",
            "Content-Disposition": "attachment; filename=full-search.csv" 
        },
        text: csv,
    };
}

async function getVideoId(req) {
    // of course changed to work with productId but all the keywords are the same 
    const { amount, skip } = params.optionParsing(req.params.paging, PUBLIC_AMOUNT_ELEMS);
    debug("getVideoId %s amount %d skip %d default %d",
        req.params.query, amount, skip, PUBLIC_AMOUNT_ELEMS);

    const entries = await automo.getMetadataByFilter({ productId: req.params.query}, { amount, skip });
    let sidecounter = [];
    const evidences = _.map(entries, function(e) {
        sidecounter.push(_.size(_.map(e.related, 'name')));
        return {
            productName: e.productName,
            productId: e.productId,
            publicKey: e.publicKey,
            id: e.id,
            savingTime: e.savingTime,
            recommended: _.map(e.related, 'name')
        }
    });
    debug("getVideoId found %d entries and %j recommended", _.size(evidences), sidecounter);
    return { json: evidences };
};

async function getRelated(req) {
    const { amount, skip } = params.optionParsing(req.params.paging, PUBLIC_AMOUNT_ELEMS);
    debug("getRelated %s query directly 'related.videoId'. amount %d skip %d", req.params.query, amount, skip);
    const entries = await automo.getMetadataByFilter({ "related.videoId": req.params.query }, { amount, skip});
    const evidences = _.map(entries, function(meta) {
        meta.related = _.map(meta.related, function(e) {
            return _.pick(e, ['title', 'source', 'index', 'foryou', 'videoId']);
        });
        meta.timeago = moment.duration( meta.savingTime - moment() ).humanize();
        _.unset(meta, '_id');
        return meta;
    });
    debug("getRelated: returning %d matches about %s", _.size(evidences), req.params.query);
    return { json: evidences };
};

async function getVideoCSV(req) {
    // /api/v1/videoCSV/:query/:amount
    const MAXENTRY = 2800;
    const { amount, skip } = params.optionParsing(req.params.paging, MAXENTRY);
    debug("getVideoCSV %s, amount %d skip %d (default %d)", req.params.query, amount, skip, MAXENTRY);
    const byrelated = await automo.getRelatedByVideoId(req.params.query, { amount, skip} );
    const csv = CSV.produceCSVv1(byrelated);
    const filename = 'video-' + req.params.query + "-" + moment().format("YY-MM-DD") + ".csv"
    debug("VideoCSV: produced %d bytes, returning %s", _.size(csv), filename);

    if(!_.size(csv))
        return { text: "Error, Zorry: 🤷" };

    return {
        headers: {
            "Content-Type": "csv/text",
            "Content-Disposition": "attachment; filename=" + filename
        },
        text: csv,
    };
};

async function getByAuthor(req) {
    /* this API do not return the standard format with videos and related inside,
     * but a data format ready for the visualization provided - this has been 
     * temporarly suspended: https://github.com/tracking-exposed/youtube.tracking.exposed/issues/18 */

    const { amount, skip } = params.optionParsing(req.params.paging, PUBLIC_AMOUNT_ELEMS);
    debug("getByAuthor %s amount %d skip %d", req.params.query, amount, skip);

    let authorStruct;
    try {
        authorStruct = await automo.getMetadataFromAuthor({
            videoId: req.params.query
        }, { amount, skip});
    } catch(e) {
        debug("getByAuthor error: %s", e.message);
        return {
            json: {
                error: true,
                message: e.message
            }
        }
    }

    const authorName = authorStruct.authorName;
    debug("getByAuthor returns %d elements from %s",
        _.size(authorStruct.content), authorName);

    const publicFields = ['id', 'title', 'savingTime', 'videoId', 'linkinfo',
        'viewInfo', 'related', 'authorName', 'authorSource', 'publicationString' ];

    const clean = _.map(authorStruct.content, function(e) {
        // id is anonymized in this way, and is still an useful unique id
        e.id = e['id'].substr(0, 20);
        return _.pick(e, publicFields)
    });

    /* first step is separate the three categories and merge infos */
    const sameAuthor = _.map(clean, function(video) {
        return _.map(_.filter(video.related, { source: authorName }), function(r) {
            return {
                watchedTitle: video.title,
                id: video.id + r.videoId,
                savingTime: video.savingTime,
                watchedVideoId: video.videoId,
                relatedVideoId: r.videoId,
                relatedTitle: r.title,
            }
        });
    });

    const foryou = _.map(clean, function(video) {
        return _.map(_.filter(video.related, { foryou: true }), function(r) {
            return {
                watchedTitle: video.title,
                id: video.id + r.videoId,
                savingTime: video.savingTime,
                watchedVideoId: video.videoId,
                relatedVideoId: r.videoId,
                relatedTitle: r.title,
                relatedAuthorName: authorName,
            }
        });
    });

    const treasure = _.map(clean, function(video) {
        debug("byAuthor quick check ø SA %d FY %d T %d (total %d)", 
            _.size(_.filter(video.related, { source: authorName })),
            _.size(_.filter(video.related, { foryou: true })),
            _.size( _.reject( _.reject(video.related, { source: authorName }), { foryou: true })),
            _.size(clean)
        );
        return _.map( _.reject( _.reject(video.related, { source: authorName }), { foryou: true }), function(r) { 
            return {
                id: video.id + r.videoId,
                watchedTitle: video.title,
                watchedVideoId: video.videoId,
                savingTime: video.savingTime,
                relatedVideoId: r.videoId,
                relatedTitle: r.title,
                relatedAuthorName: authorName,
            }
        });
    })

    /* second step to filter them by time (if needed) */
    /* and filter the fields */

    /* this step is group and count */
    const csa = _.groupBy(_.flatten(sameAuthor), 'relatedVideoId');
    const cfy = _.groupBy(_.flatten(foryou), 'relatedVideoId');
    const ct = _.groupBy(_.flatten(treasure), 'relatedVideoId');

    const reduced = {
        sameAuthor: csa,
        foryou: cfy,
        treasure: ct,
    };

    debug("byAuthor [%s], %d evidences, returning %d bytes instead of %d", 
        authorName,
        _.size(authorStruct.content),
        _.size(JSON.stringify(reduced)),
        _.size(JSON.stringify(authorStruct.content))
    );

    return { json: {
        authorName,
        content: reduced,
        authorSource: authorStruct.authorSource,
        paging: authorStruct.paging,
        total: authorStruct.total,
    }};
};


module.exports = {
    getLast,
    getVideoId,
    getRelated,
    getVideoCSV,
    getByAuthor,
    getSearchCSV,
};
