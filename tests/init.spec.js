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

/*
 * Tests for route POST /change-source
 */
test('POST /change-source returns correct response and status code for existing source owned by the user', async (t) => {
  const mock_user = {username: "admin", id: "6394753012ff010f4dfc3c12", email: "admin@example.com"};
  token = jwtSign(mock_user);
  editted_source = {
      id: "639475b812ff010f4dfc3c16",
      name: "source1.2",
      type: "News",
      url: "localhost/lalala",
      login: "lalala",
      passcode: "",
      vhost: "/",
  };
  const original_source = await source.find({_id: mongoose.Types.ObjectId(editted_source.id), owner: mongoose.Types.ObjectId(mock_user.id)});
  const {body, statusCode} = await t.context.got.post(`sources/change-source?token=${token}`,  {json: editted_source});
  const source_after_post = await source.find({_id: mongoose.Types.ObjectId(editted_source.id), owner: mongoose.Types.ObjectId(mock_user.id)});
  t.falsy(lodash.isEqual(original_source, source_after_post));
  t.assert(body.success);
});

test('POST /change-source returns correct response and status code for non existing source', async (t) => {
  const mock_user = {username: "admin", id: "6394753012ff010f4dfc3c12", email: "admin@example.com"};
  token = jwtSign(mock_user);
  editted_source = {
      id: "639475b812f0010f4dfc3c16",
      name: "source1.2",
      type: "News",
      url: "localhost/lalala",
      login: "lalala",
      passcode: "",
      vhost: "/",
  };
  const {body, statusCode} = await t.context.got.post(`sources/change-source?token=${token}`,  {json: editted_source});
  t.is(body.status, 409);
  t.is(body.message, 'The selected source has not been found.');
});

test('POST /change-source returns correct response and status code for existing source owned by the user when the user already has another source with the new name', async (t) => {
  const mock_user = {username: "admin", id: "6394753012ff010f4dfc3c12", email: "admin@example.com"};
  token = jwtSign(mock_user);
  editted_source = {
      id: "639475b812ff010f4dfc3c16",
      name: "source3",
      type: "News",
      url: "localhost/lalala",
      login: "lalala",
      passcode: "",
      vhost: "/",
  };
  const {body, statusCode} = await t.context.got.post(`sources/change-source?token=${token}`,  {json: editted_source});
  t.is(body.status, 409);
  t.is(body.message, 'A source with the same name has been found.');
});
