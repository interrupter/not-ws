
try{
  const notWSServer = require('../../src/node/server.js');
  const notWSMessenger = require('../../src/node/messenger.js');
  const server = new notWSServer({
    getMessenger(){
      return new notWSMessenger({types: {'test': ['sayHello']}})
    }
  });
  server.start();
  let lastCount = 0;
  server.on('clientsCountChanged', (count)=>{
    if(lastCount!== count){
      console.log('Clients: ', count);
      lastCount = count;
    }
  })
}catch(e){
  console.error(e);
}
