#!/usr/bin/env node
const _ = require('lodash');
const debug = require('debug')('parser:search');
const querystring = require('querystring');

const stats = { skipped: 0, error: 0, suberror: 0, success: 0 };

function guessTheAnchor(e) {
    const combos = [
        'parentNode.parentNode.children[0]', // sometime is this
        'parentNode.parentNode.parentNode.children[0]',
        'parentNode.parentNode.children[0].children[0]' // others is this
    ];

    const found = _.reduce(combos, function(memo, path, i) {
        if(memo) return memo;
        const tbt = _.get(e, path);
        if(!tbt) return memo;
        const href = tbt.getAttribute('href');
        if(!href) return memo;

        if(_.startsWith(href, '/product-review'))
            return memo;

        if(_.size(href) > 200) {
            // debug("Success guessTheAnchor: %d", i);
            return tbt;
        }
    }, null);

    if(!found) { debug("Failure in guessTheAnchor"); debugger; }
    return found;
}

function getOffset(bodystring, elementstr) {
    return bodystring.indexOf(elementstr);
}

function findThumbnailURL(e) {
    const combos = [
        'parentNode',
        'parentNode.parentNode',
        'parentNode.parentNode.parentNode',
    ];

    const found = _.reduce(combos, function(memo, path, i) {
        if(memo) return memo;
        const tbt = _.get(e, path);
        if(!tbt) return memo;
        const possibleURL = tbt.outerHTML.replace(/.*src="/, '').replace(/".*/, '');
        if(possibleURL.match(/\.jpg$/))
            return possibleURL;
    }, null);

    if(!found) { debug("Failure in findThumbnailURL"); debugger; }
    return found;
};

function search(envelop) {

    const D = envelop.jsdom;

    const searchResults = D.querySelectorAll('div[data-cel-widget^="search_result_"]');

    debug("results: %d", _.size(searchResults) );

    const results = _.reduce(searchResults, function(memo, e) {
        const dataIndex = e.getAttribute('data-index');
        const celWidget = e.getAttribute('data-cel-widget').substr(14);
        let orders = {
            rawndx: dataIndex,
            index: _.parseInt(dataIndex),
            order: _.parseInt(celWidget)
        };
        let aa = e.querySelectorAll('a');

        /* a product in the 'aa' constainàs:
         Il nome della rosa
         4.2 out of 5 stars
         20
         Audible Audiobook
         $0.00$0.00$13.27$13.27
         Kindle
         Paperback
         Hardcover
         Book Supplement
         */

        let product = _.reduce(aa, function(mmm, node) {
            if(node.textContent.match(/€/)) {
                let prices = node.textContent.split('€');
                mmm.price = _.uniq(_.compact(
                    _.map(_.map(prices, _.trim), parseFloat)
                ));
                mmm.unit = 'euro';
            } else if(node.textContent.match(/\$/)) {
                let prices = node.textContent.split('$');
                mmm.price = _.uniq(_.compact(
                    _.map(_.map(prices, _.trim), parseFloat)
                ));
                mmm.unit = 'dollar';
            } else if(_.startsWith(node.textContent, '(')) {
                // debug("skipping: %s", node.textContent);
            } else if(!mmm.name) {
                let linked = node.parentNode.querySelectorAll('[href]');
                if(_.size(linked)) {
                    mmm.href = linked[0].getAttribute('href');
                }
                mmm.name = node.textContent.trim();
            } else {
                // debug("wasted: %s", node.textContent.trim());
            }

            return mmm;
        }, orders);

        memo.push(product);
        return memo;
    }, [])

    return { results };
};


module.exports = {
    search,
};
