/* eslint-disable import/no-unresolved */
require('dotenv').config();

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const test = require('ava').default;
const got = require('got');
const listen = require('test-listen');
const lodash =require('lodash');

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

test('GET /dashboards returns correct response and status code', async (t) => {
  const token = jwtSign({username: "admin", id: "6394753012ff010f4dfc3c12", email: "admin@example.com"})
  const {body, statusCode} = await t.context.got(`dashboards/dashboards?token=${token}`);
  // Check for correct status code 
  t.is(statusCode, 200);
  // Check for success and if the returned dashboards are the expected
  t.assert(body.success);
  const expected_dashboards = [
    { id: '639475b812ff010f4dfc3c18', name: 'dashboard1', views: 0 },
    { id: '639475b812ff010f4dfc3c19', name: 'dashboard2', views: 5 }
  ];
  t.assert(lodash.isEqual(body.dashboards, expected_dashboards));
});



test('POST /create-dashboard returns correct response and status code, non existing dashboard', async (t) => {
  const mock_user = {username: "admin", id: "6394753012ff010f4dfc3c12", email: "admin@example.com"};
  const token = jwtSign(mock_user);
  const dashboardToSave = {
    json: {
      name: "dashboard5",
      id: "639475b812ff010f4dfc3c22"
    }
  };
  const postAttempt = await t.context.got.post(`dashboards/create-dashboard?token=${token}`,
   dashboardToSave);
  // check for successful post
  t.is(postAttempt.body.success, true); 
  // check for status code meaning success (200 - OK)
  t.is(postAttempt.statusCode, 200); 
});


test('POST /create-dashboard returns correct response and status code, already existing dashboard', async (t) => {
  // the user with the id below already has a dashboard with name dashboard4 (see below)
  const mock_user = {username: "user1", id: "6394758712ff010f4dfc3c15", email: "user1@example.com"};
  const token = jwtSign(mock_user);
  const dashboardToSave = {
    json: {
      // Already existing dashboard name, new arbitrary id
      name: "dashboard4",
      id: "639475b812ff010f4dfc3c22"
    }
  };
  const postAttempt = await t.context.got.post(`dashboards/create-dashboard?token=${token}`, dashboardToSave);  
  t.is(postAttempt.body.status, 409); 
  t.is(postAttempt.body.message, 'A dashboard with that name already exists.')
  t.is(postAttempt.statusCode, 200); 
});
