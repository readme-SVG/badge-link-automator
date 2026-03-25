/**
 * @typedef {Object} GitHubRepository
 * @property {string} html_url - Canonical GitHub URL of the repository.
 * @property {string|null} language - Primary repository language reported by GitHub.
 * @property {string|null} description - Repository description text.
 * @property {string} name - Repository name.
 * @property {string[]|undefined} topics - Repository topic list when available.
 * @property {string|null} homepage - Optional repository homepage URL.
 */

/**
 * Generates README-ready linked badge HTML by matching pasted badge tags to a user's repositories.
 *
 * This function reads user input from the DOM, validates the GitHub profile URL, fetches up to 100
 * public repositories for the detected username, extracts `<img>` badge tags from the input payload,
 * and attempts to map each badge to a relevant repository using language, description, name,
 * topics, or homepage heuristics. If a deterministic match is not found for a badge, the function
 * falls back to a random repository URL from the fetched result set.
 *
 * Args:
 *   None: This function does not accept direct arguments. It consumes values from DOM elements with
 *     IDs `githubUrl`, `badgesInput`, `resultOutput`, and `statusMessage`.
 *
 * Returns:
 *   Promise<void>: Resolves when processing and UI updates complete.
 *
 * Raises:
 *   Error: Throws internally for GitHub API failures and no-repository cases; all thrown errors are
 *     handled in the local `catch` block and surfaced to the user through `#statusMessage`.
 *
 * @example
 * // Triggered by the page button click handler.
 * generateLinks();
 * // Expected effect:
 * // - Reads the profile URL and badge HTML from form fields.
 * // - Writes linked badge anchors into #resultOutput.
 * // - Displays success or error status in #statusMessage.
 */
async function generateLinks() {
    const githubUrl = document.getElementById('githubUrl').value.trim();
    const badgesInput = document.getElementById('badgesInput').value.trim();
    const resultOutput = document.getElementById('resultOutput');
    const statusMessage = document.getElementById('statusMessage');

    resultOutput.value = '';
    statusMessage.textContent = 'Processing...';
    statusMessage.className = 'status';

    const usernameMatch = githubUrl.match(/github\.com\/([^/]+)/i);
    if (!usernameMatch) {
        statusMessage.textContent = 'Error: Invalid GitHub profile URL format.';
        statusMessage.className = 'status error';
        return;
    }
    const username = usernameMatch[1];

    try {
        statusMessage.textContent = `Fetching data for user ${username}...`;
        const response = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`);

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        /** @type {GitHubRepository[]} */
        const repos = await response.json();

        if (repos.length === 0) {
            throw new Error('This user has no public repositories.');
        }

        const imgRegex = /<img[^>]+>/gi;
        const images = badgesInput.match(imgRegex);

        if (!images) {
            statusMessage.textContent = 'Error: No <img> tags found.';
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
        statusMessage.textContent = 'Done! Code generated successfully.';
    } catch (error) {
        statusMessage.textContent = `Error: ${error.message}`;
        statusMessage.className = 'status error';
    }
}

window.generateLinks = generateLinks;
