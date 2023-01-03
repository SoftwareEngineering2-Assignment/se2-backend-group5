// eslint-disable-next-line import/newline-after-import
const path = require('node:path');
const fs = require('node:fs');
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

const importData = async () => {
  await Promise.all([importUsers(), importDashboards(), importSources(), importReset()]);
};

module.exports = {
  importData,
  importSources,
  importReset,
  importUsers,
  importDashboards
};
