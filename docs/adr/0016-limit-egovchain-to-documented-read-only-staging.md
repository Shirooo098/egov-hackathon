# Limit eGovChain to documented read-only staging

On 2026-09-27 the user rejected a project-generated Chain signer and approved read-only validation with the provider-issued RPC URL/token. Ticket03 now validates chain13371, zero gas price and block retrieval; consent signing, submission and anchoring are deferred. Successful reads must never be called consent proof.

This supersedes ADR0012's signed-anchoring scope, corresponding earlier staging exception/specification requirements, and continuity decision D18's wallet-provisioning plan. The documentation supports Ethereum tooling but does not issue a wallet private key; this is a user scope decision, not evidence that signing is unsupported. Local consent controls and historical evidence remain intact. Runtime is not yet aligned; Ticket07 must validate read-only behavior before completion.
