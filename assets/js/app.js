import { DEFAULT_LOCALE, LOCALE_OPTIONS, getLocaleDictionary, isSupportedLocale } from '../i18n/index.js';

// ─── Constants ───────────────────────────────────────────────────────

const STORAGE_KEYS = {
    language: 'badge_linker_language',
    form: 'badge_linker_form_cache',
    repos: 'badge_linker_repo_cache'
};

const REPO_CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_REPO_PAGES = 5;
const FORM_CACHE_DEBOUNCE_MS = 300;
const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_REPO_URL_PATTERN = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/;

// ─── Badge Category System ───────────────────────────────────────────

const BADGE_CATEGORIES = {
    hosting:   { domains: {}, entries: {} },
    cloud:     { domains: {}, entries: {} },
    language:  { entries: {} },
    framework: { entries: {} },
    database:  { entries: {} },
    tool:      { entries: {} },
    ci:        { entries: {} }
};

function reg(category, key, aliases, domains) {
    const cat = BADGE_CATEGORIES[category];
    cat.entries[key] = aliases || [];
    if (domains && cat.domains) {
        domains.forEach((d) => { cat.domains[d] = key; });
    }
}

reg('hosting', 'vercel',           ['vercel', 'vercel.app', 'zeit'],                          ['vercel.app']);
reg('hosting', 'netlify',          ['netlify', 'netlify.app'],                                ['netlify.app', 'netlify.com']);
reg('hosting', 'render',           ['render', 'onrender', 'onrender.com'],                    ['onrender.com']);
reg('hosting', 'railway',          ['railway', 'railway.app'],                                ['railway.app']);
reg('hosting', 'heroku',           ['heroku', 'herokuapp'],                                   ['herokuapp.com']);
reg('hosting', 'githubpages',      ['gh-pages', 'github pages', 'github.io', 'githubpages'],  ['github.io']);
reg('hosting', 'surge',            ['surge', 'surge.sh'],                                     ['surge.sh']);
reg('hosting', 'fly',              ['fly', 'fly.io', 'flyio'],                                ['fly.dev', 'fly.io']);
reg('hosting', 'cloudflare pages', ['cloudflare pages', 'cf pages', 'pages.dev'],             ['pages.dev']);
reg('hosting', 'digitalocean app', ['digitalocean', 'do app platform'],                       ['ondigitalocean.app']);
reg('hosting', 'replit',           ['replit', 'repl.it'],                                     ['replit.app', 'repl.co']);

reg('cloud', 'aws',      ['amazon web services', 'aws', 's3', 'ec2', 'lambda'],   ['amazonaws.com', 'aws.amazon.com']);
reg('cloud', 'gcp',      ['google cloud', 'gcp', 'firebase', 'firebaseapp'],      ['firebaseapp.com', 'web.app', 'firebaseio.com']);
reg('cloud', 'azure',    ['microsoft azure', 'azure'],                            ['azurewebsites.net', 'azure.com']);
reg('cloud', 'supabase', ['supabase'],                                            ['supabase.co']);

reg('language', 'javascript',  ['javascript', 'js', 'ecmascript', 'es6', 'es2015']);
reg('language', 'typescript',  ['typescript', 'ts']);
reg('language', 'python',      ['python', 'py', 'python3']);
reg('language', 'java',        ['java']);
reg('language', 'kotlin',      ['kotlin', 'kt']);
reg('language', 'swift',       ['swift']);
reg('language', 'go',          ['go', 'golang']);
reg('language', 'rust',        ['rust', 'rs']);
reg('language', 'ruby',        ['ruby', 'rb']);
reg('language', 'php',         ['php']);
reg('language', 'csharp',      ['c#', 'csharp', 'c-sharp', 'dotnet', '.net']);
reg('language', 'cpp',         ['c++', 'cpp', 'cplusplus']);
reg('language', 'c',           ['c']);
reg('language', 'dart',        ['dart']);
reg('language', 'lua',         ['lua']);
reg('language', 'r',           ['r']);
reg('language', 'scala',       ['scala']);
reg('language', 'elixir',      ['elixir']);
reg('language', 'haskell',     ['haskell']);
reg('language', 'perl',        ['perl']);
reg('language', 'shell',       ['shell', 'bash', 'zsh', 'sh']);
reg('language', 'powershell',  ['powershell', 'pwsh']);
reg('language', 'html',        ['html', 'html5']);
reg('language', 'css',         ['css', 'css3']);
reg('language', 'sass',        ['sass', 'scss']);

reg('framework', 'react',        ['react', 'reactjs', 'react.js']);
reg('framework', 'nextjs',       ['next', 'nextjs', 'next.js']);
reg('framework', 'vue',          ['vue', 'vuejs', 'vue.js']);
reg('framework', 'nuxt',         ['nuxt', 'nuxtjs', 'nuxt.js']);
reg('framework', 'angular',      ['angular', 'angularjs']);
reg('framework', 'svelte',       ['svelte', 'sveltekit']);
reg('framework', 'express',      ['express', 'expressjs']);
reg('framework', 'fastapi',      ['fastapi']);
reg('framework', 'django',       ['django']);
reg('framework', 'flask',        ['flask']);
reg('framework', 'rails',        ['rails', 'ruby on rails', 'rubyonrails']);
reg('framework', 'laravel',      ['laravel']);
reg('framework', 'spring',       ['spring', 'springboot', 'spring boot']);
reg('framework', 'nestjs',       ['nest', 'nestjs', 'nest.js']);
reg('framework', 'astro',        ['astro']);
reg('framework', 'gatsby',       ['gatsby', 'gatsbyjs']);
reg('framework', 'remix',        ['remix']);
reg('framework', 'electron',     ['electron', 'electronjs']);
reg('framework', 'tailwindcss',  ['tailwind', 'tailwindcss']);
reg('framework', 'bootstrap',    ['bootstrap']);
reg('framework', 'vite',         ['vite', 'vitejs']);
reg('framework', 'webpack',      ['webpack']);
reg('framework', 'streamlit',    ['streamlit']);
reg('framework', 'jquery',       ['jquery']);
reg('framework', 'threejs',      ['three.js', 'threejs', 'three']);

reg('database', 'postgres',      ['postgresql', 'postgres', 'pg']);
reg('database', 'mysql',         ['mysql']);
reg('database', 'mongodb',       ['mongodb', 'mongo']);
reg('database', 'redis',         ['redis']);
reg('database', 'sqlite',        ['sqlite', 'sqlite3']);
reg('database', 'elasticsearch', ['elasticsearch', 'elastic']);
reg('database', 'dynamodb',      ['dynamodb']);

reg('tool', 'docker',     ['docker', 'container', 'dockerfile']);
reg('tool', 'kubernetes', ['kubernetes', 'k8s']);
reg('tool', 'terraform',  ['terraform']);
reg('tool', 'nginx',      ['nginx']);
reg('tool', 'git',        ['git']);
reg('tool', 'npm',        ['npm']);
reg('tool', 'yarn',       ['yarn']);
reg('tool', 'pnpm',       ['pnpm']);
reg('tool', 'figma',      ['figma']);
reg('tool', 'postman',    ['postman']);
reg('tool', 'grafana',    ['grafana']);
reg('tool', 'prometheus', ['prometheus']);
reg('tool', 'selenium',   ['selenium']);
reg('tool', 'jest',       ['jest']);
reg('tool', 'cypress',    ['cypress']);
reg('tool', 'eslint',     ['eslint']);
reg('tool', 'prettier',   ['prettier']);

reg('ci', 'githubactions', ['github actions', 'github-actions', 'actions']);
reg('ci', 'gitlab ci',     ['gitlab ci', 'gitlab-ci', 'gitlab']);
reg('ci', 'jenkins',       ['jenkins']);
reg('ci', 'circleci',      ['circleci', 'circle ci']);
reg('ci', 'travisci',      ['travis', 'travisci', 'travis ci']);


// ─── Category Detection ──────────────────────────────────────────────

function classifyBadge(techName) {
    const normalized = techName.toLowerCase().replace(/[^a-z0-9.\-+# ]/g, '');

    for (const [category, data] of Object.entries(BADGE_CATEGORIES)) {
        for (const [key, aliases] of Object.entries(data.entries)) {
            if (normalized === key || aliases.some((a) => a === normalized)) {
                return { category, key, aliases: [key, ...aliases] };
            }
        }
    }

    if (!normalized) return { category: 'other', key: '', aliases: [] };

    for (const [category, data] of Object.entries(BADGE_CATEGORIES)) {
        for (const [key, aliases] of Object.entries(data.entries)) {
            if (normalized.length >= 3 && ((key.length >= 3 && (key.includes(normalized) || normalized.includes(key))) ||
                aliases.some((a) => a.length >= 3 && (a.includes(normalized) || normalized.includes(a))))) {
                return { category, key, aliases: [key, ...aliases] };
            }
        }
    }

    return { category: 'other', key: normalized, aliases: [normalized] };
}


// ─── Scoring Profiles ────────────────────────────────────────────────

const SCORING_PROFILES = {
    hosting: {
        homepageDomain: 300, homepage: 40, language: 5,
        topics: 20, name: 15, description: 10, htmlUrl: 3
    },
    cloud: {
        homepageDomain: 250, homepage: 60, language: 5,
        topics: 50, name: 30, description: 20, htmlUrl: 5
    },
    language: {
        homepageDomain: 0, homepage: 5, language: 150,
        topics: 100, name: 40, description: 30, htmlUrl: 5
    },
    framework: {
        homepageDomain: 0, homepage: 15, language: 10,
        topics: 130, name: 80, description: 55, htmlUrl: 8
    },
    database: {
        homepageDomain: 0, homepage: 10, language: 5,
        topics: 120, name: 90, description: 60, htmlUrl: 5
    },
    tool: {
        homepageDomain: 0, homepage: 10, language: 5,
        topics: 110, name: 80, description: 50, htmlUrl: 5
    },
    ci: {
        homepageDomain: 0, homepage: 5, language: 5,
        topics: 90, name: 60, description: 40, htmlUrl: 5
    },
    other: {
        homepageDomain: 0, homepage: 30, language: 80,
        topics: 70, name: 50, description: 40, htmlUrl: 10
    }
};

const BONUS = {
    hasHomepage: 12, notFork: 8,
    starsCap: 40, starsMultiplier: 0.12, activityDays: 16
};


// ─── Core Matching ───────────────────────────────────────────────────

function normalizeToken(v) {
    return String(v || '').toLowerCase().replace(/[^a-z0-9.\-+#]/g, '');
}

function extractTechName(imgTag) {
    const logoMatch = imgTag.match(/logo=([a-z0-9_\-.+]+)/i);
    const badgeMatch = imgTag.match(/badge\/([a-z0-9_%+.\- ]+?)[-_]?[0-9a-f]{3,8}(?:\?|$)/i);
    const badgeFallback = imgTag.match(/badge\/([a-z0-9_%+.\-]+)-/i);
    const labelMatch = imgTag.match(/label=([a-z0-9_%+.\-]+)/i);

    const value = logoMatch?.[1] || badgeMatch?.[1] || badgeFallback?.[1] || labelMatch?.[1] || '';
    try {
        const decoded = decodeURIComponent(value).toLowerCase();
        return logoMatch ? decoded.replace(/\s+/g, '') : decoded;
    } catch {
        return value.toLowerCase();
    }
}

function getSearchTerms(classification) {
    return Array.from(new Set(classification.aliases.map(normalizeToken))).filter(Boolean);
}

function getHostingDomains(classification) {
    const catData = BADGE_CATEGORIES[classification.category];
    if (!catData || !catData.domains) return [];
    const domains = [];
    for (const [domain, key] of Object.entries(catData.domains)) {
        if (key === classification.key) domains.push(domain.toLowerCase());
    }
    return domains;
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wordBoundaryMatch(haystack, needle) {
    if (needle.length <= 2) {
        const re = new RegExp(`(?:^|[\\s\\-_./])${escapeRegex(needle)}(?:$|[\\s\\-_./])`, 'i');
        return re.test(haystack);
    }
    return haystack.includes(needle);
}

function rankRepo(repo, searchTerms, classification) {
    const profile = SCORING_PROFILES[classification.category] || SCORING_PROFILES.other;
    const lang = (repo.language || '').toLowerCase();
    const desc = (repo.description || '').toLowerCase();
    const name = (repo.name || '').toLowerCase();
    const topics = (repo.topics || []).map((v) => String(v).toLowerCase());
    const homepage = (repo.homepage || '').toLowerCase();
    const htmlUrl = (repo.html_url || '').toLowerCase();

    let score = 0;

    if (profile.homepageDomain > 0 && homepage) {
        const domains = getHostingDomains(classification);
        try {
            const host = new URL(homepage.includes('://') ? homepage : `https://${homepage}`).hostname;
            if (domains.some((domain) => host === domain || host.endsWith(`.${domain}`))) score += profile.homepageDomain;
        } catch {
            // Invalid homepage metadata does not contribute a domain match.
        }
    }

    searchTerms.forEach((term) => {
        if (!term) return;
        if (lang === term) score += profile.language;
        if (topics.includes(term)) score += profile.topics;
        if (wordBoundaryMatch(name, term)) score += profile.name;
        if (term.length >= 2 && wordBoundaryMatch(desc, term)) score += profile.description;
        if (homepage && homepage.includes(term)) score += profile.homepage;
        if (wordBoundaryMatch(htmlUrl, term)) score += profile.htmlUrl;
    });

    if (score === 0) return 0;
    if (repo.homepage) score += BONUS.hasHomepage;
    if (!repo.fork) score += BONUS.notFork;
    if (repo.stargazers_count) {
        score += Math.min(repo.stargazers_count, BONUS.starsCap) * BONUS.starsMultiplier;
    }
    const activityBonus = repo.pushed_at
        ? Math.max(0, BONUS.activityDays - (Date.now() - new Date(repo.pushed_at).getTime()) / 86400000)
        : 0;
    if (Number.isFinite(activityBonus)) score += activityBonus;

    return score;
}

function rankAllRepos(repos, imgTag) {
    const techName = extractTechName(imgTag);
    if (!techName) return [];

    const classification = classifyBadge(techName);
    const searchTerms = getSearchTerms(classification);
    if (!searchTerms.length) return [];

    const ranked = repos
        .map((repo) => ({ repo, score: rankRepo(repo, searchTerms, classification), classification }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score);

    const isDeployment = classification.category === 'hosting' || classification.category === 'cloud';
    if (isDeployment && ranked.length > 0) {
        const minThreshold = SCORING_PROFILES[classification.category].homepageDomain * 0.3;
        if (ranked[0].score < minThreshold) return [];
    }

    return ranked;
}

function getFallbackRepoUrl(repos) {
    const sorted = [...repos].sort((a, b) => {
        return new Date(b.pushed_at || 0).getTime() - new Date(a.pushed_at || 0).getTime();
    });
    return (sorted[0] && sorted[0].html_url) || repos[0].html_url;
}


// ─── Deduplication ───────────────────────────────────────────────────

function assignReposWithDedup(repos, imgTags, fallbackUrl) {
    const allRankings = imgTags.map((imgTag) => ({
        imgTag,
        ranked: rankAllRepos(repos, imgTag)
    }));

    const usedRepoIds = new Set();
    const assignments = [];

    allRankings.forEach(({ imgTag, ranked }) => {
        let assigned = null;
        for (const entry of ranked) {
            if (!usedRepoIds.has(entry.repo.id)) {
                assigned = entry.repo;
                usedRepoIds.add(entry.repo.id);
                break;
            }
        }
        assignments.push({ imgTag, repo: assigned, ranked });
    });

    assignments.forEach((item) => {
        if (!item.repo && item.ranked.length > 0) {
            item.repo = item.ranked[0].repo;
        }
    });

    return assignments.map(({ imgTag, repo, ranked }) => ({
        imgTag,
        repoUrl: sanitizeRepoUrl((repo && repo.html_url) || fallbackUrl),
        repoName: repo ? repo.full_name : null,
        score: ranked.find((entry) => entry.repo === repo)?.score || 0,
        techName: extractTechName(imgTag),
        category: ranked.length > 0 ? ranked[0].classification.category : 'other'
    }));
}


// ─── Output Formatting ──────────────────────────────────────────────

/**
 * Only GitHub repository URLs are allowed to end up in generated markup.
 * Anything else falls back to the plain GitHub homepage.
 */
function sanitizeRepoUrl(url) {
    return GITHUB_REPO_URL_PATTERN.test(url) ? url : 'https://github.com';
}

/** Escape a string for safe interpolation into HTML markup. */
function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatHtmlOutput(assignments) {
    return assignments.map(({ imgTag, repoUrl }) =>
        `<a href="${repoUrl}" target="_blank" rel="noopener noreferrer">\n  ${imgTag}\n</a>`
    ).join('\n\n');
}

function formatMarkdownOutput(assignments) {
    return assignments.map(({ imgTag, repoUrl }) => {
        const template = document.createElement('template');
        template.innerHTML = imgTag;
        const image = template.content.querySelector('img');
        if (!image) return '';
        const src = image.getAttribute('src').replace(/%/g, '%25').replace(/%25([0-9a-f]{2})/gi, '%$1')
            .replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\s/g, '%20')
            .replace(/</g, '%3C').replace(/>/g, '%3E').replace(/\\/g, '%5C');
        const alt = (image.getAttribute('alt') || 'badge').replace(/([\\\[\]])/g, '\\$1').replace(/[\r\n]/g, ' ');
        return `[![${alt}](${src})](${repoUrl})`;
    }).filter(Boolean).join('\n');
}

function parseBadgeImages(markup) {
    const template = document.createElement('template');
    template.innerHTML = markup;
    const sourceImages = Array.from(template.content.querySelectorAll('img'));
    const images = sourceImages.flatMap((image) => {
        const src = image.getAttribute('src');
        try {
            const url = new URL(src);
            if (url.protocol !== 'https:' || url.username || url.password) return [];
        } catch {
            return [];
        }
        const safe = document.createElement('img');
        for (const name of ['src', 'alt', 'title', 'width', 'height', 'align']) {
            if (image.hasAttribute(name)) safe.setAttribute(name, image.getAttribute(name));
        }
        return [safe.outerHTML];
    });
    return { images, rejected: sourceImages.length - images.length };
}

// ─── Dynamic Organization URL Rows ───────────────────────────────────

let orgRowCounter = 0;

function createOrgRow(value) {
    orgRowCounter++;
    const id = `orgUrl_${orgRowCounter}`;
    const row = document.createElement('div');
    row.className = 'org-url-row';
    row.dataset.orgId = id;

    const input = document.createElement('input');
    input.type = 'text';
    input.id = id;
    input.className = 'org-url-input';
    input.placeholder = t('orgPlaceholder');
    input.setAttribute('aria-label', t('orgLabel'));
    input.value = value || '';
    input.addEventListener('input', debouncedSaveFormCache);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'org-remove-btn';
    removeBtn.textContent = '−';
    removeBtn.title = t('orgRemoveTitle');
    removeBtn.setAttribute('aria-label', t('orgRemoveTitle'));
    removeBtn.addEventListener('click', () => {
        row.remove();
        saveFormCache();
    });

    row.appendChild(input);
    row.appendChild(removeBtn);
    return row;
}

function addOrgRow(value) {
    const list = document.getElementById('orgUrlList');
    list.appendChild(createOrgRow(value));
    saveFormCache();
}

function getOrgUrls() {
    const inputs = document.querySelectorAll('#orgUrlList .org-url-input');
    return Array.from(inputs)
        .map((input) => input.value.trim())
        .filter(Boolean);
}

function restoreOrgRows(urls) {
    const list = document.getElementById('orgUrlList');
    list.innerHTML = '';
    orgRowCounter = 0;
    if (urls && urls.length > 0) {
        urls.forEach((url) => {
            list.appendChild(createOrgRow(url));
        });
    }
}


// ─── Locale / Cache / UI ────────────────────────────────────────────

let currentLanguage = readStorage(STORAGE_KEYS.language) || DEFAULT_LOCALE;

function getCurrentLanguage() {
    const saved = currentLanguage;
    if (saved && isSupportedLocale(saved)) return saved;
    return DEFAULT_LOCALE;
}

function t(key, variables = {}) {
    const dict = getLocaleDictionary(getCurrentLanguage());
    const fallback = getLocaleDictionary(DEFAULT_LOCALE);
    const template = dict[key] || fallback[key] || key;
    return Object.keys(variables).reduce(
        (acc, varName) => acc.replaceAll(`{${varName}}`, String(variables[varName])),
        template
    );
}

function renderLocaleOptions() {
    const el = document.getElementById('languageSelect');
    el.innerHTML = LOCALE_OPTIONS.map(
        (loc) => `<option value="${loc.code}">${loc.label}</option>`
    ).join('');
}

function applyLanguage() {
    const lang = getCurrentLanguage();
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
        el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
        el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
        const value = t(el.dataset.i18nTitle);
        el.title = value;
        el.setAttribute('aria-label', value);
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
        el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel));
    });
    document.querySelectorAll('.org-remove-btn').forEach((el) => {
        el.title = t('orgRemoveTitle');
        el.setAttribute('aria-label', el.title);
    });
    // Update dynamic organization labels and placeholders.
    document.querySelectorAll('.org-url-input').forEach((el) => {
        el.placeholder = t('orgPlaceholder');
        el.setAttribute('aria-label', t('orgLabel'));
    });
    const sel = document.getElementById('languageSelect');
    if (sel) sel.value = lang;
}

function readStorage(key) {
    try { return localStorage.getItem(key); } catch { return null; }
}

function writeStorage(key, value) {
    try { localStorage.setItem(key, value); } catch { /* Storage is optional. */ }
}

function readJsonStorage(key) {
    const raw = readStorage(key);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (_e) {
        try { localStorage.removeItem(key); } catch { /* Storage is optional. */ }
        return null;
    }
}

function loadFormCache() {
    const data = readJsonStorage(STORAGE_KEYS.form);
    if (!data) return;
    if (typeof data.githubUrl === 'string') document.getElementById('githubUrl').value = data.githubUrl;
    if (typeof data.badgesInput === 'string') document.getElementById('badgesInput').value = data.badgesInput;
    if (typeof data.resultOutput === 'string') document.getElementById('resultOutput').value = data.resultOutput;
    if (['html', 'markdown'].includes(data.outputFormat)) {
        const radio = document.querySelector(`input[name="outputFormat"][value="${data.outputFormat}"]`);
        if (radio) radio.checked = true;
    }
    if (Array.isArray(data.orgUrls)) {
        restoreOrgRows(data.orgUrls);
    }
}

function saveFormCache() {
    const formatRadio = document.querySelector('input[name="outputFormat"]:checked');
    const payload = {
        githubUrl: document.getElementById('githubUrl').value,
        badgesInput: document.getElementById('badgesInput').value,
        resultOutput: document.getElementById('resultOutput').value,
        outputFormat: formatRadio ? formatRadio.value : 'html',
        orgUrls: getOrgUrls()
    };
    writeStorage(STORAGE_KEYS.form, JSON.stringify(payload));
}

/** Debounced variant so rapid typing does not hammer localStorage. */
function debounce(fn, waitMs) {
    let timer = null;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), waitMs);
    };
}
const debouncedSaveFormCache = debounce(saveFormCache, FORM_CACHE_DEBOUNCE_MS);

function getRepoCache(username) {
    const cache = readJsonStorage(STORAGE_KEYS.repos);
    if (!cache || !Object.hasOwn(cache, username)) return null;
    const entry = cache[username];
    if (!entry || !Array.isArray(entry.repos) || !Number.isFinite(entry.timestamp) || Date.now() - entry.timestamp > REPO_CACHE_TTL_MS || entry.timestamp > Date.now()) {
        delete cache[username];
        writeStorage(STORAGE_KEYS.repos, JSON.stringify(cache));
        return null;
    }
    return entry;
}

function setRepoCache(username, repos, truncated) {
    const cache = readJsonStorage(STORAGE_KEYS.repos) || {};
    cache[username] = { timestamp: Date.now(), repos, truncated };
    writeStorage(STORAGE_KEYS.repos, JSON.stringify(cache));
}


// ─── GitHub API with Pagination ──────────────────────────────────────

function parseLinkHeader(header) {
    if (!header) return {};
    const links = {};
    header.split(',').forEach((part) => {
        const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
        if (match) links[match[2]] = match[1];
    });
    return links;
}

async function fetchRepoPage(url, { onFirstPageNotFound } = {}) {
    let allRepos = [];
    let nextUrl = url;
    let page = 0;

    while (nextUrl && page < MAX_REPO_PAGES) {
        const next = new URL(nextUrl);
        if (next.origin !== GITHUB_API_BASE) throw new Error('Invalid GitHub pagination URL');
        const resp = await fetch(next.href);
        if (!resp.ok) {
            if (resp.status === 404 && page === 0 && onFirstPageNotFound) {
                return onFirstPageNotFound();
            }
            throw new Error(t('errorApi', { status: resp.status, statusText: resp.statusText }));
        }
        const repos = await resp.json();
        if (!Array.isArray(repos)) throw new Error('Invalid GitHub API response');
        allRepos.push(...repos.filter((repo) => repo && typeof repo === 'object').map((repo) => ({
            id: repo.id, name: repo.name, full_name: repo.full_name, html_url: repo.html_url,
            language: repo.language, description: repo.description, topics: repo.topics,
            homepage: repo.homepage, fork: repo.fork, stargazers_count: repo.stargazers_count,
            pushed_at: repo.pushed_at
        })));
        nextUrl = parseLinkHeader(resp.headers.get('Link')).next || null;
        page++;
    }

    return { repos: allRepos, truncated: Boolean(nextUrl) };
}

async function fetchReposForAccount(account) {
    const cached = getRepoCache(account);
    if (cached) return cached;

    // Account names come from user input; encode before placing in the URL.
    const encoded = encodeURIComponent(account);
    const result = await fetchRepoPage(
        `${GITHUB_API_BASE}/users/${encoded}/repos?per_page=100&sort=updated`,
        { onFirstPageNotFound: () => fetchReposForOrg(account) }
    );

    setRepoCache(account, result.repos, result.truncated);
    return result;
}

async function fetchReposForOrg(orgName) {
    const cacheKey = `org:${orgName}`;
    const cached = getRepoCache(cacheKey);
    if (cached) return cached;

    const encoded = encodeURIComponent(orgName);
    const result = await fetchRepoPage(
        `${GITHUB_API_BASE}/orgs/${encoded}/repos?per_page=100&sort=updated`
    );

    setRepoCache(cacheKey, result.repos, result.truncated);
    return result;
}

/**
 * Extract GitHub username/org name from a URL.
 * Accepts: https://github.com/name, github.com/name, just "name"
 */
function extractGitHubName(input) {
    const trimmed = input.trim();
    const validName = /^(?!-)(?!.*--)[a-z0-9-]{1,39}(?<!-)$/i;
    if (validName.test(trimmed)) return trimmed;
    try {
        const url = new URL(trimmed.startsWith('github.com/') ? `https://${trimmed}` : trimmed);
        if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'github.com' ||
            url.port || url.username || url.password || url.search || url.hash) return null;
        const match = url.pathname.match(/^\/([^/]+)\/?$/);
        return match && validName.test(match[1]) ? match[1] : null;
    } catch {
        return null;
    }
}

/**
 * Fetch repos from the main profile + all org URLs.
 * Deduplicates by repo id. Returns merged pool.
 */
async function fetchAllRepos(mainUsername, orgUrls, statusMsg) {
    const failedAccounts = [];
    const truncatedAccounts = [];
    const allAccounts = [{ name: mainUsername, isMain: true }];

    const seenAccounts = new Set([mainUsername.toLowerCase()]);
    orgUrls.forEach((url) => {
        const name = extractGitHubName(url);
        if (name && !seenAccounts.has(name.toLowerCase())) {
            seenAccounts.add(name.toLowerCase());
            allAccounts.push({ name, isMain: false });
        }
    });

    let mergedRepos = [];
    const seenIds = new Set();

    for (const account of allAccounts) {
        statusMsg.textContent = t('statusFetching', { username: account.name });
        try {
            const { repos, truncated } = await fetchReposForAccount(account.name);
            if (truncated) truncatedAccounts.push(account.name);
            repos.forEach((repo) => {
                if (!seenIds.has(repo.id)) {
                    seenIds.add(repo.id);
                    mergedRepos.push(repo);
                }
            });
        } catch (err) {
            // If an org fails, warn but continue with other sources
            if (!account.isMain) {
                console.warn(`Failed to fetch repos for ${account.name}: ${err.message}`);
                failedAccounts.push(account.name);
            } else {
                throw err;
            }
        }
    }

    return { repos: mergedRepos, failedAccounts, truncatedAccounts };
}


// ─── Match Summary ───────────────────────────────────────────────────

function renderMatchSummary(assignments) {
    const container = document.getElementById('matchSummary');
    if (!container) return;

    if (!assignments || assignments.length === 0) {
        container.innerHTML = '';
        return;
    }

    const rows = assignments.map(({ techName, repoUrl, repoName, score, category }) => {
        const confidence = score >= 200 ? 'high' : score >= 80 ? 'mid' : 'low';
        const repoDisplay = repoName || repoUrl.replace('https://github.com/', '');
        // All interpolated values are escaped: badge names come from user-pasted markup.
        const safeUrl = escapeHtml(repoUrl);
        return `<tr class="match-${confidence}">
            <td class="match-tech">${escapeHtml(techName || '?')}</td>
            <td class="match-cat">${escapeHtml(category)}</td>
            <td class="match-repo"><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(repoDisplay)}</a></td>
            <td class="match-score">${Math.round(score)}</td>
            <td class="match-conf">${confidence}</td>
        </tr>`;
    }).join('');

    container.innerHTML = `<table class="match-table">
        <thead><tr>
            <th data-i18n="matchBadge">${t('matchBadge')}</th>
            <th data-i18n="matchCategory">${t('matchCategory')}</th>
            <th data-i18n="matchRepo">${t('matchRepo')}</th>
            <th data-i18n="matchScore">${t('matchScore')}</th>
            <th data-i18n="matchConfidence">${t('matchConfidence')}</th>
        </tr></thead>
        <tbody>${rows}</tbody>
    </table>`;
}


// ─── Main Actions ────────────────────────────────────────────────────

function getOutputFormat() {
    const radio = document.querySelector('input[name="outputFormat"]:checked');
    return radio ? radio.value : 'html';
}

function setStatus(statusMsg, key, variables = {}, isError = false) {
    statusMsg.textContent = t(key, variables);
    statusMsg.className = isError ? 'status error' : 'status';
}

async function generateLinks() {
    const generateButton = document.querySelector('[data-action="generate"]');
    if (generateButton.disabled) return;
    const githubUrl = document.getElementById('githubUrl').value.trim();
    const badgesInput = document.getElementById('badgesInput').value.trim();
    const resultOutput = document.getElementById('resultOutput');
    const statusMsg = document.getElementById('statusMessage');

    resultOutput.value = '';
    renderMatchSummary([]);
    setStatus(statusMsg, 'statusProcessing');

    const mainName = extractGitHubName(githubUrl);
    if (!mainName) {
        setStatus(statusMsg, 'errorInvalidUrl', {}, true);
        return;
    }

    const orgUrls = getOrgUrls();
    if (orgUrls.some((url) => !extractGitHubName(url))) {
        setStatus(statusMsg, 'errorInvalidOrg', {}, true);
        return;
    }
    const { images, rejected } = parseBadgeImages(badgesInput);
    if (!images.length) {
        setStatus(statusMsg, 'errorNoImg', {}, true);
        return;
    }

    const format = getOutputFormat();
    generateButton.disabled = true;
    try {
        const { repos, failedAccounts, truncatedAccounts } = await fetchAllRepos(mainName, orgUrls, statusMsg);

        if (githubUrl !== document.getElementById('githubUrl').value.trim() ||
            badgesInput !== document.getElementById('badgesInput').value.trim() ||
            format !== getOutputFormat() || JSON.stringify(orgUrls) !== JSON.stringify(getOrgUrls())) {
            setStatus(statusMsg, 'statusChanged', {}, true);
            return;
        }
        if (repos.length === 0) {
            const detail = failedAccounts.length ? ` ${t('statusPartial', { accounts: failedAccounts.join(', ') })}` : '';
            throw new Error(t('errorNoRepos') + detail);
        }

        const fallbackUrl = getFallbackRepoUrl(repos);
        const assignments = assignReposWithDedup(repos, images, fallbackUrl);

        resultOutput.value = format === 'markdown'
            ? formatMarkdownOutput(assignments)
            : formatHtmlOutput(assignments);

        renderMatchSummary(assignments);
        setStatus(statusMsg, 'statusDone');
        if (rejected) statusMsg.textContent += ' ' + t('statusRejected', { count: rejected });
        if (failedAccounts.length) statusMsg.textContent += ' ' + t('statusPartial', { accounts: failedAccounts.join(', ') });
        if (truncatedAccounts.length) statusMsg.textContent += ' ' + t('statusTruncated', { accounts: truncatedAccounts.join(', ') });
        saveFormCache();
    } catch (error) {
        setStatus(statusMsg, 'errorGeneric', { message: error.message }, true);
    } finally {
        generateButton.disabled = false;
    }
}

async function copyResultCode() {
    const resultOutput = document.getElementById('resultOutput');
    const statusMsg = document.getElementById('statusMessage');

    if (!resultOutput.value.trim()) {
        setStatus(statusMsg, 'errorGeneric', { message: t('errorNoImg') }, true);
        return;
    }

    try {
        await navigator.clipboard.writeText(resultOutput.value);
        setStatus(statusMsg, 'copySuccess');
    } catch (_e) {
        setStatus(statusMsg, 'copyError', {}, true);
    }
}

const ACTION_HANDLERS = {
    generate: generateLinks,
    copy: copyResultCode
};

function initializeApp() {
    const langSelect = document.getElementById('languageSelect');
    const githubInput = document.getElementById('githubUrl');
    const badgesEl = document.getElementById('badgesInput');
    const formatRadios = document.querySelectorAll('input[name="outputFormat"]');
    const orgAddBtn = document.getElementById('orgAddBtn');

    renderLocaleOptions();
    loadFormCache();
    applyLanguage();

    langSelect.addEventListener('change', (e) => {
        currentLanguage = e.target.value;
        writeStorage(STORAGE_KEYS.language, currentLanguage);
        applyLanguage();
    });

    githubInput.addEventListener('input', debouncedSaveFormCache);
    badgesEl.addEventListener('input', debouncedSaveFormCache);
    formatRadios.forEach((r) => r.addEventListener('change', saveFormCache));
    orgAddBtn.addEventListener('click', () => addOrgRow(''));

    // Bind action buttons via data-action attributes (no inline handlers, CSP-friendly).
    document.querySelectorAll('[data-action]').forEach((btn) => {
        const handler = ACTION_HANDLERS[btn.dataset.action];
        if (handler) btn.addEventListener('click', handler);
    });
}

if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', initializeApp);

export { extractGitHubName, extractTechName, classifyBadge, rankRepo, assignReposWithDedup, sanitizeRepoUrl, parseBadgeImages, formatMarkdownOutput, fetchRepoPage };
