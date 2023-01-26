/* eslint-disable import/no-unresolved */
require('dotenv').config();

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const test = require('ava').default;
const got = require('got');
const listen = require('test-listen');

const mongoose = require('mongoose');
const app = require('../src/index');
const {jwtSign} = require('../src/utilities/authentication/helpers');
const dashboard = require('../src/models/dashboard');
const reset = require('../src/models/reset');
const source = require('../src/models/source');
const user = require('../src/models/user');
const utils = require('./utils');

test.before(async () => {
    const mongoUrl = process.env.MONGODB_URI;
    await mongoose.connect(mongoUrl, {useNewUrlParser: true, useUnifiedTopology: true});
    await utils.importData();
});

test.before(async (t) => {
    t.context.server = http.createServer(app);
    t.context.prefixUrl = await listen(t.context.server);
    t.context.got = got.extend({http2: true, throwHttpErrors: false, responseType: 'json', prefixUrl: t.context.prefixUrl});
});

test.after.always(async (t) => {
    t.context.server.close();
    await dashboard.deleteMany({});
    await reset.deleteMany({});
    await source.deleteMany({});
    await user.deleteMany({});
});

test('should be successful', async (t) => {
    t.assert(true);
});

test('GET /test-url returns correct response and status code for existing url', async (t) => {
    // test that a client can visit some existing url (external of our own routes)
    const urlToTest ='https://en.wikipedia.org/wiki/Software_engineering';
    
    const {body, statusCode} = await t.context.got(`general/test-url?url=${urlToTest}`);
    t.is(body.status, 200);
    t.is(body.active, true);
    t.is(statusCode, 200);
});

test('GET /test-url returns correct response and status code for non existing url', async (t) => {
    // non existing url
    const urlToTest = 'httfgbfgbps://en.wikrdrneditna.org/wtymtfmhiki/Softwdrare_edrndtyngineering';
    const {body, statusCode} = await t.context.got(`general/test-url?url=${urlToTest}`);
    
    t.is(body.status, 500);
    t.is(body.active, false);
    t.is(statusCode, 200);
});



