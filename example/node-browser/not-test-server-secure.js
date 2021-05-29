try {
  const JWT_KEY = 'super_secret_key';
  const notWSServer = require('../../src/node/server.js');
  const CONST = require('../../src/node/const.js');
  const notWSMessenger = require('../../src/node/messenger.js');
  const notWSRouter = require('../../src/node/router.js');
  const jwt = require('jsonwebtoken');
  const express = require('express');
  const app = express();
  const port = 15001;
  var i = 0;
  app.use(express.static(__dirname + '/public'));
  app.get('/api/token', (req, res) => {
    res.status(200).json({
      token: jwt.sign({
        user: 'guest',
        active: true,
        exp: Date.now() / 1000 + (CONST.TOKEN_TTL / 30)
      }, JWT_KEY)
    });
    res.end();
  });

  app.listen(port, () => console.log(`Example app listening on port ${port}!`));
  const server = new notWSServer({
    connection: {
      port: 15000,
      secure: true
    },
    getRouter() {
      return new notWSRouter({
        logger: console,
        routes: {
          request: {
            myName({data, cred, conn}) {
              console.log('request myName', data);
              return Promise.resolve({
                name: 'testServer' + (i++),
                c: data.a + data.b
              });
            }
          },
          test: {
            sayHello({data, cred, conn}) {
              console.log('say hello to my new friend');
              return Promise.resolve(null);
            }
          }
        }
      });
    },
    getMessenger() {
      return new notWSMessenger({
        secure: true,
        logger: console,
        types: {
          'test': ['sayHello'],
          'request': ['myName']
        },
        validators: {
          credentials(credentials) {
            try {
              let data = jwt.verify(credentials, JWT_KEY);
              if (data && typeof data.active === 'boolean') {
                return data.active;
              } else {
                return false;
              }
            } catch (e) {
              console.error(e);
              return false;
            }
          }
        }
      })
    },
    logger: console,
    jwt: {
      key: JWT_KEY
    }
  });
  server.start();
  let lastCount = 0;
  server.on('clientsCountChanged', (count) => {
    if (lastCount !== count) {
      console.log('Clients: ', count);
      lastCount = count;
    }
  })
} catch (e) {
  console.error(e);
}
