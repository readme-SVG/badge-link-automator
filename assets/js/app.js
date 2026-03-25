import { DEFAULT_LOCALE, LOCALE_OPTIONS, getLocaleDictionary, isSupportedLocale } from '../i18n/index.js';

const STORAGE_KEYS = {
    language: 'badge_linker_language',
    form: 'badge_linker_form_cache',
    repos: 'badge_linker_repo_cache'
};

const REPO_CACHE_TTL_MS = 15 * 60 * 1000;

const TECH_ALIASES = {
    js: ['javascript', 'node', 'nodejs', 'ecmascript'],
    ts: ['typescript'],
    py: ['python'],
    csharp: ['c#', 'dotnet', '.net'],
    cpp: ['c++'],
    golang: ['go'],
    nextjs: ['next', 'next.js'],
    react: ['reactjs', 'react.js'],
    vue: ['vuejs', 'vue.js'],
    nuxt: ['nuxtjs', 'nuxt.js'],
    tailwindcss: ['tailwind'],
    postgres: ['postgresql'],
    vercel: ['vercel', 'vercel.app'],
    netlify: ['netlify', 'netlify.app'],
    render: ['render', 'onrender.com'],
    railway: ['railway', 'railway.app'],
    githubpages: ['gh-pages', 'github pages', 'github.io'],
    docker: ['container', 'docker'],
    aws: ['amazon web services', 's3', 'ec2', 'lambda'],
    gcp: ['google cloud', 'firebase', 'gcp'],
    azure: ['microsoft azure']
};

function getCurrentLanguage() {
    const saved = localStorage.getItem(STORAGE_KEYS.language);
    if (saved && isSupportedLocale(saved)) {
        return saved;
    }
    return DEFAULT_LOCALE;
}

function t(key, variables = {}) {
    const dictionary = getLocaleDictionary(getCurrentLanguage());
    const fallbackDictionary = getLocaleDictionary(DEFAULT_LOCALE);
    const template = dictionary[key] || fallbackDictionary[key] || key;
    return Object.keys(variables).reduce(
        (acc, variableName) => acc.replaceAll(`{${variableName}}`, String(variables[variableName])),
        template
    );
}

function renderLocaleOptions() {
    const languageSelect = document.getElementById('languageSelect');
    languageSelect.innerHTML = LOCALE_OPTIONS.map(
        (locale) => `<option value="${locale.code}">${locale.label}</option>`
    ).join('');
}

function applyLanguage() {
    const lang = getCurrentLanguage();
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach((element) => {
        const key = element.getAttribute('data-i18n');
        element.textContent = t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
        const key = element.getAttribute('data-i18n-placeholder');
        element.setAttribute('placeholder', t(key));
    });

    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        languageSelect.value = lang;
    }
}

function loadFormCache() {
    const raw = localStorage.getItem(STORAGE_KEYS.form);
    if (!raw) {
        return;
    }

    try {
        const data = JSON.parse(raw);
        if (typeof data.githubUrl === 'string') {
            document.getElementById('githubUrl').value = data.githubUrl;
        }
        if (typeof data.badgesInput === 'string') {
            document.getElementById('badgesInput').value = data.badgesInput;
        }
        if (typeof data.resultOutput === 'string') {
            document.getElementById('resultOutput').value = data.resultOutput;
        }
    } catch (_error) {
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
    if (!raw) {
        return null;
    }

    try {
        const cache = JSON.parse(raw);
        if (!cache[username]) {
            return null;
        }

        const entry = cache[username];
        const isExpired = Date.now() - entry.timestamp > REPO_CACHE_TTL_MS;
        if (isExpired) {
            delete cache[username];
            localStorage.setItem(STORAGE_KEYS.repos, JSON.stringify(cache));
            return null;
        }
        return entry.repos;
    } catch (_error) {
        localStorage.removeItem(STORAGE_KEYS.repos);
        return null;
    }
}

function setRepoCache(username, repos) {
    const raw = localStorage.getItem(STORAGE_KEYS.repos);
    let cache = {};

    if (raw) {
        try {
            cache = JSON.parse(raw);
        } catch (_error) {
            cache = {};
        }
    }

    cache[username] = {
        timestamp: Date.now(),
        repos
    };

    localStorage.setItem(STORAGE_KEYS.repos, JSON.stringify(cache));
}

async function fetchRepos(username) {
    const cachedRepos = getRepoCache(username);
    if (cachedRepos) {
        return cachedRepos;
    }

    const response = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`);
    if (!response.ok) {
        throw new Error(t('errorApi', { status: response.status, statusText: response.statusText }));
    }

    const repos = await response.json();
    setRepoCache(username, repos);
    return repos;
}

function normalizeToken(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9\.\-+#]/g, '');
}

function buildSearchTerms(techName) {
    const normalized = normalizeToken(techName);
    const aliasTerms = TECH_ALIASES[normalized] || [];
    return Array.from(new Set([normalized, ...aliasTerms.map(normalizeToken)])).filter(Boolean);
}

function extractTechName(imgTag) {
    const badgeMatch = imgTag.match(/badge\/([a-z0-9_%\+\.\-]+)-/i);
    const logoMatch = imgTag.match(/logo=([a-z0-9_\-\.\+]+)/i);
    const labelMatch = imgTag.match(/label=([a-z0-9_%\+\.\-]+)/i);

    if (badgeMatch) {
        return decodeURIComponent(badgeMatch[1]).toLowerCase();
    }
    if (logoMatch) {
        return decodeURIComponent(logoMatch[1]).toLowerCase();
    }
    if (labelMatch) {
        return decodeURIComponent(labelMatch[1]).toLowerCase();
    }
    return '';
}

function rankRepoForTech(repo, searchTerms) {
    const lang = (repo.language || '').toLowerCase();
    const desc = (repo.description || '').toLowerCase();
    const name = (repo.name || '').toLowerCase();
    const topics = (repo.topics || []).map((topic) => String(topic).toLowerCase());
    const homepage = (repo.homepage || '').toLowerCase();
    const htmlUrl = (repo.html_url || '').toLowerCase();

    let score = 0;

    searchTerms.forEach((term) => {
        if (!term) {
            return;
        }

        if (lang === term) {
            score += 110;
        }
        if (topics.includes(term)) {
            score += 95;
        }
        if (name.includes(term)) {
            score += 70;
        }
        if (desc.includes(term)) {
            score += 55;
        }
        if (homepage.includes(term)) {
            score += 120;
        }
        if (htmlUrl.includes(term)) {
            score += 25;
        }
    });

    if (repo.homepage) {
        score += 18;
    }
    if (!repo.fork) {
        score += 8;
    }
    if (repo.stargazers_count) {
        score += Math.min(repo.stargazers_count, 40) * 0.12;
    }

    const activityBonus = repo.pushed_at ? Math.max(0, 16 - (Date.now() - new Date(repo.pushed_at).getTime()) / 86400000) : 0;
    score += activityBonus;

    return score;
}

function pickBestRepo(repos, imgTag) {
    const techName = extractTechName(imgTag);
    const searchTerms = buildSearchTerms(techName);

    if (!searchTerms.length) {
        return null;
    }

    const ranked = repos
        .map((repo) => ({
            repo,
            score: rankRepoForTech(repo, searchTerms)
        }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score);

    if (!ranked.length) {
        return null;
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

async function generateLinks() {
    const githubUrl = document.getElementById('githubUrl').value.trim();
    const badgesInput = document.getElementById('badgesInput').value.trim();
    const resultOutput = document.getElementById('resultOutput');
    const statusMessage = document.getElementById('statusMessage');

    resultOutput.value = '';
    statusMessage.textContent = t('statusProcessing');
    statusMessage.className = 'status';

    const usernameMatch = githubUrl.match(/github\.com\/([^/]+)/i);
    if (!usernameMatch) {
        statusMessage.textContent = t('errorInvalidUrl');
        statusMessage.className = 'status error';
        return;
    }

    const username = usernameMatch[1];

    try {
        statusMessage.textContent = t('statusFetching', { username });
        const repos = await fetchRepos(username);

        if (repos.length === 0) {
            throw new Error(t('errorNoRepos'));
        }

        const imgRegex = /<img[^>]+>/gi;
        const images = badgesInput.match(imgRegex);

        if (!images) {
            statusMessage.textContent = t('errorNoImg');
            statusMessage.className = 'status error';
            return;
        }

        let finalHtml = '';
        const fallbackUrl = getFallbackRepoUrl(repos);

        images.forEach((imgTag) => {
            const bestRepo = pickBestRepo(repos, imgTag);
            const matchedRepoUrl = (bestRepo && bestRepo.html_url) || fallbackUrl;
            finalHtml += `<a href="${matchedRepoUrl}" target="_blank">\n  ${imgTag}\n</a>\n\n`;
        });

        resultOutput.value = finalHtml.trim();
        statusMessage.textContent = t('statusDone');
        saveFormCache();
    } catch (error) {
        statusMessage.textContent = t('errorGeneric', { message: error.message });
        statusMessage.className = 'status error';
    }
}

async function copyResultCode() {
    const resultOutput = document.getElementById('resultOutput');
    const statusMessage = document.getElementById('statusMessage');

    if (!resultOutput.value.trim()) {
        statusMessage.textContent = t('errorGeneric', { message: t('errorNoImg') });
        statusMessage.className = 'status error';
        return;
    }

    try {
        await navigator.clipboard.writeText(resultOutput.value);
        statusMessage.textContent = t('copySuccess');
        statusMessage.className = 'status';
    } catch (_error) {
        statusMessage.textContent = t('copyError');
        statusMessage.className = 'status error';
    }
}

function initializeApp() {
    const languageSelect = document.getElementById('languageSelect');
    const githubInput = document.getElementById('githubUrl');
    const badgesInput = document.getElementById('badgesInput');

    renderLocaleOptions();
    loadFormCache();
    applyLanguage();

    languageSelect.addEventListener('change', (event) => {
        localStorage.setItem(STORAGE_KEYS.language, event.target.value);
        applyLanguage();
    });

    githubInput.addEventListener('input', saveFormCache);
    badgesInput.addEventListener('input', saveFormCache);
}

document.addEventListener('DOMContentLoaded', initializeApp);
window.generateLinks = generateLinks;
window.copyResultCode = copyResultCode;
