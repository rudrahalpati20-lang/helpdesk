const fs = require('fs');
const babel = require('@babel/core');
const code = fs.readFileSync('d:/Internship/helpdesk/temp.jsx', 'utf8');
try {
  babel.transformSync(code, {
    presets: [require.resolve('@babel/preset-react')]
  });
  console.log('Babel SUCCESS - no syntax error in JSX!');
} catch (e) {
  console.error('Babel ERROR:', e.message);
}
