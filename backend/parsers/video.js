#!/usr/bin/env node
const _ = require('lodash');
const debug = require('debug')('parser:video');
const errorlike = require('debug')('metadata:likes');
const errorview = require('debug')('metadata:view');
const errorrele = require('debug')('metadata:related');
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

function product(envelop) {

    const D = envelop.jsdom;
    const chunks = envelop.impression.href.split('/');
    let productName, 
        sections,
        related,
        brandUrl,
        productId;

    if( _.size(chunks[5]) == 10 ) {
        productId = chunks[5];
    } else if( _.size(chunks[4]) == 10 ) {
        productId = chunks[4];
    } else if( _.size(chunks[5]) > 40) {
        productId = chunks[5].split('?')[0];
        debug("Condition-X: %s taking %s",
            JSON.stringify(chunks[5].split('?'), undefined, 2), productId);
    }

    if(!productId)
        debug("productId not found in %j", chunks);

    try {
        const t = D.querySelectorAll('h1#title');
        if( t.length > 1) {
            debug("more than one title? ");
            debugger;
        }
        productName = _.first(t).textContent;
        if(_.size(productName) == 0) {
            debug("Error: not found productName!");
            debugger;
        }

        productName = productName.replace(/\n/g, '');

        // x = D.querySelectorAll('[data-feature-name="titleBlock"]')

        const img = D.querySelectorAll('[data-feature-name="titleBlock"] img')[0];
        brandUrl = img ? img.getAttribute('src') : null;

        sections = _.map(D.querySelectorAll('h2.a-carousel-heading'), function(entry) {
            // > D.querySelectorAll('h2.a-carousel-heading')[0].textContent
            // '4 stars and aboveSponsored'
            return entry.textContent.replace(/Sponsored$/, '');
        });

        related = _.compact(_.map(D.querySelectorAll('[href^="/product-review"]'), function(entry) {

            if(entry.parentNode.parentNode.tagName != 'DIV')
                return null;
            
            let ref = guessTheAnchor(entry);
            /* this function try some combination of 
                entry.parentNode...parentNode...children[0]
               and find the 'a' of the product, it is used as reference */

            if(!ref) return null;

            let name = ref.textContent;
            let link = ref.getAttribute('href');
            let chunks = link.split('/');
            let params = querystring.parse(_.last(chunks));

            let cost = ref.parentNode.parentNode.outerHTML.replace(/.*-price">/, '').replace(/<.*/, '');
            let dollars = _.reduce(cost.replace(/\$/, '').split('.'), function(memo, decimal, position) {
                const value = _.round(decimal * ( position == 0 ? 1 : 0.01 ), 2);
                memo += value;
                return memo;
            }, 0);
            // debug("cost %s = dollars %d", cost, dollars);

            let thumbnail = findThumbnailURL(ref);
            return { name, link, chunks, cost, params, dollars, thumbnail };
        }));

    } catch(error) {
        debug(`Unable to mine related: ${error.message}, ${error.stack.substr(0, 220)}...`);
        return null;
    }

    return {
        productId,
        chunks,
        productName,
        sections,
        related,
        brandUrl,
    };
};


module.exports = {
    product,
};
