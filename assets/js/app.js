import { DEFAULT_LOCALE, LOCALE_OPTIONS, getLocaleDictionary, isSupportedLocale } from '../i18n/index.js';

const STORAGE_KEYS = {
    language: 'badge_linker_language',
    form: 'badge_linker_form_cache',
    repos: 'badge_linker_repo_cache'
};

const REPO_CACHE_TTL_MS = 15 * 60 * 1000;

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

        images.forEach((imgTag) => {
            let techName = '';
            const badgeMatch = imgTag.match(/badge\/([a-z0-9_%\+]+)-/i);
            const logoMatch = imgTag.match(/logo=([a-z0-9_]+)/i);

            if (badgeMatch) {
                techName = decodeURIComponent(badgeMatch[1]).toLowerCase();
            }
            if (!techName && logoMatch) {
                techName = logoMatch[1].toLowerCase();
            }

            let matchedRepoUrl = null;

            if (techName) {
                const foundRepo = repos.find((repo) => {
                    const langMatch = repo.language && repo.language.toLowerCase() === techName;
                    const descMatch = repo.description && repo.description.toLowerCase().includes(techName);
                    const nameMatch = repo.name.toLowerCase().includes(techName);
                    const topicMatch = repo.topics && repo.topics.includes(techName);
                    const homepageMatch = repo.homepage && repo.homepage.toLowerCase().includes(techName);

                    return langMatch || descMatch || nameMatch || topicMatch || homepageMatch;
                });

                if (foundRepo) {
                    matchedRepoUrl = foundRepo.html_url;
                }
            }

            if (!matchedRepoUrl) {
                const randomIndex = Math.floor(Math.random() * repos.length);
                matchedRepoUrl = repos[randomIndex].html_url;
            }

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
