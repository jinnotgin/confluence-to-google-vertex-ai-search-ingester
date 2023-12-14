import {
	CONFLUENCE_GET_ALL_SPACES_ENDPOINT,
	CONFLUENCE_GET_ALL_PAGES_ENDPOINT,
} from "#lib/constants.js";
import {
	ATLASSIAN_CLOUD_URL,
	ATLASSIAN_ACCOUNT_USERNAME,
	ATLASSIAN_ACCOUNT_API_TOKEN,
} from "#secrets.js";
import logger from "#lib/logger.js";

// Base64 Encoding for Basic Auth
const basicAuthString = Buffer.from(
	ATLASSIAN_ACCOUNT_USERNAME + ":" + ATLASSIAN_ACCOUNT_API_TOKEN
).toString("base64");

const baseHeaders = {
	"Content-Type": "application/json",
	Authorization: `Basic ${basicAuthString}`,
};

function buildUrl(path, params = {}) {
	const queryString = Object.keys(params).length
		? "?" +
		  Object.entries(params)
				.map(
					([key, value]) =>
						`${encodeURIComponent(key)}=${encodeURIComponent(value)}`
				)
				.join("&")
		: "";

	return `${ATLASSIAN_CLOUD_URL}${path}${queryString}`;
}

// Helper function for Confluence GET requests
async function getRequestResults(url, headers = {}) {
	try {
		logger.info("getRequestResults: Fetching", { url });
		const response = await fetch(url, {
			method: "GET",
			headers: { ...baseHeaders, ...headers },
		});

		if (response.ok) {
			const json = await response.json();
			const results = json?.results || [];
			logger.info(`getRequestResults: ${results.length} results found.`);

			let nextResults = [];
			const nextPageLink = json?._links?.next;
			if (nextPageLink) {
				logger.info("More results available", { nextPageLink });
				nextResults = await getRequestResults(buildUrl(nextPageLink), headers);
			}

			return [...results, ...nextResults];
		} else {
			logger.error(`getRequestResults: HTTP Error: ${response.status}`);
			throw new Error(`HTTP Error: ${response.status}`);
		}
	} catch (error) {
		logger.error(`Error in Confluence GET request`, { error });
	}
}

async function getAllSpaces() {
	const url = buildUrl(CONFLUENCE_GET_ALL_SPACES_ENDPOINT, {
		type: "global",
		status: "current",
		limit: 250,
	});
	const results = await getRequestResults(url);

	if (results) {
		const output = results.map(({ id, key, name, homepageId }) => {
			return { id, key, name, homepageId };
		});
		return output;
	} else {
		logger.error(`Error in getAllSpaces: No results found`);
	}
}

async function getAllPagesInSpace(spaceId) {
	const url = buildUrl(CONFLUENCE_GET_ALL_PAGES_ENDPOINT, {
		limit: 250,
		"space-id": spaceId,
		status: "current",
		"body-format": "storage",
	});
	const results = await getRequestResults(url);

	if (results) {
		const output = results.map((data) => {
			let url = data?._links?.webui || "";
			if (url.includes("/pages/")) {
				const urlMatches = url.match(/\/spaces\/\w+\/pages\/\d+/);
				if (urlMatches) {
					url = urlMatches[0];
				} else {
					console.log(url);
					process.exit();
				}
			}
			return {
				id: data?.id,
				title: data?.title,
				body: data?.body?.storage?.value,
				url: data?._links?.webui,
			};
		});
		return output;
	} else {
		logger.error(`Error in getAllSpaces: No results found`);
	}
}

export { getAllSpaces, getAllPagesInSpace };