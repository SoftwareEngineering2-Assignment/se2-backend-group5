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
 * Tests for route POST /create-source
 */
test.serial('POST /create-source returns correct response and status code for non-existing source', async (t) => {
    const mock_user = {username: "admin", id: "6394753012ff010f4dfc3c12", email: "admin@example.com"};
    token = jwtSign(mock_user);
    new_source = {     
        name: "newSource",      
        type: "News",
        url: "localhost/lalalala", 
        login: "lalala",
        passcode: "",
        vhost: "/",
    };
    const original_source = await source.find({ owner: mongoose.Types.ObjectId(mock_user.id), name: new_source.name});
    t.is(JSON.stringify(original_source), "[]");
    const {body, statusCode} = await t.context.got.post(`sources/create-source?token=${token}`,  {json: new_source});
    const source_after_post = await source.find({ owner: mongoose.Types.ObjectId(mock_user.id), name: new_source.name});
    t.is(source_after_post[0].name, new_source.name);
    t.is(source_after_post[0].type, new_source.type);
    t.is(source_after_post[0].login, new_source.login);
    t.assert(body.success);
  });

test.serial('POST /create-source returns correct response and status code when a source with the same name already exists', async (t) => {
    const mock_user = {username: "admin", id: "6394753012ff010f4dfc3c12", email: "admin@example.com"};
    token = jwtSign(mock_user);
    new_source = {     
        name: "source1",      
        type: "News",
        url: "localhost/lalalala", 
        login: "lalala",
        passcode: "",
        vhost: "/",
    };
    const existing_source = await source.find({ owner: mongoose.Types.ObjectId(mock_user.id), name: new_source.name});
    t.is(existing_source[0].name, new_source.name);
    const {body, statusCode} = await t.context.got.post(`sources/create-source?token=${token}`,  {json: new_source});
    t.is(body.status, 409);
    t.is(body.message, 'A source with that name already exists.');
    t.is(statusCode, 200);
  });