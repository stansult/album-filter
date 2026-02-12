# Album Filter

Album Filter adds in-page text filtering for long, paginated album lists.

## Why

On long album lists, browser page search (`Cmd/Ctrl + F`) only works on albums currently loaded in the DOM.
Album Filter is designed to make finding albums faster by adding filtering controls directly in the page flow.

## How It Works

- Click the extension icon to open/close the in-page Album Filter panel.
- Type a query to filter loaded albums by title.
- Click `Auto-load` to keep loading additional album batches, then `Stop` to stop.
- Click `Rescan loaded` to re-read albums already present in the DOM.

### Query Behavior

- Unquoted query: split into words, all words must appear in title (order-independent).
- Quoted query (`"..."` or `'...'`): exact phrase match in title.

Example:
- `my birthday` matches titles that contain both words anywhere.
- `"my birthday"` matches titles that contain that exact phrase.

## Product Direction

### Current Support

- Facebook album pages (`https://www.facebook.com/<user>/photos_albums`) - first PoC target

### Principles

- Generic architecture for site-specific adapters
- Facebook support first
- Additional sites can be added over time when they need the same capability

## Notes

- Album Filter is not affiliated with or endorsed by Meta/Facebook.
- This project focuses on user-triggered, in-browser filtering workflows.
- There is currently no options page; behavior is controlled from the in-page panel.
- Privacy policy: [`PRIVACY.md`](PRIVACY.md)
