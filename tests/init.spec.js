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

// test('GET /statistics returns correct response and status code', async (t) => {
//   const {body, statusCode} = await t.context.got('general/statistics');
//   t.is(body.sources, (JSON.parse(fs.readFileSync(path.join(path.dirname(__filename), 'mock_data/source.json'), {encoding: 'utf8'}))).length);
//   t.assert(body.success);
//   t.is(statusCode, 200);
// });

// test('GET /sources returns correct response and status code', async (t) => {
//   const token = jwtSign({id: 1});
//   const {statusCode} = await t.context.got(`sources/sources?token=${token}`);
//   t.is(statusCode, 200);
// });


test("POST /save-dashboard returns correct response and status code, when trying to change a user' s existing dashboard", async (t) => {
  const mock_user = { id: "6394756112ff010f4dfc3c13", username: "master", email: "master@example.com"};
  const token = jwtSign(mock_user);
  // existing dashboard of the user with the id above
  const changedDashboard = {
    json: {
      id: "639475b812ff010f4dfc3c20",
      layout: [],
      items: {},
      nextId: 6
    }
  };
  const {body, statusCode} = await t.context.got.post(`dashboards/save-dashboard?token=${token}`, changedDashboard);
  t.is(body.success, true);
  t.is(statusCode, 200);
});

test("POST /save-dashboard returns correct response and status code, when trying to change a user' s non existing dashboard", async (t) => {
  const mock_user = { id: "6394756112ff010f4dfc3c13", username: "master", email: "master@example.com"};
  const token = jwtSign(mock_user);
  const changedDashboard = {
    json: {
      // id of a dashboard that does not belong to the user with the id above
      id: "639475b812ff010f4dfc3c21",
      layout: [],
      items: {},
      nextId: 6
    }
  };
  const {body, statusCode} = await t.context.got.post(`dashboards/save-dashboard?token=${token}`, changedDashboard);
  t.is(body.status, 409);
  t.is(body.message, 'The selected dashboard has not been found.');
  t.is(statusCode, 200);
});

test('POST /clone-dashboard returns correct response and status code for already existent dashboard name', async (t) => {
  const mock_user = { id: "6394753012ff010f4dfc3c12", username: "admin", email: "admin@example.com"};
  const token = jwtSign(mock_user);
  const clonedDashboard = {
    json: {
      // the id of the dashboard that the user wants to clone
      id: "639475b812ff010f4dfc3c21",
      // user assigns a name to the cloned dashboard that is the name of one of their already owned dashboards
      name: "dashboard2"
    }
  };
  const {body, statusCode} = await t.context.got.post(`dashboards/clone-dashboard?token=${token}`, clonedDashboard);
  t.is(body.status, 409);
  t.is(body.message, 'A dashboard with that name already exists.');
  t.is(statusCode, 200);
});

test('POST /clone-dashboard returns correct response and status code for new dashboard name', async (t) => {
  const mock_user = { id: "6394753012ff010f4dfc3c12", username: "admin", email: "admin@example.com"};
  const token = jwtSign(mock_user);
  const clonedDashboard = {
    json: {
      // the id of the dashboard that the user wants to clone (the cloned dashboard must be one of their own)
      dashboardId: "639475b812ff010f4dfc3c19",
      // user assigns a name to the cloned dashboard that is not the same as another one of their's
      name: "nonExistentNameOfDashboard"
    }
  };
  const {body, statusCode} = await t.context.got.post(`dashboards/clone-dashboard?token=${token}`, clonedDashboard);
  t.is(body.success, true);
  t.is(statusCode, 200);
});
