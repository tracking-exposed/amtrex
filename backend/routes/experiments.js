const _ = require('lodash');
const moment = require('moment');
const debug = require('debug')('routes:experiments');

const automo = require('../lib/automo');
const params = require('../lib/params');

async function registerExperiment(req) {
    // /api/v2/experiments/register

    debug("%j", req.body);

    result= 1;
    // req.
    return {
        json: {
            result,
        }
    };
};

async function commitAction(req) {

    result= 1;
    return {
        json: {
            result,
        }
    }
}

module.exports = {
    registerExperiment,
    commitAction
};