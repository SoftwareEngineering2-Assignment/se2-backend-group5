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

/*
 * Tests for route POST /users/authenticate
 */
test('POST /authenticate returns correct response and status code for existing user and correct matching password', async (t) => {
    const expected_user = {username: "admin", id: "6394753012ff010f4dfc3c12", email: "admin@example.com"};
    expected_token = jwtSign(expected_user);
    const {body, statusCode} = await t.context.got.post(`users/authenticate`,  {json: { username: "admin", password: "admin", }});
    t.is(JSON.stringify(expected_user), JSON.stringify(body.user));
    t.is(JSON.stringify(expected_token), JSON.stringify(body.token));
    t.is(statusCode, 200);
  });

test('POST /authenticate returns correct response and status code for existing user and non matching password', async (t) => {
    const {body, statusCode} = await t.context.got.post(`users/authenticate`,  {json: { username: "admin", password: "12345", }});
    t.is(body.status, 401);
    t.is(body.message, 'Authentication Error: Password does not match!');
    t.is(statusCode, 200);
  });

test('POST /authenticate returns correct response and status code for non existing user', async (t) => {
    const {body, statusCode} = await t.context.got.post(`users/authenticate`,  {json: { username: "non-existing", password: "12345", }});
    t.is(body.status, 401);
    t.is(body.message, 'Authentication Error: User not found.');
    t.is(statusCode, 200);
  });