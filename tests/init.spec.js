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

const importDashboards = async () => {
  const dashboards = JSON.parse(fs.readFileSync(path.join(path.dirname(__filename), 'mock_data/dashboard.json'), {encoding: 'utf-8'}));
  await dashboard.deleteMany({});
  await dashboard.insertMany(dashboards);
};
const importReset = async () => {
  const resets = JSON.parse(fs.readFileSync(path.join(path.dirname(__filename), 'mock_data/reset.json'), {encoding: 'utf-8'}));
  await reset.deleteMany({});
  await reset.insertMany(resets);
};

const importSources = async () => {
  const sources = JSON.parse(fs.readFileSync(path.join(path.dirname(__filename), 'mock_data/source.json'), {encoding: 'utf-8'}));
  await source.deleteMany({});
  await source.insertMany(sources);
};

const importUsers = async () => {
  const users = JSON.parse(fs.readFileSync(path.join(path.dirname(__filename), 'mock_data/user.json'), {encoding: 'utf-8'}));
  await user.deleteMany({});
  await user.insertMany(users);
};
test.before(async () => {
  const mongoUrl = process.env.MONGODB_URI;
  await mongoose.connect(mongoUrl, {useNewUrlParser: true, useUnifiedTopology: true});
  await importUsers();
  await importDashboards();
  await importSources();
  await importReset();
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
  const {body, statusCode} = await t.context.got.post(`dashboards/create-dashboard?token=${token}`,
   {json: dashboardToSave});

  t.is(statusCode, 200); 
  t.is(body.success, true); 
});


test('POST /create-dashboard returns correct response and status code, already existing dashboard', async (t) => {
  const mock_user = {username: "admin", id: "6394753012ff010f4dfc3c12", email: "admin@example.com"};
  const token = jwtSign(mock_user);
  const dashboardToSave = {
    json: {
      name: "dashboard4",
      id: "639475b812ff010f4dfc3c22"
    }
  };
  const {body, statusCode} = await t.context.got.post(`dashboards/create-dashboard?token=${token}`, {json: dashboardToSave});  
  t.is(body.status, 409); 
  t.is(body.message, 'A dashboard with that name already exists.')
  t.is(statusCode, 200); 
});