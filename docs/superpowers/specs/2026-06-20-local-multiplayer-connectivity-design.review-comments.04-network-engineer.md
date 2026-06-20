# Review Comments: 04 network-engineer

## Reviewer Scope
Reviewed only LAN networking, local discovery, Wi-Fi/hotspot behavior, client isolation, WebRTC reachability, Bluetooth/BLE, mDNS/Bonjour, and network failure modes in the target design document.

## Overall Verdict
The recommended LAN WebSocket + QR direction is plausible, but the document currently overstates several platform and network guarantees. Before Phase 1, it needs sharper caveats and validation cases around hotspot joining, cleartext LAN traffic, reachability diagnostics, mDNS limits, and mobile host lifecycle.

## Comments
- `Comment ID:` `LMCD-RC-04-NET-001`
  `Severity:` high
  `Section:` A2. No-router: one device becomes the access point (hotspot / tethering)
  `Issue:` The document implies guests can auto-join an Android `LocalOnlyHotspot` from a Wi-Fi QR.
  `Rationale:` A Wi-Fi QR may help the user join, but Android/iOS/browser clients still require OS-mediated consent and behavior differs by platform; one QR also cannot universally both join Wi-Fi and open the game URL.
  `Suggested Change:` Replace "guests auto-join" with "guests are guided through OS Wi-Fi join; native apps may use platform APIs with explicit user consent, while browser/laptop users should expect a two-step Wi-Fi QR then game URL/QR flow."

- `Comment ID:` `LMCD-RC-04-NET-002`
  `Severity:` high
  `Section:` A2. No-router: one device becomes the access point (hotspot / tethering); 14. Open questions / things to validate before Phase 1
  `Issue:` Hotspot fallback lacks validation for OS no-internet handling, app lifetime, and cross-device reachability.
  `Rationale:` Local-only or personal hotspots can be torn down when the host app loses its reservation, goes background, locks, or when clients decide the network has no internet and roam away.
  `Suggested Change:` Add explicit Phase 1 validation cases for Android `LocalOnlyHotspot` host with Android, iOS, and laptop clients; iOS Personal Hotspot host; screen lock/background; no-cellular/no-internet; IP assignment; and client auto-disconnect behavior.

- `Comment ID:` `LMCD-RC-04-NET-003`
  `Severity:` high
  `Section:` Tier 1 — Browser join-only; Platform implementation realities
  `Issue:` The design does not call out cleartext HTTP/WS policy requirements for native app joiners.
  `Rationale:` Serving `http://<host-ip>` avoids browser certificate friction, but native Android/iOS clients connecting to `ws://` or `http://` may need cleartext/ATS configuration and Expo config changes.
  `Suggested Change:` Add an implementation note: "Because Phase 1 uses cleartext LAN HTTP/WS, validate Android cleartext network security config and iOS ATS behavior for native app clients; prefer scoping exceptions to local/LAN endpoints where possible."

- `Comment ID:` `LMCD-RC-04-NET-004`
  `Severity:` high
  `Section:` 10. Decision block H — Captive / isolated / hostile networks
  `Issue:` Client-isolation detection is too coarse and will misclassify unrelated failures.
  `Rationale:` A WebSocket timeout can also mean wrong IP, mobile OS local-network denial, cleartext policy failure, host app backgrounding, firewall, captive portal interception, IPv4/IPv6 mismatch, or server crash.
  `Suggested Change:` Replace the inference with a diagnostic ladder: HTTP `/health` fetch, WS upgrade attempt, host-side "guest seen" telemetry, local-network permission status where available, gateway/captive-portal check, then isolation/hotspot guidance.

- `Comment ID:` `LMCD-RC-04-NET-005`
  `Severity:` medium
  `Section:` A1. Same Wi-Fi / LAN (infrastructure AP) — baseline
  `Issue:` The document says LAN play requires everyone to be on the same subnet.
  `Rationale:` Direct QR/IP connection only requires routed reachability; same subnet or multicast domain is mainly required for broadcast/mDNS discovery.
  `Suggested Change:` Change to "Requires routable device-to-device reachability; mDNS/auto-discovery usually requires the same L2/multicast domain, while QR/IP may work across routed subnets if ACLs allow it."

- `Comment ID:` `LMCD-RC-04-NET-006`
  `Severity:` medium
  `Section:` A1. Same Wi-Fi / LAN (infrastructure AP) — baseline
  `Issue:` "Any IP transport works" is too broad for real Wi-Fi environments.
  `Rationale:` Same SSID does not guarantee inbound TCP, UDP, multicast, IPv6, or WebRTC candidate reachability because AP isolation, guest VLANs, host firewalls, multicast suppression, and mobile permissions can block specific paths.
  `Suggested Change:` Qualify the statement: "When peer-to-peer reachability is allowed, HTTP/WS over TCP is the primary target; UDP/WebRTC/mDNS require separate validation."

- `Comment ID:` `LMCD-RC-04-NET-007`
  `Severity:` medium
  `Section:` Tier 2 — Browser full peer
  `Issue:` The text overstates WebRTC's ability to work across subnets/NAT with STUN.
  `Rationale:` STUN helps discover reflexive candidates but does not guarantee connectivity through restrictive NATs, UDP-blocking networks, or firewalls; TURN is the reliability fallback and is infrastructure.
  `Suggested Change:` Replace "works across subnets/NAT with STUN" with "may work across some NATs with STUN; reliable traversal of restrictive NAT/firewall cases requires TURN, which conflicts with zero-infra unless user-provided."

- `Comment ID:` `LMCD-RC-04-NET-008`
  `Severity:` medium
  `Section:` 6. Decision block D — Application protocol over the chosen transport
  `Issue:` SSE+POST is framed as a fallback for restrictive networks without distinguishing protocol failure from reachability failure.
  `Rationale:` If TCP to the host is blocked by AP isolation, firewall, captive portal, or local-network denial, SSE/POST will fail the same way as WebSocket.
  `Suggested Change:` State that SSE+POST only mitigates WebSocket upgrade/proxy issues after HTTP reachability is proven, and does not solve client isolation or host reachability failures.

- `Comment ID:` `LMCD-RC-04-NET-009`
  `Severity:` medium
  `Section:` 7. Decision block E — Discovery & pairing UX
  `Issue:` The mDNS/Bonjour row does not capture multicast and permission failure modes.
  `Rationale:` mDNS depends on multicast being allowed on the LAN, usually does not cross VLANs/subnets, and on iOS requires Local Network permission plus Bonjour service declarations; Android implementations may also need multicast/NSD-specific validation.
  `Suggested Change:` Add a caveat: "mDNS is best-effort convenience only; QR/manual join remains canonical. Validate multicast-disabled APs, guest VLANs, iOS denied permission, Android OEM behavior, and duplicate service names."

- `Comment ID:` `LMCD-RC-04-NET-010`
  `Severity:` medium
  `Section:` Manual room code + IP
  `Issue:` "Short code maps to host IP:port" implies a lookup mechanism that zero-infra does not provide.
  `Rationale:` Without cloud rendezvous, mDNS, broadcast, or already-shared LAN metadata, a short room code cannot resolve to a host address by itself.
  `Suggested Change:` Reword to "Manual fallback is host IP/port plus room token; a short code can only encode the token unless paired with mDNS/local discovery or cloud rendezvous."

- `Comment ID:` `LMCD-RC-04-NET-011`
  `Severity:` medium
  `Section:` A6. Bluetooth — Classic SPP and BLE GATT
  `Issue:` BLE feasibility is stated mainly in bandwidth terms and under-specifies role, MTU, and background constraints.
  `Rationale:` The small payload helps, but multi-peer BLE depends on central/peripheral roles, advertising support, MTU fragmentation, connection limits, user permission prompts, and background restrictions, especially on iOS.
  `Suggested Change:` Add a BLE validation subsection covering Android peripheral advertising support, iOS central/peripheral foreground/background behavior, MTU fragmentation, max simultaneous peers, reconnect behavior, and Web Bluetooth secure-context limitations.

- `Comment ID:` `LMCD-RC-04-NET-012`
  `Severity:` medium
  `Section:` Platform implementation realities
  `Issue:` Mobile host lifecycle is not treated as a network failure mode.
  `Rationale:` The host is a phone running an HTTP/WS server, so calls, app backgrounding, sleep, OS memory pressure, battery savers, and hotspot teardown can terminate the session independently of game logic.
  `Suggested Change:` Add "Host lifecycle" to §9/§12 with requirements for foreground-only hosting, keep-awake UX, interruption handling, heartbeat timeouts, and host-loss messaging.

- `Comment ID:` `LMCD-RC-04-NET-013`
  `Severity:` medium
  `Section:` R2 — Host migration
  `Issue:` Host migration does not account for browser clients whose page was served by the failed host.
  `Rationale:` If the old host disappears, refresh/assets are gone and the new host has a different origin; reconnect semantics differ from native clients and same-origin assumptions no longer hold.
  `Suggested Change:` Add a browser-specific migration note: "Loaded browser clients may reconnect to a new WS URL if the app remains in memory and CORS/origin checks allow it; otherwise require scanning the successor QR and reloading from the new host."

- `Comment ID:` `LMCD-RC-04-NET-014`
  `Severity:` low
  `Section:` 14. Open questions / things to validate before Phase 1
  `Issue:` The validation list omits IPv4/IPv6 and hostname/address selection cases.
  `Rationale:` Mobile hotspots and home routers may expose IPv4, IPv6, link-local IPv6, multiple interfaces, VPN interfaces, or randomized addresses; the QR must choose an address guests can actually route to.
  `Suggested Change:` Add validation for address selection across Wi-Fi, hotspot, VPN-enabled host, IPv6-only/dual-stack LANs, and multiple network interfaces.

## Consolidation Notes
These comments likely overlap with mobile/platform reviewers on Expo native modules, permissions, and background execution, and with security reviewers on cleartext LAN traffic and origin/CORS policy.
