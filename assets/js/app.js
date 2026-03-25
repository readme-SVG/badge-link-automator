import { DEFAULT_LOCALE, LOCALE_OPTIONS, getLocaleDictionary, isSupportedLocale } from '../i18n/index.js';

const STORAGE_KEYS = {
    language: 'badge_linker_language',
    form: 'badge_linker_form_cache',
    repos: 'badge_linker_repo_cache'
};

const REPO_CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_REPO_PAGES = 5; // up to 500 repos via pagination

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

// ── Hosting ──
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

// ── Cloud ──
reg('cloud', 'aws',      ['amazon web services', 'aws', 's3', 'ec2', 'lambda'],   ['amazonaws.com', 'aws.amazon.com']);
reg('cloud', 'gcp',      ['google cloud', 'gcp', 'firebase', 'firebaseapp'],      ['firebaseapp.com', 'web.app', 'firebaseio.com']);
reg('cloud', 'azure',    ['microsoft azure', 'azure'],                            ['azurewebsites.net', 'azure.com']);
reg('cloud', 'supabase', ['supabase'],                                            ['supabase.co']);

// ── Languages ──
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

// ── Frameworks ──
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

// ── Databases ──
reg('database', 'postgres',      ['postgresql', 'postgres', 'pg']);
reg('database', 'mysql',         ['mysql']);
reg('database', 'mongodb',       ['mongodb', 'mongo']);
reg('database', 'redis',         ['redis']);
reg('database', 'sqlite',        ['sqlite', 'sqlite3']);
reg('database', 'elasticsearch', ['elasticsearch', 'elastic']);
reg('database', 'dynamodb',      ['dynamodb']);

// ── Tools ──
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

// ── CI/CD ──
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

    for (const [category, data] of Object.entries(BADGE_CATEGORIES)) {
        for (const [key, aliases] of Object.entries(data.entries)) {
            if (key.includes(normalized) || normalized.includes(key) ||
                aliases.some((a) => a.includes(normalized) || normalized.includes(a))) {
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
    // logo= is the most reliable (standardized simpleicons slugs)
    const logoMatch = imgTag.match(/logo=([a-z0-9_\-.+]+)/i);
    const badgeMatch = imgTag.match(/badge\/([a-z0-9_%+.\- ]+?)[-_]?[0-9a-f]{3,8}(?:\?|$)/i);
    const badgeFallback = imgTag.match(/badge\/([a-z0-9_%+.\-]+)-/i);
    const labelMatch = imgTag.match(/label=([a-z0-9_%+.\-]+)/i);

    if (logoMatch) return decodeURIComponent(logoMatch[1]).toLowerCase().replace(/\s+/g, '');
    if (badgeMatch) return decodeURIComponent(badgeMatch[1]).toLowerCase();
    if (badgeFallback) return decodeURIComponent(badgeFallback[1]).toLowerCase();
    if (labelMatch) return decodeURIComponent(labelMatch[1]).toLowerCase();
    return '';
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
        if (domains.some((d) => homepage.includes(d))) score += profile.homepageDomain;
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

    if (repo.homepage) score += BONUS.hasHomepage;
    if (!repo.fork) score += BONUS.notFork;
    if (repo.stargazers_count) {
        score += Math.min(repo.stargazers_count, BONUS.starsCap) * BONUS.starsMultiplier;
    }
    const activityBonus = repo.pushed_at
        ? Math.max(0, BONUS.activityDays - (Date.now() - new Date(repo.pushed_at).getTime()) / 86400000)
        : 0;
    score += activityBonus;

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

    // First pass: assign best unique match
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

    // Second pass: unmatched get overall best (even if duplicate)
    assignments.forEach((item) => {
        if (!item.repo && item.ranked.length > 0) {
            item.repo = item.ranked[0].repo;
        }
    });

    return assignments.map(({ imgTag, repo, ranked }) => ({
        imgTag,
        repoUrl: (repo && repo.html_url) || fallbackUrl,
        repoName: repo ? repo.full_name : null,
        score: ranked.length > 0 ? ranked[0].score : 0,
        techName: extractTechName(imgTag),
        category: ranked.length > 0 ? ranked[0].classification.category : 'other'
    }));
}


// ─── Output Formatting ──────────────────────────────────────────────

function formatHtmlOutput(assignments) {
    return assignments.map(({ imgTag, repoUrl }) =>
        `<a href="${repoUrl}" target="_blank" rel="noopener noreferrer">\n  ${imgTag}\n</a>`
    ).join('\n\n');
}

function formatMarkdownOutput(assignments) {
    return assignments.map(({ imgTag, repoUrl }) => {
        const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
        if (!srcMatch) return '';
        const altMatch = imgTag.match(/alt=["']([^"']+)["']/i);
        const alt = altMatch ? altMatch[1] : 'badge';
        return `[![${alt}](${srcMatch[1]})](${repoUrl})`;
    }).filter(Boolean).join('\n');
}


// ─── Locale / Cache / UI ────────────────────────────────────────────

function getCurrentLanguage() {
    const saved = localStorage.getItem(STORAGE_KEYS.language);
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
    const sel = document.getElementById('languageSelect');
    if (sel) sel.value = lang;
}

function loadFormCache() {
    const raw = localStorage.getItem(STORAGE_KEYS.form);
    if (!raw) return;
    try {
        const data = JSON.parse(raw);
        if (typeof data.githubUrl === 'string') document.getElementById('githubUrl').value = data.githubUrl;
        if (typeof data.badgesInput === 'string') document.getElementById('badgesInput').value = data.badgesInput;
        if (typeof data.resultOutput === 'string') document.getElementById('resultOutput').value = data.resultOutput;
        if (typeof data.outputFormat === 'string') {
            const radio = document.querySelector(`input[name="outputFormat"][value="${data.outputFormat}"]`);
            if (radio) radio.checked = true;
        }
    } catch (_e) {
        localStorage.removeItem(STORAGE_KEYS.form);
    }
}

function saveFormCache() {
    const formatRadio = document.querySelector('input[name="outputFormat"]:checked');
    const payload = {
        githubUrl: document.getElementById('githubUrl').value,
        badgesInput: document.getElementById('badgesInput').value,
        resultOutput: document.getElementById('resultOutput').value,
        outputFormat: formatRadio ? formatRadio.value : 'html'
    };
    localStorage.setItem(STORAGE_KEYS.form, JSON.stringify(payload));
}

function getRepoCache(username) {
    const raw = localStorage.getItem(STORAGE_KEYS.repos);
    if (!raw) return null;
    try {
        const cache = JSON.parse(raw);
        if (!cache[username]) return null;
        const entry = cache[username];
        if (Date.now() - entry.timestamp > REPO_CACHE_TTL_MS) {
            delete cache[username];
            localStorage.setItem(STORAGE_KEYS.repos, JSON.stringify(cache));
            return null;
        }
        return entry.repos;
    } catch (_e) {
        localStorage.removeItem(STORAGE_KEYS.repos);
        return null;
    }
}

function setRepoCache(username, repos) {
    const raw = localStorage.getItem(STORAGE_KEYS.repos);
    let cache = {};
    if (raw) { try { cache = JSON.parse(raw); } catch (_e) { cache = {}; } }
    cache[username] = { timestamp: Date.now(), repos };
    localStorage.setItem(STORAGE_KEYS.repos, JSON.stringify(cache));
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

async function fetchRepos(username) {
    const cached = getRepoCache(username);
    if (cached) return cached;

    let allRepos = [];
    let url = `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`;
    let page = 0;

    while (url && page < MAX_REPO_PAGES) {
        const resp = await fetch(url);
        if (!resp.ok) {
            throw new Error(t('errorApi', { status: resp.status, statusText: resp.statusText }));
        }
        const repos = await resp.json();
        allRepos = allRepos.concat(repos);
        const links = parseLinkHeader(resp.headers.get('Link'));
        url = links.next || null;
        page++;
    }

    setRepoCache(username, allRepos);
    return allRepos;
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
        const safeUrl = repoUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
        return `<tr class="match-${confidence}">
            <td class="match-tech">${techName || '?'}</td>
            <td class="match-cat">${category}</td>
            <td class="match-repo"><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${repoDisplay}</a></td>
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

async function generateLinks() {
    const githubUrl = document.getElementById('githubUrl').value.trim();
    const badgesInput = document.getElementById('badgesInput').value.trim();
    const resultOutput = document.getElementById('resultOutput');
    const statusMsg = document.getElementById('statusMessage');

    resultOutput.value = '';
    renderMatchSummary([]);
    statusMsg.textContent = t('statusProcessing');
    statusMsg.className = 'status';

    const usernameMatch = githubUrl.match(/github\.com\/([^/]+)/i);
    if (!usernameMatch) {
        statusMsg.textContent = t('errorInvalidUrl');
        statusMsg.className = 'status error';
        return;
    }

    const username = usernameMatch[1];

    try {
        statusMsg.textContent = t('statusFetching', { username });
        const repos = await fetchRepos(username);

        if (repos.length === 0) throw new Error(t('errorNoRepos'));

        const images = badgesInput.match(/<img[^>]+>/gi);
        if (!images) {
            statusMsg.textContent = t('errorNoImg');
            statusMsg.className = 'status error';
            return;
        }

        const fallbackUrl = getFallbackRepoUrl(repos);
        const assignments = assignReposWithDedup(repos, images, fallbackUrl);

        const format = getOutputFormat();
        resultOutput.value = format === 'markdown'
            ? formatMarkdownOutput(assignments)
            : formatHtmlOutput(assignments);

        renderMatchSummary(assignments);
        statusMsg.textContent = t('statusDone');
        saveFormCache();
    } catch (error) {
        statusMsg.textContent = t('errorGeneric', { message: error.message });
        statusMsg.className = 'status error';
    }
}

async function copyResultCode() {
    const resultOutput = document.getElementById('resultOutput');
    const statusMsg = document.getElementById('statusMessage');

    if (!resultOutput.value.trim()) {
        statusMsg.textContent = t('errorGeneric', { message: t('errorNoImg') });
        statusMsg.className = 'status error';
        return;
    }

    try {
        await navigator.clipboard.writeText(resultOutput.value);
        statusMsg.textContent = t('copySuccess');
        statusMsg.className = 'status';
    } catch (_e) {
        statusMsg.textContent = t('copyError');
        statusMsg.className = 'status error';
    }
}

function initializeApp() {
    const langSelect = document.getElementById('languageSelect');
    const githubInput = document.getElementById('githubUrl');
    const badgesEl = document.getElementById('badgesInput');
    const formatRadios = document.querySelectorAll('input[name="outputFormat"]');

    renderLocaleOptions();
    loadFormCache();
    applyLanguage();

    langSelect.addEventListener('change', (e) => {
        localStorage.setItem(STORAGE_KEYS.language, e.target.value);
        applyLanguage();
    });

    githubInput.addEventListener('input', saveFormCache);
    badgesEl.addEventListener('input', saveFormCache);
    formatRadios.forEach((r) => r.addEventListener('change', saveFormCache));
}

document.addEventListener('DOMContentLoaded', initializeApp);
window.generateLinks = generateLinks;
window.copyResultCode = copyResultCode;
