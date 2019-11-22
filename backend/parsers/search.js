#!/usr/bin/env node
const _ = require('lodash');
const debug = require('debug')('parser:search');

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
                    mmm.chunks = mmm.href.split('/');
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
