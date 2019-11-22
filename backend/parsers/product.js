#!/usr/bin/env node
const _ = require('lodash');
const debug = require('debug')('parser:product');
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

function product(envelop) {

    const D = envelop.jsdom;
    const chunks = envelop.impression.href.split('/');
    let productName, 
        footer,
        nested,
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
        if(_.size(t) == 0) {
            debug("Not a title found in %s -- skipping", envelop.impression.href );
            return null;
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
        /*
        const dah = D.querySelector('[data-feature-name="titleBlock"]');
        console.log(!!img, !!dah, !!boh);
        if(dah) {
            console.log(dah.length, boh.length, _.map(boh, 'tagName'));
        } */

        const sections = _.map(D.querySelectorAll('h2.a-carousel-heading'), function(entry) {
            // > D.querySelectorAll('h2.a-carousel-heading')[0].textContent
            // '4 stars and aboveSponsored'
            let offset = getOffset(D.querySelector('body').outerHTML, entry.outerHTML);
            let catName = entry.textContent.replace(/Sponsored$/, '');
            // console.log(D.querySelector('body').outerHTML.substr(offset - 30, 3000));
            return {
                category: catName,
                offset: offset,
            }
        });

        const related = _.compact(_.map(D.querySelectorAll('[href^="/product-review"]'), function(entry) {
            /* this is a bug, it only extract:
                Customers who viewed this item also viewed 
                Inspired by your recent shopping trends
             */

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
            let offset = getOffset(D.querySelector('body').outerHTML, entry.outerHTML);

            let cost = ref.parentNode.parentNode.outerHTML.replace(/.*-price">/, '').replace(/<.*/, '');
            let dollars = _.reduce(cost.replace(/\$/, '').split('.'), function(memo, decimal, position) {
                const value = _.round(decimal * ( position == 0 ? 1 : 0.01 ), 2);
                memo += value;
                return memo;
            }, 0);
            // debug("cost %s = dollars %d", cost, dollars);

            let thumbnail = findThumbnailURL(ref);
            return { name, offset, link, chunks, cost, params, dollars, thumbnail };
        }));

        const ordered = _.orderBy(_.concat(related, sections), 'offset');
        nested = _.reduce(ordered, function(memo, entry) {
            // this list -very likely- stats with a category because the offset should be lesser than everything else
            let isCategory = !!_.get(entry, 'category');
            if(isCategory) {
                if(memo.lastCategory.category) {

                    if(memo.lastCategory.offset == entry.offset)
                        return memo;

                    if(!_.size(memo.lastSection) && !memo.lastCategory.category)
                        return memo;

                    memo.complete.push({
                        category: memo.lastCategory.category,
                        related: memo.lastSection
                    })
                    memo.lastSection = [];
                }
                memo.lastCategory.category = entry.category;
                memo.lastCategory.offset = entry.offset;
            } else {
                memo.lastSection.push(entry);
            }
            return memo;
        }, { complete: [], lastSection: [], lastCategory: {} });

        nested.complete.push({
            category: nested.lastCategory.category,
            related: nested.lastSection
        });

        debug("%d sections, %d related content mined -> %j",
            _.size(sections), _.size(related), _.map(nested.complete, function(c) {
                return _.set({}, c.category, _.size(c.related) );
            }) );

    } catch(error) {
        debug(`Unable to mine related: ${error.message}, ${error.stack.substr(0, 220)}...`);
        return null;
    }

    try {
        let x = D.querySelector('.navFooterLine');
        if(x && x.outerHTML) {
            console.log("footer yes:", x.outerHTML.length);
            footer = true;
        } else {
            footer = false;
        }
    } catch(error) {
        debug(`Unable to find footer, assument nope: ${error.message}, ${error.stack.substr(0, 220)}...`);
        footer = false;
    }

    return {
        productId,
        chunks,
        productName,
        footer,
        sections: nested.complete,
        brandUrl,
    };
};


module.exports = {
    product,
};
