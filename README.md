# cloudflare-worker-image-cdn

A Cloudflare Worker that acts as an image CDN proxy. It fetches images from an origin server, automatically converts them to modern formats (AVIF/WebP) based on browser support, resizes on the fly, and caches the results in R2 for fast subsequent delivery.

## Features

- **Automatic format conversion** - Serves AVIF or WebP based on the browser's `Accept` header, falls back to the original format
- **On-the-fly resizing** - Resize images via query parameters while preserving aspect ratio (never upscales)
- **Quality control** - Adjust output quality via query parameter
- **R2 caching** - Transformed images are cached in Cloudflare R2, skipping origin fetch and processing on subsequent requests
- **SVG passthrough** - SVG files are served as-is without conversion
- **Cache observability** - `X-Cache: HIT/MISS` response header indicates cache status

## Query Parameters

| Parameter | Description                          | Example       |
| --------- | ------------------------------------ | ------------- |
| `w`       | Target **width** in pixels               | `?w=800`      |
| `h`       | Target **height** in pixels              | `?h=600`      |
| `quality` | Output quality, 1-100 (default: 100) | `?quality=80` |

Parameters can be combined: `?w=800&h=600&quality=80`

### Resize behavior

- **Width only** (`?w=800`) - Resizes to the given width, height is calculated to preserve aspect ratio
- **Height only** (`?h=600`) - Resizes to the given height, width is calculated to preserve aspect ratio
- **Both** (`?w=800&h=600`) - Uses whichever dimension results in the larger output (contain behavior)
- **No params** - Returns the image at its original dimensions
- Images are **never upscaled** beyond their original dimensions

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- A [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (included as a dependency)

### Installation

```bash
npm install
```

### Configuration

Edit `wrangler.jsonc` to set your origin server URL:

```jsonc
"vars": {
    "PROXY_ORIGINAL_URL": "https://your-origin-server.com/images"
}
```

### Create the R2 bucket

```bash
npx wrangler r2 bucket create worker-cdn-images
```

### Generate types

```bash
npx wrangler types
```

## Development

Start the origin server (Express app in `server/`):

```bash
cd server && npm install && node index.js
```

In a separate terminal, start the worker:

```bash
npm run dev
```

The worker runs at `http://localhost:8787`. Request an image:

```text
http://localhost:8787/wallpaper.jpg
http://localhost:8787/wallpaper.jpg?w=400
http://localhost:8787/wallpaper.jpg?w=400&quality=80
```

## Deployment

```bash
npx wrangler deploy
```

Make sure to set `PROXY_ORIGINAL_URL` to your production origin server URL in `wrangler.jsonc` or via Wrangler secrets.

## Project Structure

```text
src/
  index.ts           # Worker entry point
  util/
    proxy.ts         # Request proxy and orchestration
    convert.ts       # Format conversion (AVIF/WebP)
    resize.ts        # Image resizing with aspect ratio preservation
    cache.ts         # R2 cache read/write
server/
  index.js           # Express dev server for serving origin images
```

## How It Works

```text
Request → Check R2 cache → [HIT] → Serve cached image
                         → [MISS] → Fetch from origin
                                   → Resize (if params provided)
                                   → Convert to AVIF/WebP
                                   → Store in R2
                                   → Serve image
```

## License

MIT
