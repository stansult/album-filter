# Album Filter

Album Filter adds in-page text filtering to album pages on sites that do not provide a built-in album search.

## Current Support

- Facebook album pages (`https://www.facebook.com/<user>/photos_albums`) - first PoC target

## Why

On long album lists, browser page search (`Cmd/Ctrl + F`) only works on albums currently loaded in the DOM.
Album Filter is designed to make finding albums faster by adding filtering controls directly in the page flow.

## Product Direction

- Generic architecture for site-specific adapters
- Facebook support first
- Additional sites can be added over time when they need the same capability

## Notes

- Album Filter is not affiliated with or endorsed by Meta/Facebook.
- This project focuses on user-triggered, in-browser filtering workflows.
