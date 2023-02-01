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
 * Tests for route GET /dashboard
 */
test.serial('GET /dashboard returns correct response and status code for a specific dashboard owned by an authorized user', async (t) => {
  const mock_user = {username: "user1", id: "6394758712ff010f4dfc3c15", email: "user1@example.com"};
  const token = jwtSign(mock_user);
  const {body, statusCode} = await t.context.got(`dashboards/dashboard?token=${token}&id=639475b812ff010f4dfc3c21`);
  t.assert(body.success);
  t.is(body.dashboard.id, '639475b812ff010f4dfc3c21');
  t.is(statusCode, 200);
});

test.serial('GET /dashboard returns correct response and status code for a non existing dashboard', async (t) => {
  const mock_user = {username: "user1", id: "6394758712ff010f4dfc3c15", email: "user1@example.com"};
  const token = jwtSign(mock_user);
  const {body, statusCode} = await t.context.got(`dashboards/dashboard?token=${token}&id=639475b812ff010f4dff3c21`);
  t.is(body.status, 409);
  t.is(body.message, 'The selected dashboard has not been found.');
  t.is(statusCode, 200);
});

test.serial('GET /dashboard returns correct response and status code for a specific dashboard owned by another user', async (t) => {
  const mock_user = {username: "user1", id: "6394758712ff010f4dfc3c15", email: "user1@example.com"};
  const token = jwtSign(mock_user);
  const {body, statusCode} = await t.context.got(`dashboards/dashboard?token=${token}&id=639475b812ff010f4dff3c20`);
  t.is(body.status, 409);
  t.is(body.message, 'The selected dashboard has not been found.');
  t.is(statusCode, 200);
});


/*
 * Tests for route POST /share-dashboard
 */
test.serial("POST /share-dashboard returns correct response and status code for a user's non existing dashboard", async (t) => {
    const mock_user = { id: "6394753012ff010f4dfc3c12", email: "admin@example.com", username: "admin"};
    const token = jwtSign(mock_user);
    const dashboardToShare = {
      json: {
        // id of non existing dashboard for the user above
        dashboardId: '639475b812ff010f4dfc3c22'
      }
    };
  
    const {body, statusCode} = await t.context.got.post(`dashboards/share-dashboard?token=${token}`, dashboardToShare);
    t.is(body.status, 409);
    t.is(body.message, 'The specified dashboard has not been found.')
    t.is(statusCode, 200);
  })
  
test.serial("POST /share-dashboard returns correct response and status code for a user's existing dashboard", async (t) => {
    const mock_user = { id: "6394753012ff010f4dfc3c12", email: "admin@example.com", username: "admin"};
    const token = jwtSign(mock_user);
    
    // A dashboard's "shared" state can be toggled betrween true and false 
    // Both cases are tested below: "not shared" -> "shared" and vice versa 
    
    // Case 1: unshared -> shared  
    const dashboardToShare = {
      json: {
        // id of an existing dashboard (of the user above) to share
        dashboardId: '639475b812ff010f4dfc3c18'
      }
    };
  
    const {body, statusCode} = await t.context.got.post(`dashboards/share-dashboard?token=${token}`, dashboardToShare);
    // var {body, statusCode} = await t.context.got.post(`dashboards/share-dashboard?token=${token}`, dashboardToShare);
    t.is(body.success, true);
    // shared state should now be true
    t.is(body.shared, true);
    t.is(statusCode, 200);
  
  
    // Case 2: shared -> unshared 
    const dashboardToUnshare = {
      json: {
        // id of an existing dashboard (of the user above) to unshare
        dashboardId: '639475b812ff010f4dfc3c19'
      }
    };
    
    
    const objReturned = await t.context.got.post(`dashboards/share-dashboard?token=${token}`, dashboardToUnshare);

  
    t.is(objReturned.body.success, true);
    // shared state should now be false
    t.is(objReturned.body.shared, false);
    t.is(objReturned.statusCode, 200);
  })


test.serial("POST /change password returns correct response and status code of a user's existing dashboard", async (t) => {
    const mock_user = {id: "6394753012ff010f4dfc3c12", username: "admin", email: "admin@example.com"};
    const token = jwtSign(mock_user)
    // user's dashboard whose password they want to change
    const dashboardToChangePassword =  {
        json: {
            dashboardId: "639475b812ff010f4dfc3c18",
            password:  "V5xoMd7Qt%wt7cLatoVn4P3x"
        }
    };
    const {body, statusCode} = await t.context.got.post(`dashboards/change-password?token=${token}`, dashboardToChangePassword);
    t.is(body.success, true);
    t.is(statusCode, 200);
})

test.serial("POST /change password returns correct response and status code for a user's non existing dashboard", async (t) => {
    const mock_user = {id: "6394753012ff010f4dfc3c12", username: "admin", email:  "admin@example.com"};
    const token = jwtSign(mock_user);
    // dashboard that does not belong to the user. Attempt to change its password
    const dashboardToChangePassword = {
        json: {
            // the dashboardId of a dashboard that does not belong to the user
            dashboardId: "639475b812ff010f4dfc3c20",
            password: "gyigY2SUdzX3t^QEHc#ztS#p"
        }
    }
    const {body, statusCode} = await t.context.got.post(`dashboards/change-password?token=${token}`, dashboardToChangePassword);
    t.is(body.status, 409);
    t.is(body.message, 'The specified dashboard has not been found.');
    t.is(statusCode, 200);
})

test.serial("POST /save-dashboard returns correct response and status code, when trying to change a user' s existing dashboard", async (t) => {
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

  test.serial("POST /save-dashboard returns correct response and status code, when trying to change a user' s non existing dashboard", async (t) => {
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

  test.serial('POST /clone-dashboard returns correct response and status code for already existent dashboard name', async (t) => {
    const mock_user = { id: "6394753012ff010f4dfc3c12", username: "admin", email: "admin@example.com"};
    const token = jwtSign(mock_user);
    const clonedDashboard = {
      json: {
        // the id of the dashboard that the user wants to clone
        dashboardId: "639475b812ff010f4dfc3c21",
        // user assigns a name to the cloned dashboard that is the name of one of their already owned dashboards
        name: "dashboard2"
      }
    };
    const {body, statusCode} = await t.context.got.post(`dashboards/clone-dashboard?token=${token}`, clonedDashboard);
    t.is(body.status, 409);
    t.is(body.message, 'A dashboard with that name already exists.');
    t.is(statusCode, 200);
  });

  test.serial('POST /clone-dashboard returns correct response and status code for new dashboard name', async (t) => {
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


/*
 * Tests for route POST /delete-dashboard
 */
test.serial('POST /delete-dashboard returns correct response and status code for non existent dashboard', async (t) => {
    const mock_user = { id: "6394753012ff010f4dfc3c12", username: "admin", email: "admin@example.com"};
    const token = jwtSign(mock_user);
    const dashboardToDelete = {
        json: {
            // non existent dashboard id
            id: "639475b812ff010f4dfc3c22"
        }
    }
    const {body, statusCode} = await t.context.got.post(`dashboards/delete-dashboard?token=${token}`, dashboardToDelete);

    t.is(body.status, 409);
    t.is(body.message, 'The selected dashboard has not been found.');
    t.is(statusCode, 200);
})

test.serial('POST /delete-dashboard returns correct response and status code for an existent dashboard', async (t) => {
    const mock_user = { id: "6394753012ff010f4dfc3c12", username: "admin", email: "admin@example.com"};
    const token = jwtSign(mock_user);
    const dashboardToDelete = {
        json: {
            // existent dashboard id
            id: "639475b812ff010f4dfc3c19"
        }
    }
    const {body, statusCode} = await t.context.got.post(`dashboards/delete-dashboard?token=${token}`, dashboardToDelete);

    t.is(body.success, true);
    t.is(statusCode, 200);
})
