const { expect } = require('chai');
const sinon = require('sinon');
const { stubDocDBQuery, getRequestEvent, getContext } = require('../support');

const { viewerRequest } = require('../../lambdas/app');

const context = getContext('viewer-request');
const userPass = (user, pw) => (`Basic ${Buffer.from(`${user}:${pw}`).toString('base64')}`);

describe('viewerRequest', () => {
  afterEach(() => {
    sinon.restore();
  });


  it('basic auth disabled', async () => {
    const queryResults = {
      Item: { Settings: {} },
    };

    stubDocDBQuery(() => queryResults);
    const response = await viewerRequest(getRequestEvent(), context);

    expect(response.headers['x-forwarded-host']).to.eq(undefined);
  });

  it('non-preview site - no basic auth', async () => {
    const username = 'testUser';
    const password = 'testPassword';
    const queryResults = {
      Item: { Settings: { BasicAuth: { Username: username, Password: password } } },
    };

    stubDocDBQuery(() => queryResults);

    const response = await viewerRequest(getRequestEvent(), context);

    expect(response.headers['x-forwarded-host']).to.eq(undefined);
  });

  it("password req'd - not present in request", async () => {
    const username = 'testUser';
    const password = 'testPassword';
    const queryResults = {
      Item: { Settings: { BasicAuth: { Username: username, Password: password } } },
    };
    const authEvent = getRequestEvent();
    authEvent.Records[0].cf.request.uri = '/preview/owner/repo/branch/index.html';
    stubDocDBQuery(() => queryResults);
    const response = await viewerRequest(authEvent, context);

    expect(response).to.deep.equal({
      status: '401',
      statusDescription: 'Unauthorized',
      body: 'Unauthorized',
      headers: {
        'www-authenticate': [
          {
            key: 'WWW-Authenticate',
            value: 'Basic',
          },
        ],
      },
    });
  });

  it('basic auth successful', async () => {
    const username = 'testUser';
    const password = 'testPassword';
    const queryResults = {
      Item: { Settings: { BasicAuth: { Username: username, Password: password } } },
    };

    stubDocDBQuery(() => queryResults);

    const authEvent = getRequestEvent();
    authEvent.Records[0].cf.request.headers.authorization = [{
      key: 'Authorization',
      value: userPass(username, password),
    }];
    authEvent.Records[0].cf.request.headers['x-forwarded-host'] = [
      {
        key: 'X-Forwarded-Host',
        value: authEvent.Records[0].cf.request.headers.host[0].value,
      },
    ];
    const response = await viewerRequest(authEvent, context);

    expect(response.headers['x-forwarded-host'][0].key).to.equal('X-Forwarded-Host');
    expect(response.headers['x-forwarded-host'][0].value).to.equal(authEvent.Records[0].cf.request.headers.host[0].value);
  });

  it("password req'd - invalid user password", async () => {
    const username = 'testUser';
    const password = 'testPassword';
    const queryResults = {
      Item: { Settings: { BasicAuth: { Username: username, Password: password } } },
    };

    stubDocDBQuery(() => queryResults);

    const authEvent = getRequestEvent();
    authEvent.Records[0].cf.request.uri = '/preview/owner/repo/branch/index.html';
    authEvent.Records[0].cf.request.headers.authorization = [{
      key: 'Authorization',
      value: 'invalidUserPassword',
    }];

    const response = await viewerRequest(authEvent, context);

    expect(response).to.deep.equal({
      status: '401',
      statusDescription: 'Unauthorized',
      body: 'Unauthorized',
      headers: {
        'www-authenticate': [
          {
            key: 'WWW-Authenticate',
            value: 'Basic',
          },
        ],
      },
    });
  });
});
