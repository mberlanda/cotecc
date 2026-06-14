# Changelog

## [1.2.0](https://github.com/mberlanda/cotecc/compare/v1.1.0...v1.2.0) (2026-06-14)


### Features

* add local build scripts for web, android, and iOS ([#44](https://github.com/mberlanda/cotecc/issues/44)) ([4e68989](https://github.com/mberlanda/cotecc/commit/4e68989bb7553685729b7a31189c4024d5c413fa))
* add singular 'life' translation key to per-locale files ([fd895e4](https://github.com/mberlanda/cotecc/commit/fd895e4727522bd662a0be0bf63d9075b3d41fdf))
* hide account panel, allow guest-only entry ([040450a](https://github.com/mberlanda/cotecc/commit/040450a27f1469f7106ba9707aa5d9a4ff59cbd2))
* hide account panel, guest-only entry ([5040462](https://github.com/mberlanda/cotecc/commit/504046215a6b0957180ac83740e2da5be0352a76))
* hide account panel, guest-only entry ([5040462](https://github.com/mberlanda/cotecc/commit/504046215a6b0957180ac83740e2da5be0352a76))
* show life count alongside points in taken tricks ([a5e0fb0](https://github.com/mberlanda/cotecc/commit/a5e0fb063df39fa987719d894844bf889cf7f61a))
* show life count alongside points in taken tricks ([a5e0fb0](https://github.com/mberlanda/cotecc/commit/a5e0fb063df39fa987719d894844bf889cf7f61a))
* show life count alongside points in taken tricks ([e6451dc](https://github.com/mberlanda/cotecc/commit/e6451dcf5e3651d1b36d18061df3e13c7b12b962))


### Bug Fixes

* add testIDs, favicon, and fix auth screen banner ([51796ec](https://github.com/mberlanda/cotecc/commit/51796ec7f56e714c88852767ad858ae2e103e2ae))
* **ci:** set GH_REPO so gh cli works in attach-artifacts ([55b7fd9](https://github.com/mberlanda/cotecc/commit/55b7fd9625cdf18f2db2084b1aea0011e6120930))
* **ci:** set GH_REPO so gh cli works in attach-artifacts ([55b7fd9](https://github.com/mberlanda/cotecc/commit/55b7fd9625cdf18f2db2084b1aea0011e6120930))
* **ci:** set GH_REPO so gh cli works without a git checkout ([04139fa](https://github.com/mberlanda/cotecc/commit/04139fac6e0fbed84393096ad3ea8cb98e43e581))
* testIDs for E2E, favicon, auth banner height ([65fd6b8](https://github.com/mberlanda/cotecc/commit/65fd6b8168f761b8dcd9b7367a46c9d4bdbc9857))
* testIDs for E2E, favicon, auth banner height ([65fd6b8](https://github.com/mberlanda/cotecc/commit/65fd6b8168f761b8dcd9b7367a46c9d4bdbc9857))
* use singular 'life' when lifeCount is 1 ([df32b36](https://github.com/mberlanda/cotecc/commit/df32b3680441ca1b25f46db9e9fee5742e2fb8da))

## [1.1.0](https://github.com/mberlanda/cotecc/compare/v1.0.0...v1.1.0) (2026-06-13)


### Features

* add basic AI player ([62c7901](https://github.com/mberlanda/cotecc/commit/62c7901c1d1062b255dd1683c7a6b2bab0b6b353))
* add basic cards with no logic ([1a56672](https://github.com/mberlanda/cotecc/commit/1a56672474500f5dad35d666fcda3bed5cde0466))
* add Dockerfile and docker-compose for cotecc-api ([fed6e54](https://github.com/mberlanda/cotecc/commit/fed6e5405cf70c78b3c00fa5107a7860d37bbc66))
* add end round handling ([0e4d661](https://github.com/mberlanda/cotecc/commit/0e4d661f51f8e038acdf0c1178f804120e3aec85))
* add helmet and drop redundant body-parser dependency ([7ae80e9](https://github.com/mberlanda/cotecc/commit/7ae80e913d5684624bd39a6bb7b244622e9adad8))
* add navigation and fix splashscreen on ios ([679967d](https://github.com/mberlanda/cotecc/commit/679967df744f36a8dce49129fb8196d97cd41aec))
* add placeholder sticky header, table component for current turn and highlight current player ([3dd7bbe](https://github.com/mberlanda/cotecc/commit/3dd7bbe46b62bc716a0930f4611a7d21a2eaae8a))
* add players hand to round ([e4d93d1](https://github.com/mberlanda/cotecc/commit/e4d93d1f405b98377665c2fb9261eb8822db1a9d))
* add playwright screenshot tool and baseline collection ([b968034](https://github.com/mberlanda/cotecc/commit/b968034368d6b925dbb0bf0c1a31a511453d2f13))
* add web entrypoint to run CoteccApp in the browser ([99d2770](https://github.com/mberlanda/cotecc/commit/99d277013c28124cd22e461c2924d1e611210cb7))
* ai considers play position via playersInRound ([f18fc6a](https://github.com/mberlanda/cotecc/commit/f18fc6ab2f75a15a665be571e4c8e596f68f5db0))
* **app:** redesign localized Cotecc flow ([2192c53](https://github.com/mberlanda/cotecc/commit/2192c53a79ad32b06a56582670e45bfea0877362))
* corrected Expo config — scheme, expo-router + splash plugins, static web output ([f8ed061](https://github.com/mberlanda/cotecc/commit/f8ed061cd6820e5fd613f27c1bca3a18b720b8fd))
* define playerHand ([e3f6cfd](https://github.com/mberlanda/cotecc/commit/e3f6cfdd7c94905a8ab134f41e3eaa9af1cc25f0))
* deterministic point-avoiding ai strategy ([c427e3f](https://github.com/mberlanda/cotecc/commit/c427e3fc3937709e92c3621cb1f298e01b7079f3))
* **game:** support two to six player tables ([bd0713c](https://github.com/mberlanda/cotecc/commit/bd0713ca451676cf82741966e886e6aff87dbbbb))
* hide non human players cards ([2a81fb9](https://github.com/mberlanda/cotecc/commit/2a81fb9c6b9cfab5e2814a955271db55b8dc8f41))
* implement player elimination, re-entry, and game over logic ([59847d2](https://github.com/mberlanda/cotecc/commit/59847d2a3f49a364c58d4f5b16f3332a557cb1df))
* introduce a button to deal cards for next round ([d474a7d](https://github.com/mberlanda/cotecc/commit/d474a7d5c0c87938358ce3834e6d02f0961a41cb))
* introduce round state ([d3d5fd8](https://github.com/mberlanda/cotecc/commit/d3d5fd8ad5211030badb4e54a157ded74e31595e))
* introduce the concept of round without using it ([005b9aa](https://github.com/mberlanda/cotecc/commit/005b9aad091da5b795448cf1e9d9162ac5bc435a))
* make game speed configurable ([7a6fd47](https://github.com/mberlanda/cotecc/commit/7a6fd47b1b9a31df981b8e54b52671ad5c90c3bc))
* migrate navigation from React Navigation to Expo Router ([e32b247](https://github.com/mberlanda/cotecc/commit/e32b247012a27340a049d79bfd1b829fcdbee7a2))
* modernize to Expo SDK 56 + Expo Router (sub-project BC) ([b73eb38](https://github.com/mberlanda/cotecc/commit/b73eb387aab0be0d6b3bab335525e4b69d9977df))
* show past turn card miniatures ([937ba6f](https://github.com/mberlanda/cotecc/commit/937ba6f871a42cc3afcfe0883d5532a7eab4a799))
* toggle debug context from GameSelectionScreen ([90f0283](https://github.com/mberlanda/cotecc/commit/90f028363a454e41773148e24f08ad63fb0a4163))
* **ui:** tighten card crops and round logo art ([a3240a9](https://github.com/mberlanda/cotecc/commit/a3240a9ab6b3834bbbbb460c2c5e5f053be00fba))
* use cards images instead of text ([6dbb72e](https://github.com/mberlanda/cotecc/commit/6dbb72e83853b958cd6f53ec35408393a9886208))
* **web:** add docker image and compose smoke test ([52a085e](https://github.com/mberlanda/cotecc/commit/52a085e1a14ed9237098e3c008886496fce9db29))


### Bug Fixes

* address PR [#34](https://github.com/mberlanda/cotecc/issues/34) review feedback (opus/copilot/codex) ([76c0831](https://github.com/mberlanda/cotecc/commit/76c08317fca6e2741e5958c485a465ce09f0f99f))
* align with Expo SDK 56 requirements ([187b53e](https://github.com/mberlanda/cotecc/commit/187b53eb71d855d1d25339caeb90732b9df8d611))
* correct assignment of turn winner ID ([3d7ad90](https://github.com/mberlanda/cotecc/commit/3d7ad900aa925ec6b1b7166ca57d5c34bd576a14))
* drop newArchEnabled from app.json (invalid in SDK 56 schema; New Arch is default) ([59d1259](https://github.com/mberlanda/cotecc/commit/59d1259f680d6c6b27eff13682c0b22333b5d3cc))
* point Docker healthchecks at /health endpoint ([b8046f1](https://github.com/mberlanda/cotecc/commit/b8046f1c9d93357eb06719a2bada32c592a9c731))
* repair build configuration for iOS and Android ([1c7955e](https://github.com/mberlanda/cotecc/commit/1c7955ef7c5c0b970cd26f775ea4a2f7002ed337))
* resolve race conditions on roundIsOver calculation ([e5577df](https://github.com/mberlanda/cotecc/commit/e5577df71bbfd779090092e1669e97a95b07b388))
* resolve wrong user passed to playCard and other race conditions ([444c6a6](https://github.com/mberlanda/cotecc/commit/444c6a6bf88500fd7fb142427ed2aa0a1853ccb8))
* validate and correct capot score scenario ([8d1c06c](https://github.com/mberlanda/cotecc/commit/8d1c06c6d000dd9f75f2cd42090e350cd53e34bb))
* **web:** assert docker render smoke test ([eddddf1](https://github.com/mberlanda/cotecc/commit/eddddf13fc04b47eab5599bc0cb7fc471f4ad280))
