import type { APIRoute } from "astro";

export const GET: APIRoute = ({ redirect }) => {
	return redirect("/sitemap-index.xml", 301);
};
