# UNO Tết 2027

- Online rooms up to six players including host, QR invitations and Socket.IO.
- Classic UNO core: seven-card deal, matching by color/value, Skip, Reverse, Draw Two, Wild and Wild Draw Four, UNO call, draw and pass.
- Wild cards open four visible color buttons; no typed color prompt.
- Chat bubbles over player avatars, reactions, win counters and leaderboard.
- PostgreSQL persistence for win totals when `DATABASE_URL` is configured.

## Local run
`npm install && npm start` then open http://localhost:8080.

## Railway deployment
1. Upload this folder's contents to a new GitHub repository/branch.
2. Railway > New Project > Deploy from GitHub Repo.
3. Add a PostgreSQL service in the Railway project.
4. Add the PostgreSQL `DATABASE_URL` reference to the Node service.
5. Generate a public domain and verify `/api/health` returns `database: true`.

Room state is held in process memory; a server restart closes active rooms. Win totals persist in PostgreSQL. Test on two or more phones before public use.
