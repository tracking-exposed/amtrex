#!/usr/bin/env node
const _ = require('lodash');
const debug = require('debug')('parser:search');


function search(envelop) {

    const D = envelop.jsdom;

    const searchResults = D.querySelectorAll('div[data-cel-widget^="search_result_"]');

    debug("results: %d", _.size(searchResults) );

    let thumbnailsCounter = 0; // this for side-effect debug
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
                mmm.raweuro = node.textContent.trim();
                let prices = mmm.raweuro.split('€');
                mmm.first = _.first(prices);
                mmm.unit = 'euro';
            // TODO disalignment between EURO and DOLLARS, parsing is in the 'route'
            } else if(node.textContent.match(/\$/)) {
                let prices = node.textContent.split('$');
                mmm.rawprice = node.textContent;
                mmm.price = _.uniq(_.compact(
                    _.map(_.map(prices, _.trim), parseFloat)
                ));
                mmm.unit = 'dollar';
            } else if (node.parentNode.textContent.match(/€/)) {
                x = node.parentNode.textContent.trim();
                x = x.replace(/Ulteriori\ opzioni\ di\ acquisto/, '');
                mmm.raweuro = x;
                mmm.first = _.first(x.split('€'));
                mmm.unit = 'euro';
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

            const thmb = node.querySelectorAll('img');
            if(thmb && thmb[0]) {
                mmm.thumbnail = thmb[0].getAttribute('src');
                thumbnailsCounter++;
            }

            return mmm;
        }, orders);

        memo.push(product);
        return memo;
    }, [])

    results.version = 3;
    debug("thumbnailsCounter %d id %s",
        thumbnailsCounter, envelop.impression.metadataId);
    return { results };
};


module.exports = {
    search,
};
