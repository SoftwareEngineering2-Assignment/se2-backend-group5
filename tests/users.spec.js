/* eslint-disable import/no-unresolved */
require('dotenv').config();
const _ = require('lodash');

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
test.serial('POST /authenticate returns correct response and status code for existing user and correct matching password', async (t) => {
    const expected_user = {username: "admin", id: "6394753012ff010f4dfc3c12", email: "admin@example.com"};
    expected_token = jwtSign(expected_user);
    const {body, statusCode} = await t.context.got.post(`users/authenticate`,  {json: { username: "admin", password: "admin", }});
    t.assert(_.isEqual(expected_user, body.user));
    t.is(expected_token, body.token);
    t.is(statusCode, 200);
  });

test.serial('POST /authenticate returns correct response and status code for existing user and non matching password', async (t) => {
    const {body, statusCode} = await t.context.got.post(`users/authenticate`,  {json: { username: "admin", password: "12345", }});
    t.is(body.status, 401);
    t.is(body.message, 'Authentication Error: Password does not match!');
    t.is(statusCode, 200);
  });

test.serial('POST /authenticate returns correct response and status code for non existing user', async (t) => {
    const {body, statusCode} = await t.context.got.post(`users/authenticate`,  {json: { username: "non-existing", password: "12345", }});
    t.is(body.status, 401);
    t.is(body.message, 'Authentication Error: User not found.');
    t.is(statusCode, 200);
  });

/*
 * Tests for route POST /users/resetpassword
 */
test.serial('POST /resetpassword returns correct response and status code for existing user', async (t) => {
    requesting_user = { username: "master" };
    oldReset = await reset.findOne(requesting_user);
    expected_token = jwtSign(requesting_user);
    const {body, statusCode} = await t.context.got.post(`users/resetpassword`,  {json: requesting_user});
    newReset = await reset.findOne(requesting_user);
    t.is(newReset.token, expected_token);
    t.not(oldReset.expireAt, newReset.expireAt);
    t.assert(body.ok);
    t.is(body.message, 'Forgot password e-mail sent.');
    t.is(statusCode, 200);
});

test.serial('POST /resetpassword returns correct response and status code for non existing user', async (t) => {
    const {body, statusCode} = await t.context.got.post(`users/resetpassword`,  {json: { username: "non-existing", }});
    t.is(body.status, 404);
    t.is(body.message, 'Resource Error: User not found.');
    t.is(statusCode, 200);
});

/*
 * Tests for route POST /users/changepassword
 */
test.serial('POST /changepassword returns correct response and status code for existing user and valid reset token', async (t) => {
    const requesting_user = { username: "master" };
    const mock_user = {username: "master", id: "6394756112ff010f4dfc3c13", email: "master@example.com"};
    const auth_token = jwtSign(mock_user);
    const original_user = await user.findOne(requesting_user).select('+password');
    t.not(original_user, null);
    const reset_token = await reset.findOne(requesting_user);
    t.not(reset_token, null);
    const {body, statusCode} = await t.context.got.post(`users/changepassword?token=${auth_token}`,  {json: { username: "master", password: "masterpassword"}});
    const updated_user = await user.findOne(requesting_user).select('+password');
    t.not(updated_user.password, original_user.password);
    t.assert(body.ok);
    t.is(body.message, 'Password was changed.');
    t.is(statusCode, 200);
  });

test.serial('POST /changepassword returns correct response and status code for existing user without a reset token', async (t) => {
    const requesting_user = { username: "admin" };
    const mock_user = {username: "admin", id: "6394756112ff010f4dfc3c12", email: "admin@example.com"};
    const auth_token = jwtSign(mock_user);
    const original_user = await user.findOne(requesting_user).select('+password');
    t.not(original_user, null);
    const reset_token = await reset.findOne(requesting_user);
    t.is(reset_token, null);
    const {body, statusCode} = await t.context.got.post(`users/changepassword?token=${auth_token}`,  {json: { username: "admin", password: "masterpassword"}});
    const updated_user = await user.findOne(requesting_user).select('+password');
    t.is(updated_user.password, original_user.password);
    t.is(body.status, 410);
    t.is(body.message, 'Resource Error: Reset token has expired.');
    t.is(statusCode, 200);
  });

test.serial('POST /changepassword returns correct response and status code for non-existing user', async (t) => {
    const requesting_user = { username: "non-existing" };
    const mock_user = {username: "non-existing", id: "6394756112ff010f4dfc3f12", email: "non-existing@example.com"};
    const auth_token = jwtSign(mock_user);
    const original_user = await user.findOne(requesting_user).select('+password');
    t.is(original_user, null);
    const {body, statusCode} = await t.context.got.post(`users/changepassword?token=${auth_token}`,  {json: { username: "non-existing", password: "12345"}});
    t.is(body.status, 404);
    t.is(body.message, 'Resource Error: User not found.');
    t.is(statusCode, 200);
  });

test.serial('POST /changepassword returns correct response and status code for existing user without a given new password', async (t) => {
    const requesting_user = { username: "nobody" };
    const mock_user = {username: "nobody", id: "6394756112ff010f4dfc3c14", email: "nobody@example.com"};
    const auth_token = jwtSign(mock_user);
    const original_user = await user.findOne(requesting_user).select('+password');
    t.not(original_user, null);
    const reset_token = await reset.findOne(requesting_user);
    t.not(reset_token, null);
    const {body, statusCode} = await t.context.got.post(`users/changepassword?token=${auth_token}`,  {json: requesting_user});
    t.is(body.status, 400);
    t.is(body.message, 'Validation Error: password is a required field');
    t.is(statusCode, 400);
  });
