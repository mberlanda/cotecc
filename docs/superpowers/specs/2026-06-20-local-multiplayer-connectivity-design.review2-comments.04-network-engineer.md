# Network Engineer Re-Review (round 2) — Local Multiplayer v2

**Agent #:** 04 · **Role:** Network · **Date:** 2026-06-20

---

## Verdict summary

| Verdict | Count |
|---|---|
| RESOLVED | 11 |
| PARTIALLY | 2 |
| NOT-ADDRESSED | 0 |
| WONT-FIX / deferred | 1 |

New issues found: **3** (1 MAJOR, 2 MINOR)

---

## Coverage of round-1 comments

| Comment ID | Verdict | Where addressed (doc §) | Note |
|---|---|---|---|
| LMCD-RC-04-NET-001 | RESOLVED | master §4.A (No-router paragraph); 1B §1.3 | "Guests are guided through OS Wi-Fi join" + explicit two-step language; Android LocalOnlyHotspot creds → Wi-Fi QR + game URL spelled out; iOS manual correctly noted. Full validation checklist in 1B §1.3 (NET-001, NET-002). |
| LMCD-RC-04-NET-002 | RESOLVED | 1B §1.3; 1A §1.4 | All requested validation cases appear: LocalOnlyHotspot with Android/iOS/laptop clients, iOS Personal Hotspot, screen-lock/background, no-cellular/no-internet, IP assignment, client auto-disconnect. Host foreground lifecycle (keep-awake, AppState) covered in 1A §1.4 (EXPO-002, NET-012). |
| LMCD-RC-04-NET-003 | RESOLVED | 1A §2 (Permissions & cleartext) | Full treatment: Android cleartext network-security-config scoped to LAN/hotspot; iOS ATS/local-network; all expressed in app.json/config plugins; expo prebuild --clean is the test gate. Resolves NET-003/EXPO-003/BUILD-003. |
| LMCD-RC-04-NET-004 | RESOLVED | master §4.H; 1B §1.1 | Coarse isolation inference replaced with a six-step local-only diagnostic ladder (page load → /healthz → WS upgrade categories → host-side "guest seen" → permission status → captive-portal). Internet reachability explicitly excluded. Resolves ARCH-008/NET-004/FE-005/WS-009. |
| LMCD-RC-04-NET-005 | RESOLVED | master §4.A (Same Wi-Fi paragraph); 1B §1.6 | Corrected to "routable device-to-device reachability"; subnet vs multicast properly distinguished; UDP/WebRTC/mDNS flagged as needing separate validation. §1.6 of 1B explicitly notes this fix. |
| LMCD-RC-04-NET-006 | RESOLVED | master §4.A (Same Wi-Fi paragraph); 1B §1.6 | "TCP/WebSocket is the primary target; UDP/WebRTC/mDNS each need separate validation" with the enumerated failure modes (AP isolation, guest VLANs, firewalls, multicast suppression, mobile permissions). Fixes NET-006. |
| LMCD-RC-04-NET-007 | WONT-FIX (deferred) | master §4.C (Tier 2), §6 futures table | Tier-2 WebRTC is explicitly deferred; the parent notes that zero-infra signaling is the unresolved problem (NET-007) and TURN conflicts with the zero-infra goal. The deferral is articulate and tied to a concrete trigger ("Host from a laptop" becomes required). Acceptable. |
| LMCD-RC-04-NET-008 | RESOLVED | master §4.D; 1B §1.6 | SSE+POST explicitly scoped to "WebSocket-upgrade/proxy issues after HTTP reachability is proven"; does not fix AP isolation or host unreachability. Language is exact. Fixes NET-008. |
| LMCD-RC-04-NET-009 | PARTIALLY | master §4.E; 1B §1.5 | The canonical caveats are present (multicast/VLAN, iOS Local Network permission + NSBonjourServices, Android OEM behaviour, duplicate service names, "best-effort convenience only"). However, the spec still lacks the explicit note that multicast may be **suppressed by APs silently** and that the discovery fallback path (guest-side failure → switch to manual) needs a UX timeout and a user-visible indicator. The security minimisation posture (opaque room id only) is well-specified. Minor gap only. |
| LMCD-RC-04-NET-010 | RESOLVED | master §4.A (QR/room code paragraph); 1A §3.3 | "A zero-infra manual fallback must carry the full http://<ip>:<port> + token — a bare short code cannot resolve a host without a lookup service." The 1A join URL contract implements this. Fixes NET-010/UX-003. |
| LMCD-RC-04-NET-011 | PARTIALLY | master §4.A (Native-only fast paths paragraph); §6 futures; 1B §1.6 | The spec now correctly notes role/MTU/background constraints and lack of browser support, and explicitly defers BLE to a single-platform native path. However, no BLE validation subsection exists (iOS central/peripheral foreground/background, MTU fragmentation, max simultaneous peers, reconnect) — deferred without a trigger condition. Given BLE is behind a deferral gate this is a minor gap, not a blocker. |
| LMCD-RC-04-NET-012 | RESOLVED | 1A §1.4; 1B §2.2–2.3 | "Host lifecycle" now an explicit section: foreground-only in 1A with expo-keep-awake, AppState transitions, process death = host loss. 1B adds heartbeats and pause/AI policy. Resolves NET-012/EXPO-002. |
| LMCD-RC-04-NET-013 | RESOLVED | 1B §2.4 (Reconnect & host-loss UX) | Browser-specific migration note is present: "browser clients served by the dead host can't refresh — copy says rejoin via a new host's QR." Host migration (R2) is deferred (D5) but the browser client failure mode is now explicitly handled at the UX level. Fixes NET-013. |
| LMCD-RC-04-NET-014 | RESOLVED | 1B §1.4 (Address selection) | Dedicated section: host chooses a guest-routable address across Wi-Fi/hotspot/VPN/multi-interface, IPv4 vs dual-stack/IPv6; QR encodes a reachable candidate with alternates offered. Resolves NET-014. |

---

## New issues (v2)

### LMCD-RC2-04-NET-001
**Severity:** MAJOR
**Section:** 1A §1.1 (Mandatory spike) / 1B §1.1 (Diagnostic ladder step 1)
**Concern:** The diagnostic ladder's first step — "page load of http://<host-ip>:<port> succeeds?" — notes that if the page never loads, "show fallback on the host's QR screen, not in the guest app." This is correct for a cold browser open, but the spec does not address the scenario where the guest browser has already loaded the bundle from the host and the WebSocket then fails mid-session. In that case, step 1 succeeds at launch time, the failure sequence never re-runs step 1, and the ladder enters at step 2 or 3 with no way to distinguish "WS upgrade failed" from "page delivered from cache and host is now gone." The ladder steps are designed as a connection-time diagnostic; there is no defined re-entry or periodic health-check path for in-session failures detected only by heartbeat loss or abnormal-close.
**Recommendation:** Specify that the diagnostic ladder is re-invoked on each WS disconnect/heartbeat failure, not only during initial join. For in-session failures, step 1 becomes a background /healthz poll (not a page reload, which would lose state). Add a separate "in-session failure" entry path to the taxonomy table (1B §1.2) so the recovery UX differs between "never connected" and "was connected, now lost."

### LMCD-RC2-04-NET-002
**Severity:** MINOR
**Section:** 1B §1.3 (Hotspot / isolation fallback) / 1A §3.3 (Pairing descriptor)
**Concern:** The spec mandates an "optional second Wi-Fi QR" encoding Android LocalOnlyHotspot ephemeral credentials. It also (correctly) notes that iOS Personal Hotspot is manual and that the iOS password must not be encoded in QR by default. However, the spec does not define what the guest-side UX should do when the ephemeral Wi-Fi QR is scanned by an **iOS** device: iOS reads Wi-Fi QR codes natively and will attempt to join the network, but after joining the "no internet" hotspot iOS may immediately flag it and offer to drop the connection (the captive-portal / no-internet roaming issue). The hotspot validation checklist in 1B §1.3 lists "client auto-disconnect on no internet roaming" as a validation item, but the UX for guiding the iOS guest through this sequence — including the "keep this network?" dialog — is not described.
**Recommendation:** Add a guest-side UX step to the two-step hotspot join flow specifically for iOS: after the guest scans the Wi-Fi QR and iOS prompts "Use Without Internet?" (or equivalent), the in-app or on-screen guidance must prompt the guest to confirm "Use Without Internet" before proceeding to the game URL QR. This is a known friction point and a QA test case for the lab matrix.

### LMCD-RC2-04-NET-003
**Severity:** MINOR
**Section:** 1A §2 (Permissions & cleartext) / 1B §1.5 (mDNS)
**Concern:** The spec specifies `NSBonjourServices` in app.json when mDNS lands in 1B, but does not note that on iOS 14+, the Local Network permission (`NSLocalNetworkUsageDescription`) is triggered at the point of the **first mDNS/Bonjour query or multicast send**, not at first TCP connection. A native-app guest that has Local Network permission denied will silently fail mDNS discovery with no error surfaced by the OS, and the diagnostic ladder (step 5: "local-network permission status where queryable") does not specify how to query this on iOS (it is not directly queryable; it must be inferred from a failed Bonjour/NWBrowser resolution). If the permission UX matrix (1A §2, UX-004) does not include this edge case, the iOS denial path will appear as a silent mDNS timeout rather than a permission error, which maps incorrectly in the failure taxonomy.
**Recommendation:** Add to the permission UX matrix (1A §2) and the mDNS validation checklist (1B §1.5): "iOS Local Network denial causes silent Bonjour failure, not an API error; detect by attempting a short NWBrowser scan with a timeout, then inferring denial from zero results combined with a first-launch heuristic or a Settings deep-link nudge." Note in the diagnostic ladder step 5 that iOS permission status is inferred, not directly readable.

---

## Bottom line

The v2 document set has addressed or correctly deferred **12 of 14** round-1 comments. The two remaining partial findings (NET-009, NET-011) are both minor gaps in deferred or best-effort features, not blocking issues. All of the factual corrections called out in round 1 — subnet vs reachability, "any IP transport", WebRTC/STUN, hotspot auto-join, isolation detection, short-code lookup, SSE scope, mDNS caveats, address selection, host lifecycle, and browser migration — are now present with appropriate precision in the master spec or the relevant sub-spec. The phase split and decision record structure is an improvement; each sub-spec carries traceable comment IDs.

The three new issues are: one MAJOR (in-session diagnostic re-entry not specified — the ladder is defined only for connection-time, leaving mid-session WS failures without a defined re-entry path); two MINOR (iOS "no internet" hotspot UX gap, iOS silent Local Network denial in mDNS). None are architectural blockers, but LMCD-RC2-04-NET-001 should be addressed in 1B §1.1–1.2 before the robustness phase ships.
