try {
  const JWT_KEY = 'super_secret_key';
  const notWSServer = require('../../src/node/server.js');
  const CONST = require('../../src/node/const.js');
  const notWSMessenger = require('../../src/node/messenger.js');
  const jwt = require('jsonwebtoken');
  const express = require('express');

  const app = express();
  const port = 13000;
  app.use(express.static(__dirname + '/public'));
  app.get('/api/token', (req, res) => {
    res.status(200).json({
      token: jwt.sign({
        user: 'guest',
        active: true,
        exp: Date.now() / 1000 + (CONST.TOKEN_TTL /30)
      }, JWT_KEY)
    });
    res.end();
  });

  app.listen(port, () => console.log(`Example app listening on port ${port}!`));
  const server = new notWSServer({
    getMessenger() {
      return new notWSMessenger({
        secure: true,
        types: {
          'test': ['sayHello']
        },
        validators: {
          credentials(credentials){
            try{
              let data = jwt.verify(credentials, JWT_KEY);
              if(data && typeof data.active === 'boolean'){
                return data.active;
              }else{
                return false;
              }
            }catch(e){
              console.error(e);
              return false;
            }
          }
        }
      })
    },
    secure: true,
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
