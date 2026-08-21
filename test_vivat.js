const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
const key = process.env.TAVILY_API_KEY;

fetch('https://api.tavily.com/extract', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ api_key: key, urls: ['https://vivat.ua/', 'https://vivat.ua/actions/'] })
})
.then(r => r.json())
.then(data => {
  const content = JSON.stringify(data);
  console.log(content.substring(0, 500));
  if (content.includes('35')) console.log('FOUND 35%!');
  if (content.includes('закриття')) console.log('FOUND закриття!');
});
