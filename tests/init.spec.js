/* eslint-disable import/no-unresolved */
require('dotenv').config();

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const lodash = require('lodash');
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

test('GET /sources returns correct response and status code', async (t) => {
  const token = jwtSign({id: 1});
  const {statusCode} = await t.context.got(`sources/sources?token=${token}`);
  t.is(statusCode, 200);
});

/*
 * Tests for route GET /dashboard
 */
test('GET /dashboard returns correct response and status code for a specific dashboard owned by an authorized user', async (t) => {
  const mock_user = {username: "user1", id: "6394758712ff010f4dfc3c15", email: "user1@example.com"};
  token = jwtSign(mock_user);
  const {body, statusCode} = await t.context.got(`dashboards/dashboard?token=${token}&id=639475b812ff010f4dfc3c21`);
  t.assert(body.success);
  t.is(body.dashboard.id, '639475b812ff010f4dfc3c21');
  t.is(statusCode, 200);
});

test('GET /dashboard returns correct response and status code for a non existing dashboard', async (t) => {
  const mock_user = {username: "user1", id: "6394758712ff010f4dfc3c15", email: "user1@example.com"};
  token = jwtSign(mock_user);
  const {body, statusCode} = await t.context.got(`dashboards/dashboard?token=${token}&id=639475b812ff010f4dff3c21`);
  t.is(body.status, 409);
  t.is(body.message, 'The selected dashboard has not been found.');
  t.is(statusCode, 200);
});

test('GET /dashboard returns correct response and status code for a specific dashboard owned by another user', async (t) => {
  const mock_user = {username: "user1", id: "6394758712ff010f4dfc3c15", email: "user1@example.com"};
  token = jwtSign(mock_user);
  const {body, statusCode} = await t.context.got(`dashboards/dashboard?token=${token}&id=639475b812ff010f4dff3c20`);
  t.is(body.status, 409);
  t.is(body.message, 'The selected dashboard has not been found.');
  t.is(statusCode, 200);
});
