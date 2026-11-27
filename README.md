# R4agRek0il site

React + Vite site on Cloudflare Pages. `functions/api/videos.ts` serves the channel's
YouTube RSS feed plus automatic picks.

## Spotlight & Most Popular (automatic)

`/api/videos` returns `spotlight` and `popular` alongside `videos`; no manual updates needed.

- **Spotlight** priority:
  1. `pinned` - env var `SPOTLIGHT_VIDEO_ID` (if that id is in the feed).
  2. `trending` - needs the optional KV binding `VIDEO_STATS`. Hourly view snapshots are
     kept for 7 days; the video with the biggest gain since the snapshot closest to 48h ago
     (at least 6h old) wins, if it gained 20+ views.
  3. `rising` - highest views/day among uploads from the last 14 days (10+ views).
- **Most Popular**: highest-view full video and highest-view Short in the feed.

Setup for `VIDEO_STATS` is in `wrangler.toml`. Everything works without it.
Spotlight/Popular are popularity picks and are never labelled "latest".
