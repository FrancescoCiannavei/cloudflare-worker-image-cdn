# cloudflare-worker-image-cdn

A Cloudflare Worker that acts as an image CDN proxy. It fetches images from an origin server, automatically converts them to modern formats (AVIF/WebP) based on browser support, resizes on the fly, and caches the results in R2 for fast subsequent delivery.

## Warning

The project is still WIP.
Please wait for the 1.0.0 realease.
