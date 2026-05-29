# 1.0.0 (2026-05-29)

### Bug Fixes

- **lookup:** delegate find_project customer_id filter to mite server-side ([3ef4022](https://github.com/MichalOsadowski/mite-mcp/commit/3ef40220b36a6c6bf58cf74dd864392c1e0f769f))
- **lookup:** tolerate customer-less projects ([edb6d98](https://github.com/MichalOsadowski/mite-mcp/commit/edb6d98044a8f720d7901326e7c44f9eff401813))
- restore lost JSDoc opener in schemas.ts ([17e09f7](https://github.com/MichalOsadowski/mite-mcp/commit/17e09f7f9736fe6ae4dc0b1eba0da638f22a8ebe))

### Features

- **client:** add bodyless patch/del verbs for the tracker ([fa08685](https://github.com/MichalOsadowski/mite-mcp/commit/fa086856e930f787a9473389ed8cbf882f380606))
- **client:** add patch/delete write verbs (empty-body 200, mapError) ([4cb99cd](https://github.com/MichalOsadowski/mite-mcp/commit/4cb99cdd82d8241177da28c8d464451ec127e2db))
- **defaults:** add per-scope defaults store with injectable scope resolution ([19a2208](https://github.com/MichalOsadowski/mite-mcp/commit/19a2208d82a783bd82b4401ab5c9666667ae9788))
- **defaults:** add set/get/clear/list_default tools and getDefaults seam ([114db4f](https://github.com/MichalOsadowski/mite-mcp/commit/114db4ff3b1e6c11a14a36215aaacfc171d2bb0e))
- **lookup:** add find_customer name-resolution tool ([2dd0537](https://github.com/MichalOsadowski/mite-mcp/commit/2dd05377a8f3b4d1d83d1ea096b7ba48cc38e5c3))
- **lookup:** add find_project name-resolution tool ([cc60fa2](https://github.com/MichalOsadowski/mite-mcp/commit/cc60fa28bc2fc237852dada1a8576c1e181b9cb7))
- **lookup:** add find_service name-resolution tool ([484fa93](https://github.com/MichalOsadowski/mite-mcp/commit/484fa93a55f5dfbf100ccedd4e5f4fb2cf966344))
- MiteClient kernel + whoami tool ([#2](https://github.com/MichalOsadowski/mite-mcp/issues/2)) ([8bde8ea](https://github.com/MichalOsadowski/mite-mcp/commit/8bde8ea18075cf09412c53fa37c21826d7255a12))
- **reports:** combined groupings, scope filters, and date range ([4b56d7a](https://github.com/MichalOsadowski/mite-mcp/commit/4b56d7a1d22aa87c9af895a1b84df6e5a6cf5658))
- **reports:** register report_time and document module in CONTEXT.md ([0aee844](https://github.com/MichalOsadowski/mite-mcp/commit/0aee8446dea8632c0f4bc36147e2e62d8564d02e))
- **reports:** report_time single-dimension grouping via group_by ([437f7f1](https://github.com/MichalOsadowski/mite-mcp/commit/437f7f1598efe76e9e943081e29570b70994ecb4))
- **time-entries:** add delete_time_entry (dry-run by default) ([2ad0a33](https://github.com/MichalOsadowski/mite-mcp/commit/2ad0a33bb50d4d3c5cf8b3560653ca8826ebd24b))
- **time-entries:** add read path — list_time_entries and get_time_entry ([#4](https://github.com/MichalOsadowski/mite-mcp/issues/4)) ([99220f3](https://github.com/MichalOsadowski/mite-mcp/commit/99220f3aa3a3e2f02c19e8bf7debe2b613b72788))
- **time-entries:** add update_time_entry (dry-run by default) ([174eefd](https://github.com/MichalOsadowski/mite-mcp/commit/174eefd57422f9266769faff4ccd02eea0c8b8ca))
- **time-entries:** add write path — create_time_entry + client write seam ([#6](https://github.com/MichalOsadowski/mite-mcp/issues/6)) ([dcb20f7](https://github.com/MichalOsadowski/mite-mcp/commit/dcb20f7b711bc41d8f5129f293defb6d25ec6927)), closes [#9](https://github.com/MichalOsadowski/mite-mcp/issues/9)
- **time-entries:** create_time_entry pulls omitted ids from per-repo default ([4b80c49](https://github.com/MichalOsadowski/mite-mcp/commit/4b80c497a9acf2d8b7471ce793c98edfcbe4684a))
- **tracker:** add get/start/stop tracker tools ([1e9ba8d](https://github.com/MichalOsadowski/mite-mcp/commit/1e9ba8dce161c9b61b4848b79f45c35c1f4c1878))
