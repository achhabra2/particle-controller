var obj = { source: 'agent',
  resolvedQuery: 'What is the status of Aman\'s Office?',
  speech: '',
  action: 'getRoomStatus',
  actionIncomplete: false,
  parameters: { roomName: 'Aman\'s Office' },
  contexts: [],
  metadata: 
   { intentId: 'e3b042d8-5251-4dec-a481-e8f57615d4c2',
     webhookUsed: 'true',
     webhookForSlotFillingUsed: 'false',
     intentName: 'roomStatus' },
  fulfillment: { speech: '', messages: [ [Object] ] },
  score: 1 };
  
  
 console.log(obj.action);
 
 switch(obj.action) {
     case 'getRoomStatus':
         console.log('Yay');
         break;
     default:
        console.log('Default');
 }