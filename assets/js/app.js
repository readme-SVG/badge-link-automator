const STORAGE_KEYS = {
    language: 'badge_linker_language',
    form: 'badge_linker_form_cache',
    repos: 'badge_linker_repo_cache'
};

const REPO_CACHE_TTL_MS = 15 * 60 * 1000;

const TRANSLATIONS = {
    en: {
        languageLabel: 'Language',
        topLabel: 'Utility',
        title: 'GitHub Badge Linker',
        subtitle: 'Convert raw badge image tags into repository-linked snippets with one pass.',
        contextLabel: 'Context',
        quote: 'Type is the interface. Structure is the style.',
        supportCopy: 'Enter your profile, paste badge tags, and export production-ready README markup in seconds.',
        githubLabel: 'GitHub profile URL',
        githubPlaceholder: 'https://github.com/username',
        badgesLabel: 'Paste badge HTML (<img> tags)',
        badgesPlaceholder: '<img src="https://img.shields.io/badge/Vercel-3e80ed?style=for-the-badge&logo=vercel&logoColor=white" />',
        generateButton: 'Generate code',
        resultLabel: 'Generated code for README.md',
        statusProcessing: 'Processing...',
        statusFetching: 'Fetching data for user {username}...',
        statusDone: 'Done! Code generated successfully.',
        errorInvalidUrl: 'Error: Invalid GitHub profile URL format.',
        errorNoImg: 'Error: No <img> tags found.',
        errorNoRepos: 'This user has no public repositories.',
        errorApi: 'API error: {status} {statusText}',
        errorGeneric: 'Error: {message}'
    },
    ru: {
        languageLabel: 'Язык',
        topLabel: 'Инструмент',
        title: 'GitHub Badge Linker',
        subtitle: 'Преобразует теги badge image в ссылки на репозитории за один проход.',
        contextLabel: 'Контекст',
        quote: 'Типографика это интерфейс. Структура это стиль.',
        supportCopy: 'Введите профиль, вставьте badge теги и получите готовый README код за секунды.',
        githubLabel: 'Ссылка на профиль GitHub',
        githubPlaceholder: 'https://github.com/username',
        badgesLabel: 'Вставьте badge HTML (<img> теги)',
        badgesPlaceholder: '<img src="https://img.shields.io/badge/Vercel-3e80ed?style=for-the-badge&logo=vercel&logoColor=white" />',
        generateButton: 'Сгенерировать код',
        resultLabel: 'Готовый код для README.md',
        statusProcessing: 'Обработка...',
        statusFetching: 'Получение данных пользователя {username}...',
        statusDone: 'Готово! Код успешно сгенерирован.',
        errorInvalidUrl: 'Ошибка: Неверный формат ссылки на профиль GitHub.',
        errorNoImg: 'Ошибка: Не найдено тегов <img>.',
        errorNoRepos: 'У пользователя нет публичных репозиториев.',
        errorApi: 'Ошибка API: {status} {statusText}',
        errorGeneric: 'Ошибка: {message}'
    }
};

function getCurrentLanguage() {
    const saved = localStorage.getItem(STORAGE_KEYS.language);
    if (saved && TRANSLATIONS[saved]) {
        return saved;
    }
    return 'en';
}

function t(key, variables = {}) {
    const lang = getCurrentLanguage();
    const dictionary = TRANSLATIONS[lang] || TRANSLATIONS.en;
    const template = dictionary[key] || TRANSLATIONS.en[key] || key;
    return Object.keys(variables).reduce(
        (acc, variableName) => acc.replaceAll(`{${variableName}}`, String(variables[variableName])),
        template
    );
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
