export const config = {
  hostname: '127.0.0.1',
  port: 4445,
  specs: ['./specs/**/*.e2e.js'],
  maxInstances: 1,
  capabilities: [{}],
  reporters: ['spec'],
  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 30000,
  },
};
