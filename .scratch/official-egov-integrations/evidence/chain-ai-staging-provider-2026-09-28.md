# Official staging Chain and AI observations — 2026-09-28

Local backend source: `bb018e4` on `feature/official-egov-open-tickets` at request time; the Chain and AI runtime was last changed in `c01cc6a`. These are actual provider observations from local server-side clients, not results from the Vercel deployment. No identity, healthcare record, consent, SMS, or browser workflow was used.

| Check | UTC observation | Redacted result |
| --- | --- | --- |
| Read-only eGovChain | 2026-09-28T04:54:14.151Z | `npm run egovchain:check` passed. `eth_chainId` = 13371; `eth_gasPrice` = `0x0`; `eth_blockNumber` = `0xa89bd`; `eth_getBlockByNumber` returned the same number and public block hash `0x375c349a98d30d5972a766df2b5a25bfe57e825e2837b4f1109b9645c5424249`. The client permits only these four reads and performs no signing or broadcast. |
| Curated public eGovAI FAQ | 2026-09-28T04:55:02.107Z | One server-side call for the fixed choice “How does eBuhay coordination work?” passed token and inference success/schema validation. Result was nonempty (1,148 characters) and marked `informational: true`. Answer text was not printed or retained. |

The first Chain launcher attempt stopped inside this Windows host's `tsx` startup with `uv_os_get_passwd` before making a request. The successful Chain and AI runs used a temporary local `os.userInfo` shim; the shim and AI probe were removed after execution. No provider retry followed an uncertain result.

The credential-bearing RPC URL, AI base URL, access code, bearer token, provider session ID, and raw responses are omitted. This evidence closes the local-backend provider-observation items in Tickets 03 and 06. Ticket 07 still requires the deployed revision and end-to-end staging journeys.
