const { expect } = require('chai');
const index = require('../app');

const event = {
  "Records": [
    {
      "cf": {
        "response": {
          "headers": {},
          "status": "200",
          "statusDescription": "OK"
        }
      }
    }
  ]
};
describe("The handler function", () => {
    it("returns the message", async() => {
        const strict_transport_security = [{ key: "Strict-Transport-Security", value: "max-age=31536001; preload" }];
        const x_frame_options = [{key: 'X-Frame-Options', value: 'SAMEORIGIN'}];

        const response = await index.lambdaHandler(event, {});

        expect(Object.keys(response.headers).length).to.equal(2);
        expect(response.headers["strict-transport-security"]).to.deep.equal(strict_transport_security);
        expect(response.headers["X-Frame-Options"]).to.deep.equal(x_frame_options);
    });
});