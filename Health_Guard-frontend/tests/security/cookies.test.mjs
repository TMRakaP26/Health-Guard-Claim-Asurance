import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { transformWithEsbuild } from 'vite';

// Compile the real TypeScript module with the project's existing Vite toolchain.
const source = await readFile(new URL('../../src/app/utils/cookies.ts', import.meta.url), 'utf8');
const { code } = await transformWithEsbuild(source, 'cookies.ts', { loader: 'ts' });
const cookies = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
let jar;
beforeEach(() => {
  jar = new Map();
  globalThis.document = {
    get cookie() { return [...jar].map(([key, value]) => `${key}=${value}`).join('; '); },
    set cookie(value) {
      const [pair, ...attributes] = value.split(';');
      const separator = pair.indexOf('=');
      const name = pair.slice(0, separator);
      const content = pair.slice(separator + 1);
      const expiry = attributes.find(attribute => attribute.trim().startsWith('expires='));
      if (expiry && new Date(expiry.trim().slice(8)).getTime() < Date.now()) jar.delete(name);
      else jar.set(name, content);
    },
  };
});

const user = { name: 'Client', email: 'client@example.test', role: 'client' };

test('serialization only stores the allowlisted identity fields', () => {
  cookies.addQuickUser({ ...user, password: 'must-never-be-stored', token: 'secret-token' });
  assert.deepEqual(cookies.getQuickUsers(), [user]);
  assert.equal(decodeURIComponent(document.cookie).includes('password'), false);
  assert.equal(decodeURIComponent(document.cookie).includes('secret-token'), false);
});

test('legacy password cookies are deleted, including mixed old and new records', () => {
  cookies.setCookie('quick_user', JSON.stringify([user, { ...user, password: 'legacy-secret' }]));
  assert.deepEqual(cookies.getQuickUsers(), []);
  assert.equal(document.cookie, '');
});

test('malformed cookie is discarded', () => {
  cookies.setCookie('quick_user', '{invalid');
  assert.deepEqual(cookies.getQuickUsers(), []);
  assert.equal(document.cookie, '');
});

test('invalid roles and invalid field types are ignored', () => {
  cookies.setCookie('quick_user', JSON.stringify([null, { ...user, role: 'admin' }, { ...user, email: 123 }, user]));
  assert.deepEqual(cookies.getQuickUsers(), [user]);
});

test('saved accounts deduplicate, keep at most five, and can be removed', () => {
  for (let index = 0; index < 7; index++) cookies.addQuickUser({ ...user, email: `${index}@example.test` });
  assert.equal(cookies.getQuickUsers().length, 5);
  cookies.addQuickUser({ ...user, email: '3@example.test' });
  assert.equal(cookies.getQuickUsers()[0].email, '3@example.test');
  assert.equal(cookies.getQuickUsers().length, 5);
  for (const account of cookies.getQuickUsers()) cookies.removeQuickUserByEmail(account.email);
  assert.equal(document.cookie, '');
});
