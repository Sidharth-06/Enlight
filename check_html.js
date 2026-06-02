const fs = require('fs');
const html = fs.readFileSync('auth.html', 'utf16le');
console.log('Includes Sign In:', html.includes('Sign In'));
console.log('Includes form:', html.includes('<form'));
const matches = html.match(/class="([^"]+)"/g);
if (matches) {
  console.log(matches.slice(0, 10).join('\n'));
} else {
  console.log("No classes found.");
}
