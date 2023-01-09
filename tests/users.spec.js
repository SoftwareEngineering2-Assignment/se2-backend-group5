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

/*
 * Tests for route POST /users/resetpassword
 */
test('POST /resetpassword returns correct response and status code for existing user', async (t) => {
    requesting_user = { username: "master" };
    oldReset = await reset.findOne(requesting_user);
    expected_token = jwtSign(requesting_user);
    const {body, statusCode} = await t.context.got.post(`users/resetpassword`,  {json: requesting_user});
    newReset = await reset.findOne(requesting_user);
    t.is(newReset.token, expected_token);
    t.not(JSON.stringify(oldReset.expireAt), JSON.stringify(newReset.expireAt));
    t.assert(body.ok);
    t.is(body.message, 'Forgot password e-mail sent.');
    t.is(statusCode, 200);
  });

test('POST /resetpassword returns correct response and status code for non existing user', async (t) => {
    const {body, statusCode} = await t.context.got.post(`users/resetpassword`,  {json: { username: "non-existing", }});
    t.is(body.status, 404);
    t.is(body.message, 'Resource Error: User not found.');
    t.is(statusCode, 200);
  });