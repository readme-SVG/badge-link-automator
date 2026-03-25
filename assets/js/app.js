import { DEFAULT_LOCALE, LOCALE_OPTIONS, getLocaleDictionary, isSupportedLocale } from '../i18n/index.js';

const STORAGE_KEYS = {
    language: 'badge_linker_language',
    form: 'badge_linker_form_cache',
    repos: 'badge_linker_repo_cache'
};

const REPO_CACHE_TTL_MS = 15 * 60 * 1000;

// ─── Badge Category System ───────────────────────────────────────────
// Each badge is classified into a category that determines scoring weights.
// Hosting badges prioritize homepage domain matching.
// Language badges prioritize repo.language.
// Framework/tool badges prioritize topics and repo name.

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

// ── Hosting / Deployment platforms ──
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

// ── Cloud providers (domain + topics) ──
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

// ── Frameworks / Libraries ──
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

    // Exact match first
    for (const [category, data] of Object.entries(BADGE_CATEGORIES)) {
        for (const [key, aliases] of Object.entries(data.entries)) {
            if (normalized === key || aliases.some((a) => a === normalized)) {
                return { category, key, aliases: [key, ...aliases] };
            }
        }
    }

    // Partial/substring match fallback
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
// Each category uses different weights for repo fields.
// homepageDomain: bonus when repo.homepage URL contains the platform's known domain
// homepage:       bonus when repo.homepage mentions the search term (weaker)
// language:       bonus when repo.language matches
// topics:         bonus when repo topics include the term
// name:           bonus when repo name includes the term
// description:    bonus when repo description includes the term
// htmlUrl:        bonus when repo html_url includes the term

const SCORING_PROFILES = {
    hosting: {
        homepageDomain: 300,
        homepage:        40,
        language:         5,
        topics:          20,
        name:            15,
        description:     10,
        htmlUrl:          3
    },
    cloud: {
        homepageDomain: 250,
        homepage:        60,
        language:         5,
        topics:          50,
        name:            30,
        description:     20,
        htmlUrl:          5
    },
    language: {
        homepageDomain:   0,
        homepage:         5,
        language:       150,
        topics:         100,
        name:            40,
        description:     30,
        htmlUrl:          5
    },
    framework: {
        homepageDomain:   0,
        homepage:        15,
        language:        10,
        topics:         130,
        name:            80,
        description:     55,
        htmlUrl:          8
    },
    database: {
        homepageDomain:   0,
        homepage:        10,
        language:         5,
        topics:         120,
        name:            90,
        description:     60,
        htmlUrl:          5
    },
    tool: {
        homepageDomain:   0,
        homepage:        10,
        language:         5,
        topics:         110,
        name:            80,
        description:     50,
        htmlUrl:          5
    },
    ci: {
        homepageDomain:   0,
        homepage:         5,
        language:         5,
        topics:          90,
        name:            60,
        description:     40,
        htmlUrl:          5
    },
    other: {
        homepageDomain:   0,
        homepage:        30,
        language:        80,
        topics:          70,
        name:            50,
        description:     40,
        htmlUrl:         10
    }
};

const BONUS = {
    hasHomepage:     12,
    notFork:          8,
    starsCap:        40,
    starsMultiplier:  0.12,
    activityDays:    16
};


// ─── Core Matching ───────────────────────────────────────────────────

function normalizeToken(v) {
    return String(v || '').toLowerCase().replace(/[^a-z0-9.\-+#]/g, '');
}

function extractTechName(imgTag) {
    const badgeMatch = imgTag.match(/badge\/([a-z0-9_%+.\-]+)-/i);
    const logoMatch = imgTag.match(/logo=([a-z0-9_\-.+]+)/i);
    const labelMatch = imgTag.match(/label=([a-z0-9_%+.\-]+)/i);

    if (badgeMatch) return decodeURIComponent(badgeMatch[1]).toLowerCase();
    if (logoMatch) return decodeURIComponent(logoMatch[1]).toLowerCase();
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
        if (key === classification.key) {
            domains.push(domain.toLowerCase());
        }
    }
    return domains;
}

function rankRepo(repo, searchTerms, classification) {
    const profile = SCORING_PROFILES[classification.category] || SCORING_PROFILES.other;
    const lang = (repo.language || '').toLowerCase();
    const desc = (repo.description || '').toLowerCase();
    const name = (repo.name || '').toLowerCase();
    const topics = (repo.topics || []).map((topicVal) => String(topicVal).toLowerCase());
    const homepage = (repo.homepage || '').toLowerCase();
    const htmlUrl = (repo.html_url || '').toLowerCase();

    let score = 0;

    // ── Domain-based homepage match (hosting/cloud) ──
    if (profile.homepageDomain > 0 && homepage) {
        const domains = getHostingDomains(classification);
        const domainMatch = domains.some((d) => homepage.includes(d));
        if (domainMatch) {
            score += profile.homepageDomain;
        }
    }

    // ── Term-based matching ──
    searchTerms.forEach((term) => {
        if (!term) return;

        if (lang === term) {
            score += profile.language;
        }

        if (topics.includes(term)) {
            score += profile.topics;
        }

        if (name.includes(term)) {
            score += profile.name;
        }

        // Description: require term length >= 2 to avoid noise from single-char matches
        if (term.length >= 2 && desc.includes(term)) {
            score += profile.description;
        }

        if (homepage.includes(term)) {
            score += profile.homepage;
        }

        if (htmlUrl.includes(term)) {
            score += profile.htmlUrl;
        }
    });

    // ── Universal bonuses ──
    if (repo.homepage) {
        score += BONUS.hasHomepage;
    }
    if (!repo.fork) {
        score += BONUS.notFork;
    }
    if (repo.stargazers_count) {
        score += Math.min(repo.stargazers_count, BONUS.starsCap) * BONUS.starsMultiplier;
    }

    const activityBonus = repo.pushed_at
        ? Math.max(0, BONUS.activityDays - (Date.now() - new Date(repo.pushed_at).getTime()) / 86400000)
        : 0;
    score += activityBonus;

    return score;
}

function pickBestRepo(repos, imgTag) {
    const techName = extractTechName(imgTag);
    if (!techName) return null;

    const classification = classifyBadge(techName);
    const searchTerms = getSearchTerms(classification);

    if (!searchTerms.length) return null;

    const ranked = repos
        .map((repo) => ({
            repo,
            score: rankRepo(repo, searchTerms, classification)
        }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score);

    if (!ranked.length) return null;

    // For hosting/cloud: require minimum threshold to avoid false positives
    // If no repo actually has the platform domain in its homepage, weak text matches
    // (e.g. "vercel" in description) should not win — return null for fallback instead
    const isDeployment = classification.category === 'hosting' || classification.category === 'cloud';
    if (isDeployment) {
        const minThreshold = SCORING_PROFILES[classification.category].homepageDomain * 0.3;
        if (ranked[0].score < minThreshold) {
            return null;
        }
    }

    return ranked[0].repo;
}

function getFallbackRepoUrl(repos) {
    const sorted = [...repos].sort((a, b) => {
        const aDate = new Date(a.pushed_at || 0).getTime();
        const bDate = new Date(b.pushed_at || 0).getTime();
        return bDate - aDate;
    });
    return (sorted[0] && sorted[0].html_url) || repos[0].html_url;
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
    } catch (_e) {
        localStorage.removeItem(STORAGE_KEYS.form);
    }
}

function saveFormCache() {
    const payload = {
        githubUrl: document.getElementById('githubUrl').value,
        badgesInput: document.getElementById('badgesInput').value,
        resultOutput: document.getElementById('resultOutput').value
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
    if (raw) {
        try { cache = JSON.parse(raw); } catch (_e) { cache = {}; }
    }
    cache[username] = { timestamp: Date.now(), repos };
    localStorage.setItem(STORAGE_KEYS.repos, JSON.stringify(cache));
}

async function fetchRepos(username) {
    const cached = getRepoCache(username);
    if (cached) return cached;

    const resp = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`);
    if (!resp.ok) {
        throw new Error(t('errorApi', { status: resp.status, statusText: resp.statusText }));
    }

    const repos = await resp.json();
    setRepoCache(username, repos);
    return repos;
}


// ─── Main Actions ────────────────────────────────────────────────────

async function generateLinks() {
    const githubUrl = document.getElementById('githubUrl').value.trim();
    const badgesInput = document.getElementById('badgesInput').value.trim();
    const resultOutput = document.getElementById('resultOutput');
    const statusMsg = document.getElementById('statusMessage');

    resultOutput.value = '';
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

        if (repos.length === 0) {
            throw new Error(t('errorNoRepos'));
        }

        const images = badgesInput.match(/<img[^>]+>/gi);
        if (!images) {
            statusMsg.textContent = t('errorNoImg');
            statusMsg.className = 'status error';
            return;
        }

        let finalHtml = '';
        const fallbackUrl = getFallbackRepoUrl(repos);

        images.forEach((imgTag) => {
            const bestRepo = pickBestRepo(repos, imgTag);
            const url = (bestRepo && bestRepo.html_url) || fallbackUrl;
            finalHtml += `<a href="${url}" target="_blank">\n  ${imgTag}\n</a>\n\n`;
        });

        resultOutput.value = finalHtml.trim();
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

    renderLocaleOptions();
    loadFormCache();
    applyLanguage();

    langSelect.addEventListener('change', (e) => {
        localStorage.setItem(STORAGE_KEYS.language, e.target.value);
        applyLanguage();
    });

    githubInput.addEventListener('input', saveFormCache);
    badgesEl.addEventListener('input', saveFormCache);
}

document.addEventListener('DOMContentLoaded', initializeApp);
window.generateLinks = generateLinks;
window.copyResultCode = copyResultCode;
