import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const pkg=JSON.parse(readFileSync(new URL('../../package.json',import.meta.url),'utf8'));
test('isolated TEST integration serializes database-mutating test files',()=>{
 assert.match(pkg.scripts['test:integration'],/--test-concurrency=1/);
 assert.match(pkg.scripts['test:integration'],/tests\/integration\/\*\*\/\*\.test\.mjs/);
});
