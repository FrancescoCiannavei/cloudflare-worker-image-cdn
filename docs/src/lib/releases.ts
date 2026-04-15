export type Release = {
	id: number;
	name: string | null;
	tag_name: string;
	html_url: string;
	published_at: string | null;
	body: string | null;
	prerelease: boolean;
	draft: boolean;
};

export const REPO = "FrancescoCiannavei/cloudflare-worker-image-cdn";
export const REPO_URL = `https://github.com/${REPO}`;

export type FetchReleasesResult =
	| { ok: true; releases: Release[] }
	| { ok: false; error: string };

export async function fetchReleases(): Promise<FetchReleasesResult> {
	try {
		const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=100`, {
			headers: {
				Accept: "application/vnd.github+json",
				"User-Agent": "cloudflare-worker-image-cdn-docs",
			},
			// Cloudflare edge cache — shared across every docs render, so we hit
			// the GitHub API at most once per hour per colo instead of burning
			// through the unauthenticated 60 req/hr/IP limit.
			cf: {
				cacheTtl: 3600,
				cacheEverything: true,
			},
		} as RequestInit);
		if (!res.ok) {
			return { ok: false, error: `GitHub API returned ${res.status}` };
		}
		const data = (await res.json()) as Release[];
		return { ok: true, releases: data.filter((r) => !r.draft) };
	} catch (err) {
		return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
	}
}

export function getLatestStableRelease(releases: Release[]): Release | null {
	return releases.find((r) => !r.prerelease) ?? null;
}

export function deployUrl(tagOrBranch: string): string {
	return `https://deploy.workers.cloudflare.com/?url=${REPO_URL}/tree/${tagOrBranch}`;
}
