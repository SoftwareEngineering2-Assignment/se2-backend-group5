/* eslint-disable import/no-unresolved */
require('dotenv').config();
const lodash = require('lodash');


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

/*
 *  Tests for route GET /sources
 */
test('GET /sources returns correct response and status code', async (t) => {
    const token = jwtSign({id: 1});
    const {body, statusCode} = await t.context.got(`sources/sources?token=${token}`);
    t.is(statusCode, 200);
    t.assert(body.success);
    // t.is(body.sources, []);
  });
  
test('GET /sources returns correct response and status code for user admin', async (t) => {
    const token = jwtSign({username: "admin", id: "6394753012ff010f4dfc3c12", email: "admin@example.com"});
    const {body, statusCode} = await t.context.got(`sources/sources?token=${token}`);
    const expected_source = [
      {
        id: "639475b812ff010f4dfc3c16",      
        name: "source1",      
        type: "news",
        url: "localhost/lalala", 
        login: "lalala",
        passcode: "",
        vhost: "/",
        active: false,
      },
    ];
    t.assert(lodash.isEqual(body.sources, expected_source));
    t.is(statusCode, 200);
  });
  
test('GET /sources returns correct response and status code for unauthenticated user', async (t) => {
    const {body, statusCode} = await t.context.got(`sources/sources`);
    t.is(statusCode, 403);
    t.is(body.message, 'Authorization Error: token missing.');
  });
