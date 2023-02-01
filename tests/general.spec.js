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

test('GET /statistics returns correct response and status code', async (t) => {
    const {body, statusCode} = await t.context.got('general/statistics');
    t.is(body.sources, (JSON.parse(fs.readFileSync(path.join(path.dirname(__filename), 'mock_data/source.json'), {encoding: 'utf8'}))).length);
    t.assert(body.success);
    t.is(statusCode, 200);
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




test('GET /test-url-request returns correct response and status code without query parameters', async (t) => {
    const {body, statusCode} = await t.context.got('general/test-url-request');
    t.is(statusCode, 200);
    t.is(body.response, "Something went wrong");
    t.is(body.status, 500);
});

test('GET /test-url-request returns correct response and status code for GET /general/statistics request', async (t) => {
    const url = process.env.SERVER_URI + "/general/statistics";
    const type = "GET";
    const {body, statusCode} = await t.context.got(`general/test-url-request?url=${url}&type=${type}`);
    t.is(statusCode, 200);
    t.is(body.status, 200);
});

test('GET /test-url-request returns correct response and status code for POST sources/change-source request for non existing source', async (t) => {
    const mock_user = {username: "admin", id: "6394753012ff010f4dfc3c12", email: "admin@example.com"};
    const token = jwtSign(mock_user);
    const editted_source = {
        id: "639475b812f0010f4dfc3c16",
        name: "source1.2",
        type: "News",
        url: "localhost/lalala",
        login: "lalala",
        passcode: "",
        vhost: "/",
    };
    const url = process.env.SERVER_URI + "/sources/change-source?token=" + token;
    const type = "POST";
    const bodyParams = {
        requestBody: editted_source,
        params: ""
    };
    const {body, statusCode} = await t.context.got(`general/test-url-request?url=${url}&type=${type}&body=${JSON.stringify(bodyParams)}`);
    console.log(body);
    t.is(statusCode, 200);
    t.is(body.status, 200);
});
