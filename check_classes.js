const fs = require('fs');
const html = fs.readFileSync('auth.html', 'utf8');
const matches = html.match(/class="([^"]+)"/g);
if (matches) {
  console.log(matches.slice(0, 30).join('\n'));
} else {
  console.log("No classes found.");
}
