# Contributing to HomelabFlix

Thanks for helping! 🎉

## Ways to contribute
- Bug reports and fixes
- New connectors (tools)
- UI/UX improvements
- Docs & examples

## Quick start
1. Fork and clone your fork.
2. `server`: `cd server && npm i && npm run dev`
3. `client`: `cd ../client && npm i && npm run dev`
4. Create a branch: `git checkout -b feat/my-change`
5. Run checks: `npm run -w client typecheck && npm run -w client lint && npm run -w server build`
6. Open a PR with a clear description and screenshots if UI changes.

## Coding standards
- TypeScript everywhere, strict types preferred.
- Keep secrets out of the client; use server env vars.
- Add tests for core logic when practical.

## Commit style
Conventional Commits (e.g., `feat: add uptime kuma connector`, `fix: null link guard`).

## License
By contributing, you agree your contributions are MIT-licensed.
