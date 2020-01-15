const _ = require('lodash');
const moment = require('moment');
const debug = require('debug')('routes:monitor');

const automo = require('../lib/automo');
const params = require('../lib/params');

async function getMonitor(req) {

    const MINUTES = 5;
    const minutesAgo = params.getInt(req, 'minutes', MINUTES);
    const timeBehind = moment().subtract(minutesAgo, 'minutes').toISOString();
    const amount = 30;
    debug("getMonitor request: contents since %d minutes ago: %s (max %d)",
        minutesAgo, timeBehind, amount);

    const lastExecution = new Date();
    const content = await automo.getMixedDataSince([
        [ 'supporters',
            [ 'publicKey', 'p', 'creationTime', 'version'],
            'creationTime' ],
        [ 'htmls',
            [ 'id', 'metadataId', 'savingTime', 'processed', 'selector', 'href', 'size', 'publicKey'],
            'savingTime' ],
            /* it might have type='search' or ='product' */
        [ 'metadata',
            [ 'id', 'publicKey', 'savingTime', 'results', 'query', 'type', 'productName', 'sections' , 'productId'],
            'savingTime' ]
    ], new Date(timeBehind), amount );

    debug("getMixedDataSince from DB: %j", _.countBy(content, 'template'));
    // the key template='info' is added if any special condition is triggered
    // the key 'template' and 'relative' are always added

    const fixed = _.map(content, function(e) {
        /* this allow us, client side, to keep a separated template instead of
         * a condition check in metadata template */
        if(e.template == 'metadata') {
            e.template = e.type;
            _.unset(e, 'type');
            return e;
        }
        return e;
    })

    const ordered = _.orderBy(fixed, [ 'timevar' ], [ 'desc' ]);
    return {
        json: {
            content: ordered,
            start: moment(lastExecution).format('HH:mm:ss'),
            end: moment(new Date()).format('HH:mm:ss'),
            duration: moment.duration(moment() - moment(lastExecution)).asSeconds(),
        }
    };
};

module.exports = {
    getMonitor,
};