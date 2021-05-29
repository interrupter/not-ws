try {
  const notWSClient = require('../../src/node/client.js');
  const notWSRouter = require('../../src/node/router.js');
  const notWSMessenger = require('../../src/node/messenger.js');
  const CONST = require('../../src/node/const.js');
  const jwt = require('jsonwebtoken');
  const fetch = require('node-fetch');

  var int = 0;


  function getJSON(response) {
    if (response.json) {
      return response.json();
    } else {
      throw new TypeError("Oops, we haven't got JSON!");
    }
  }
  let client = new notWSClient({
    router: new notWSRouter({}),
    messenger: new notWSMessenger({}),
    logger: console,
      connection:{
        host: 'localhost',
        port: 14444,
        path: '',
        secure: true,
        ping: true,
        history: true
      },
      getToken() {
        let headers = {
          'Pragma': 'no-cache',
          'Cache-control': 'no-cache'
        };
        return fetch('http://localhost:23000/api/token', {method: 'GET', headers})
          .then(getJSON)
          .then((json) => {
          console.log('token', json.token);
          return json.token;
        });
      }

  });
  client.on('tokenUpdated', (token)=>{
    console.info('token updated', token);
  });
  client.once('ready', ()=>{
    console.log('client ready');
    //sending test message, with credetials
    client.send('test', 'sayHello', {
      test: true,
      i: ++int
    }, true);
    client.connection.on('messageNotSent', (state) => {
      console.error(state);
    });
    //now send with experied credentials
    setTimeout(
      () => {
        setInterval(()=>{
          client.send('test', 'sayHello', {
            test: true,
            i: ++int
          }, true);
        }, 20000);
      }, 1000);
  /*  setInterval(()=>{
      console.log('force client to disconnect');
      client.disconnect();
    } , 12000);
    setInterval(()=>{
      console.log('force client to reconnect');
      client.reconnect();
    } , 13200);*/
  });
} catch (e) {
  console.error(e);
}
