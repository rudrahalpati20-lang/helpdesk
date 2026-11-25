const fs = require('fs');
const babel = require('d:/Internship/node_modules/@babel/core');
const code = fs.readFileSync('d:/Internship/helpdesk/temp.jsx', 'utf8');

try {
  babel.parseSync(code, {
    configFile: false,
    babelrc: false,
    sourceType: 'module',
    filename: 'test.jsx'
  });
  console.log('Parser SUCCESS!');
} catch (e) {
  console.error('Parser ERROR at line', e.loc ? e.loc.line : 'unknown', ':', e.message);
}
