try {
  const notWSClient = require('../../src/node/client.js');
  const CONST = require('../../src/node/const.js');
  const jwt = require('jsonwebtoken');
  const fetch = require('node-fetch');
  function getJSON(response) {
    if (response.json) {
      return response.json();
    } else {
      throw new TypeError("Oops, we haven't got JSON!");
    }
  }
  let client = new notWSClient({
    options: {
      host: 'localhost',
      port: 12000,
      path: '',
      secure: true,
      ping: true,
      getToken() {
        let headers = {
          'Pragma': 'no-cache',
          'Cache-control': 'no-cache'
        };
        return fetch('http://localhost:13000/api/token', {method: 'GET', headers}).then(getJSON).then((json) => {
          console.log('token', json.token);
          return json.token;
        });
      }
    }
  });
  client.once('ready', ()=>{
    //sending test message, with credetials
    client.send('test', 'sayHello', {
      test: true
    });
    client.on('tokenUpdated', (token)=>{
      console.info('token updated', token);
    })
    //now send with experied credentials
    setTimeout(
      () => {
        setInterval(()=>{
          client.send('test', 'sayHello', {
            test: true
          });
        }, 20000);
      }, 1000);
    setInterval(()=>{
      client.disconnect();
    } , 120000);
    setInterval(()=>{
      client.scheduleReconnect();
    } , 132000);
  });
} catch (e) {
  console.error(e);
}
