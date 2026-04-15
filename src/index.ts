import { proxyRequest } from "./util/proxy";

export default {
	async fetch(request, env, ctx): Promise<Response> {
		try {
			return await proxyRequest(request, env.PROXY_ORIGINAL_URL, env.WORKER_CDN_IMAGES, ctx, env.STEPS_QUALITY, env.STEPS_SIZE);
		} catch (err) {
			// Last-resort fallback: if anything upstream of the transform pipeline throws (URL parsing, R2 outage, origin fetch failure, etc.), redirect to the origin so the client still gets an image instead of a 500.
			console.error("proxyRequest failed, falling back to origin redirect", err);
			const url = new URL(request.url);
			return Response.redirect(`${env.PROXY_ORIGINAL_URL}${url.pathname}${url.search}`, 302);
		}
	},
} satisfies ExportedHandler<Env>;
