LinkedIn MCP Server

Quick start

1. Create a LinkedIn app at https://www.linkedin.com/developers/apps and request the `w_member_social`, `r_liteprofile`, and `r_emailaddress` permissions. LinkedIn may require app review for `w_member_social`.
2. Copy `.env.example` to `.env` and fill `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, and `LINKEDIN_REDIRECT_URI`.
3. Install dependencies:

```bash
cd mcp-server
npm install
```

4. Run the server:

```bash
npm start
```

5. In your browser open:

- `/auth/linkedin` — to start OAuth flow and obtain a member token.
- `POST /post` with JSON `{ "memberId": "<id>", "message": "Hello LinkedIn" }` to post.

Notes

- This demo stores tokens in memory. For production, persist tokens securely.
- Ensure your `REDIRECT_URI` configured in the LinkedIn app matches `LINKEDIN_REDIRECT_URI` exactly.
- The server is minimal — add error handling, logging, and token refresh for production.
