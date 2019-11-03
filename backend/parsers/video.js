#!/usr/bin/env node
const _ = require('lodash');
const debug = require('debug')('parser:video');
const errorlike = require('debug')('metadata:likes');
const errorview = require('debug')('metadata:view');
const errorrele = require('debug')('metadata:related');
const querystring = require('querystring');

const stats = { skipped: 0, error: 0, suberror: 0, success: 0 };


function product(envelop) {

    const chunks = envelop.impression.href.split('/');
    const D = envelop.jsdom;

    let productName, 
        sections,
        related,
        brandUrl;

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

        x = D.querySelectorAll('[data-feature-name="titleBlock"]')

        const img = D.querySelectorAll('[data-feature-name="titleBlock"] img')[0];
        brandUrl = img ? img.getAttribute('src') : null;

        sections = _.map(D.querySelectorAll('h2.a-carousel-heading'), function(entry) {
            // > D.querySelectorAll('h2.a-carousel-heading')[0].textContent
            // '4 stars and aboveSponsored'
            return entry.textContent.replace(/Sponsored/, '');
        });

        related = _.map(D.querySelectorAll('.sponsored-products-truncator-truncated'), function(entry) {
            let name = entry.textContent.replace(/\ \ */, '');
            let link = entry.parentNode.getAttribute('href');
            let chunks = link.split('/');
            let params = querystring.parse(_.last(chunks));

            let cost = entry.parentNode.parentNode.outerHTML.replace(/.*a-color-price">/, '').replace(/<.*/, '');
            let dollars = _.reduce(cost.replace(/\$/, '').split('.'), function(memo, decimal, position) {
                // mmh...?
                const value = _.round(decimal * ( position == 0 ? 1 : 0.01 ), 2);
                memo += value;
                return memo;
            }, 0);

            let thumbnail = entry.parentNode.parentNode.outerHTML.replace(/.*src="/, '').replace(/".*/, '');

            return { name, link, chunks, cost, params, dollars, thumbnail };
        });
    } catch(error) {
        debug(`Unable to mine related: ${error.message}, ${error.stack.substr(0, 220)}...`);
        return null;
    }

    return {
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
