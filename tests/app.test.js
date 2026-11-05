import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readFile } from 'node:fs/promises';
import { extractGitHubName, extractTechName, classifyBadge, rankRepo, assignReposWithDedup, parseBadgeImages, formatMarkdownOutput } from '../assets/js/app.js';

test('accepts only GitHub account names and profile URLs', () => {
    for (const value of ['example', 'https://github.com/example/', 'github.com/example']) {
        assert.equal(extractGitHubName(value), 'example');
    }
    for (const value of ['https://evil.test/github.com/example', 'https://github.com.evil.test/example', 'https://github.com/example/repo', 'https://github.com/example?x=1', 'https://user@github.com/example', '-bad', 'bad--name', '']) {
        assert.equal(extractGitHubName(value), null, value);
    }
});

test('handles malformed badge names and does not classify an empty name', () => {
    assert.doesNotThrow(() => extractTechName('<img src="https://img.shields.io/badge/%ZZ-red">'));
    assert.equal(classifyBadge('').category, 'other');
    assert.equal(classifyBadge('unicorn').category, 'other');
});

test('matching requires evidence and scores the repository actually assigned', () => {
    const repos = [
        { id: 1, name: 'react-first', full_name: 'owner/react-first', html_url: 'https://github.com/owner/react-first', topics: ['react'] },
        { id: 2, name: 'react-second', full_name: 'owner/react-second', html_url: 'https://github.com/owner/react-second' }
    ];
    assert.equal(rankRepo({ name: 'unrelated', stargazers_count: 40 }, ['react'], { category: 'framework', key: 'react' }), 0);
    const result = assignReposWithDedup(repos, ['<img src="https://img.shields.io/badge/react-blue?logo=react">', '<img src="https://img.shields.io/badge/react-blue?logo=react">'], repos[0].html_url);
    assert.equal(result[1].repoName, 'owner/react-second');
    assert.ok(result[0].score > result[1].score);
});

test('only emits safe image attributes and escapes markdown delimiters', () => {
    const dom = new JSDOM('');
    globalThis.document = dom.window.document;
    const { images, rejected } = parseBadgeImages('<img src="https://example.com/a(b).svg" alt="a]b" onerror="alert(1)"><img src="javascript:alert(1)"><img src="/relative">');
    assert.equal(images.length, 1);
    assert.equal(rejected, 2);
    assert.doesNotMatch(images[0], /onerror/);
    assert.equal(formatMarkdownOutput([{ imgTag: images[0], repoUrl: 'https://github.com/a/b' }]), '[![a\\]b](https://example.com/a%28b%29.svg)](https://github.com/a/b)');
    delete globalThis.document;
});

test('buttons work under CSP and invalid badges do not trigger network requests', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    assert.doesNotMatch(html, /onclick=/);
    const dom = new JSDOM(html, { url: 'https://example.test/' });
    globalThis.document = dom.window.document;
    globalThis.localStorage = dom.window.localStorage;
    let calls = 0;
    globalThis.fetch = async () => {
        calls++;
        return { ok: true, headers: new Headers(), json: async () => [{ id: 1, name: 'react', full_name: 'me/react', html_url: 'https://github.com/me/react', topics: ['react'] }] };
    };
    await import(`../assets/js/app.js?integration=${Date.now()}`);
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    const doc = dom.window.document;
    doc.querySelector('#githubUrl').value = 'me';
    doc.querySelector('#badgesInput').value = '<img src="javascript:alert(1)">';
    doc.querySelector('[data-action="generate"]').click();
    assert.equal(calls, 0);
    assert.match(doc.querySelector('#statusMessage').textContent, /HTTPS/);
    doc.querySelector('#badgesInput').value = '<img src="https://img.shields.io/badge/react-blue?logo=react" onerror="alert(1)">';
    doc.querySelector('[data-action="generate"]').click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(calls, 1);
    assert.match(doc.querySelector('#resultOutput').value, /https:\/\/github.com\/me\/react/);
    assert.doesNotMatch(doc.querySelector('#resultOutput').value, /onerror/);

    doc.querySelector('#orgAddBtn').click();
    doc.querySelector('.org-url-input').value = 'missing-org';
    globalThis.fetch = async () => ({ ok: false, status: 500, statusText: 'Server Error' });
    doc.querySelector('[data-action="generate"]').click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.match(doc.querySelector('#statusMessage').textContent, /missing-org/);
    assert.match(doc.querySelector('#resultOutput').value, /github.com/);

    doc.querySelector('.org-remove-btn').click();
    doc.querySelector('#githubUrl').value = 'other';
    let complete;
    globalThis.fetch = () => new Promise((resolve) => { complete = resolve; });
    doc.querySelector('[data-action="generate"]').click();
    assert.equal(doc.querySelector('[data-action="generate"]').disabled, true);
    doc.querySelector('#githubUrl').value = 'changed';
    complete({ ok: true, headers: new Headers(), json: async () => [{ id: 2, name: 'react', html_url: 'https://github.com/other/react' }] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.match(doc.querySelector('#statusMessage').textContent, /changed while loading/);
    assert.equal(doc.querySelector('#resultOutput').value, '');
    assert.equal(doc.querySelector('[data-action="generate"]').disabled, false);
    dom.window.close();
    delete globalThis.document;
    delete globalThis.localStorage;
    delete globalThis.fetch;
});

test('pagination is bounded and refuses links to other origins', async () => {
    const { fetchRepoPage } = await import('../assets/js/app.js');
    let calls = 0;
    globalThis.fetch = async () => {
        calls++;
        return { ok: true, headers: new Headers({ Link: '<https://api.github.com/users/me/repos?page=2>; rel="next"' }), json: async () => [{ id: calls }] };
    };
    const result = await fetchRepoPage('https://api.github.com/users/me/repos');
    assert.equal(calls, 5);
    assert.equal(result.repos.length, 5);
    assert.equal(result.truncated, true);
    globalThis.fetch = async () => ({ ok: true, headers: new Headers({ Link: '<https://evil.test/data>; rel="next"' }), json: async () => [] });
    await assert.rejects(fetchRepoPage('https://api.github.com/users/me/repos'), /Invalid GitHub pagination URL/);
    delete globalThis.fetch;
});
