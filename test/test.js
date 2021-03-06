'use strict';

const framework = require('..');
const test = require('tape');
const request = require('supertest');
const Spec = require('../lib/ce-constants.js').Spec;

// paackage.json handling
const { existsSync, readdirSync } = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Ensure fixture dependencies are installed
const fixtureDir = path.join(__dirname, 'fixtures');
const fixtures = readdirSync(fixtureDir);
fixtures.forEach(installDependenciesIfExist);

function installDependenciesIfExist(functionPath) {
  if (path.extname(functionPath) !== '') {
    functionPath = path.dirname(functionPath);
  }
  functionPath = path.join(fixtureDir, functionPath);
  if (existsSync(path.join(functionPath, 'package.json'))) {
    // eslint-disable-next-line
    console.log(`Installing dependencies for ${functionPath}`);
    execSync('npm install --production', { cwd: functionPath });
  }
}

test('Loads a user function with dependencies', t => {
  const func = require(`${__dirname}/fixtures/http-get/`);
  framework(func, server => {
    t.plan(2);
    request(server)
      .get('/')
      .expect(200)
      .expect('Content-Type', /json/)
      .end((err, res) => {
        t.error(err, 'No error');
        t.equal(res.body, 'This is the test function for Node.js FaaS. Success.');
        t.end();
        server.close();
      });
    }, { log: false });
});

test('Can respond via an async function', t => {
  const func = require(`${__dirname}/fixtures/async/`);
  framework(func, server => {
    t.plan(2);
    request(server)
      .get('/')
      .expect(200)
      .expect('Content-Type', /json/)
      .end((err, res) => {
        t.error(err, 'No error');
        t.equal(res.body,
          'This is the test function for Node.js FaaS. Success.');
        t.end();
        server.close();
      });
    }, { log: false });
});

test('Accepts HTTP POST requests', t => {
  const func = require(`${__dirname}/fixtures/http-post/`);
  framework(func, server => {
    request(server)
      .post('/')
      .send('message=Message body')
      .expect(200)
      .expect('Content-Type', /json/)
      .end((err, res) => {
        t.error(err);
        t.equal(res.body.message, 'Message body');
        t.end();
        server.close();
      });
  }, { log: false });
});

test('Responds to 0.2 binary cloud events', t => {
  const func = require(`${__dirname}/fixtures/cloud-event/`);
  framework(func, server => {
    request(server)
      .post('/')
      .send({ message: 'hello' })
      .set(Spec.id, '1')
      .set(Spec.source, 'integration-test')
      .set(Spec.type, 'dev.knative.example')
      .set(Spec.version, '0.2')
      .expect(200)
      .expect('Content-Type', /json/)
      .end((err, res) => {
        t.error(err, 'No error');
        t.equal(res.body, 'hello');
        t.end();
        server.close();
      });
  }, { log: false });
});

test('Responds to 0.3 binary cloud events', t => {
  const func = require(`${__dirname}/fixtures/cloud-event/`);
  framework(func, server => {
    request(server)
      .post('/')
      .send({ message: 'hello' })
      .set(Spec.id, '1')
      .set(Spec.source, 'integration-test')
      .set(Spec.type, 'dev.knative.example')
      .set(Spec.version, '0.3')
      .expect(200)
      .expect('Content-Type', /json/)
      .end((err, res) => {
        t.error(err, 'No error');
        t.equal(res.body, 'hello');
        t.end();
        server.close();
      });
  }, { log: false });
});

test('Responds to 1.0 binary cloud events', t => {
  const func = require(`${__dirname}/fixtures/cloud-event/`);
  framework(func, server => {
    request(server)
      .post('/')
      .send({ message: 'hello' })
      .set(Spec.id, '1')
      .set(Spec.source, 'integration-test')
      .set(Spec.type, 'dev.knative.example')
      .set(Spec.version, '1.0')
      .expect(200)
      .expect('Content-Type', /json/)
      .end((err, res) => {
        t.error(err, 'No error');
        t.equal(res.body, 'hello');
        t.end();
        server.close();
      });
  }, { log: false });
});

test('Responds to 1.0 structured cloud events', t => {
  const func = require(`${__dirname}/fixtures/cloud-event/`);
  framework(func, server => {
    request(server)
      .post('/')
      .send({
        id: '1',
        source: 'integration-test',
        type: 'com.github.pull.create',
        specversion: '1.0',
        datacontenttype: 'application/json',
        data: {
          message: 'hello'
        }
      })
      .set('Content-type', 'application/cloudevents+json; charset=utf-8')
      .expect(200)
      .expect('Content-Type', /json/)
      .end((err, res) => {
        t.error(err, 'No error');
        t.equal(res.body, 'hello');
        t.end();
        server.close();
      });
  }, { log: false });
});

test('Responds with 406 Not Acceptable to unknown cloud event versions', t => {
  const func = require(`${__dirname}/fixtures/cloud-event/`);
  framework(func, server => {
    request(server)
      .post('/')
      .send({ message: 'hello' })
      .set(Spec.id, '1')
      .set(Spec.source, 'integration-test')
      .set(Spec.type, 'dev.knative.example')
      .set(Spec.version, '11.0')
      .expect(406)
      .expect('Content-Type', /json/)
      .end((err, res) => {
        t.error(err, 'No error');
        t.equal(res.body.statusCode, 406);
        t.equal(res.body.message, 'Unsupported cloud event version detected: 11.0');
        t.end();
        server.close();
      });
  }, { log: false });
});

test('Passes query parameters to the function', t => {
  const func = require(`${__dirname}/fixtures/query-params/`);
  framework(func, server => {
    t.plan(3);
    request(server)
      .get('/?lunch=tacos&supper=burgers')
      .expect(200)
      .expect('Content-Type', /json/)
      .end((err, res) => {
        t.error(err, 'No error');
        t.equal(res.body.lunch, 'tacos');
        t.equal(res.body.supper, 'burgers');
        t.end();
        server.close();
      });
    }, { log: false });
});

test('Respects response code set by the function', t => {
  const func = require(`${__dirname}/fixtures/response-code/`);
  framework(func, server => {
    t.plan(1);
    request(server)
      .get('/')
      .expect(451)
      .expect('Content-Type', /json/)
      .end(err => {
        t.error(err, 'No error');
        t.end();
        server.close();
      });
    }, { log: false });
});

test('Responds HTTP 204 if response body has no content', t => {
  const func = require(`${__dirname}/fixtures/no-content/`);
  framework(func, server => {
    t.plan(2);
    request(server)
      .get('/')
      .expect(204)
      .expect('Content-Type', /json/)
      .end((err, res) => {
        t.error(err, 'No error');
        t.equal(res.body, '');
        t.end();
        server.close();
      });
    }, { log: false });
});

test('Sends CORS headers in HTTP response', t => {
  const func = require(`${__dirname}/fixtures/no-content/`);
  framework(func, server => {
    t.plan(2);
    request(server)
      .get('/')
      .expect(204)
      .expect('Content-Type', /json/)
      .expect('Access-Control-Allow-Origin', '*')
      .expect('Access-Control-Allow-Methods',
        'OPTIONS, GET, DELETE, POST, PUT, HEAD, PATCH')
      .end((err, res) => {
        t.error(err, 'No error');
        t.equal(res.body, '');
        t.end();
        server.close();
      });
    }, { log: false });
});

test('Respects headers set by the function', t => {
  const func = require(`${__dirname}/fixtures/response-header/`);
  framework(func, server => {
    t.plan(2);
    request(server)
      .get('/')
      .expect(200)
      .expect('X-announce-action', 'Saying hello')
      .end((err, res) => {
        t.error(err, 'No error');
        t.equal(res.body.message, 'Well hello there');
        t.end();
        server.close();
      });
    }, { log: false });
});

test('Respects content type set by the function', t => {
  const func = require(`${__dirname}/fixtures/content-type/`);
  framework(func, server => {
    t.plan(2);
    request(server)
      .get('/')
      .expect(200)
      .expect('Content-Type', /text/)
      .end((err, res) => {
        t.error(err, 'No error');
        t.equal(res.text, '{"message":"Well hello there"}');
        t.end();
        server.close();
      });
    }, { log: false });
});

test('Accepts application/json content via HTTP post', t => {
  const func = require(`${__dirname}/fixtures/json-input/`);
  framework(func, server => {
    t.plan(2);
    request(server)
      .post('/')
      .send({ lunch: 'tacos' })
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        t.error(err, 'No error');
        t.equal(res.body, 'tacos');
        t.end();
        server.close();
      });
  }, { log: false });
});

test('Accepts x-www-form-urlencoded content via HTTP post', t => {
  const func = require(`${__dirname}/fixtures/json-input/`);
  framework(func, server => {
    t.plan(2);
    request(server)
      .post('/')
      .send('lunch=tacos')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .end((err, res) => {
        t.error(err, 'No error');
        t.equal(res.body, 'tacos');
        t.end();
        server.close();
      });
  }, { log: false });
});

test('Exposes OpenWhisk compatible context properties', t => {
  const func = require(`${__dirname}/fixtures/openwhisk-properties/`);
  framework(func, server => {
    t.plan(7);
    request(server)
      .get('/?lunch=tacos')
      .expect(200)
      .expect('Content-type', /json/)
      .end((err, res) => {
        t.error(err, 'No error');
        t.equal(res.body.__ow_user, '');
        t.equal(res.body.__ow_method, 'GET');
        t.equal(typeof res.body.__ow_headers, 'object');
        t.equal(res.body.__ow_path, '');
        t.equal(typeof res.body.__ow_query, 'object');
        t.equal(res.body.__ow_body, 'null');
        t.end();
        server.close();
      });
    }, { log: false });
});

test('Exposes readiness URL', t => {
  framework(_ => { }, server => {
    t.plan(2);
    request(server)
      .get('/health/readiness')
      .expect(200)
      .expect('Content-type', /text/)
      .end((err, res) => {
        t.error(err, 'No error');
        t.equal(res.text, 'OK');
        t.end();
        server.close();
      });
    }, { log: false });
});

test('Exposes liveness URL', t => {
  framework(_ => { }, server => {
    t.plan(2);
    request(server)
      .get('/health/liveness')
      .expect(200)
      .expect('Content-type', /text/)
      .end((err, res) => {
        t.error(err, 'No error');
        t.equal(res.text, 'OK');
        t.end();
        server.close();
      });
    }, { log: false });
});

test('Returns HTTP error code if a caught error has one', t => {
  framework(_ => {
    const error = new Error('Unavailable for Legal Reasons');
    error.code = 451;
    throw error;
  }, server => {
      t.plan(1);
      request(server)
        .get('/')
        .expect(451)
        .expect('Content-type', /json/)
        .end((err, res) => {
          t.error(err, 'No error');
          t.end();
          server.close();
        });
  }, { log: false });
});

test('Function accepts destructured parameters', t => {
  framework(function({ lunch }) { return { message: `Yay ${lunch}` }; },
    server => {
      t.plan(2);
      request(server)
        .get('/?lunch=tacos')
        .expect(200)
        .expect('Content-type', /json/)
        .end((err, res) => {
          t.error(err, 'No error');
          t.equals(res.body.message, 'Yay tacos');
          t.end();
          server.close();
        });
  }, { log: false });
});

test('Provides logger in context when logging is enabled', t => {
  var loggerProvided = false;
  framework(context => {
    console.log(typeof context.log)
    loggerProvided = (context.log && typeof context.log.info === 'function');
  }, server => {
    request(server)
      .get('/')
      .end((err, res) => {
        t.error(err, 'No error');
        t.assert(loggerProvided, 'Logger provided')
        t.end();
        server.close();
      });
  }, { log: {level: 'error'}}); // enable but squelch
});

test('Provides logger in context when logging is disabled', t => {
  var loggerProvided = false;
  framework(context => {
    loggerProvided = (context.log && typeof context.log.info === 'function');
  }, server => {
    request(server)
      .get('/')
      .end((err, res) => {
        t.error(err, 'No error');
        t.assert(loggerProvided, 'Logger provided')
        t.end();
        server.close();
      });
  }, { log: false});
});

