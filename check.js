const fs = require('fs');
const content = fs.readFileSync('d:/Internship/helpdesk/server.cjs', 'utf8');
const match = content.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
if (!match) {
  console.log('No match found');
} else {
  fs.writeFileSync('d:/Internship/helpdesk/temp.jsx', match[1]);
  console.log('Saved temp.jsx, bytes:', match[1].length);
}
