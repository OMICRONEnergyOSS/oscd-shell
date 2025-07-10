# Changelog

## [0.0.7](https://github.com/OMICRONEnergyOSS/oscd-shell/compare/oscd-shell-v0.0.6...oscd-shell-v0.0.7) (2025-07-10)


### Bug Fixes

* broken npm build ([8bbc236](https://github.com/OMICRONEnergyOSS/oscd-shell/commit/8bbc236e7fdd61121de0c469bc17a99535a94f59))

## [0.0.6](https://github.com/OMICRONEnergyOSS/oscd-shell/compare/oscd-shell-v0.0.5...oscd-shell-v0.0.6) (2025-07-10)


### Features

* add support for background plugins ([f187299](https://github.com/OMICRONEnergyOSS/oscd-shell/commit/f187299da80d7741817f5cc0735c9a0f5050179b)), closes [#43](https://github.com/OMICRONEnergyOSS/oscd-shell/issues/43)
* migrate to EditV2 (oscd-api + oscd-editor) ([dae94cf](https://github.com/OMICRONEnergyOSS/oscd-shell/commit/dae94cf172954cd5270949480ff85b1d0a3b469a))
* remove edit v1 support - handled by  oscd-background-editv1 ([1902858](https://github.com/OMICRONEnergyOSS/oscd-shell/commit/19028581aa54d32e0732d6fb2fe4593968d70679)), closes [#52](https://github.com/OMICRONEnergyOSS/oscd-shell/issues/52)
* remove support for active flag in plugin definition ([c1c1195](https://github.com/OMICRONEnergyOSS/oscd-shell/commit/c1c119500f1df0237eb972a5da88d1af6835c54e)), closes [#39](https://github.com/OMICRONEnergyOSS/oscd-shell/issues/39)

## [0.0.5](https://github.com/OMICRONEnergyOSS/oscd-shell/compare/oscd-shell-v0.0.4...oscd-shell-v0.0.5) (2025-06-11)


### Features

* add theming ([9f44494](https://github.com/OMICRONEnergyOSS/oscd-shell/commit/9f4449421ca1f8e6b2ea0225bf8f25dbf3163b99))
* add UpdateNS edit type ([4e36a57](https://github.com/OMICRONEnergyOSS/oscd-shell/commit/4e36a575e468aa9867050ddc0b4402494e4a6205))
* **demo:** add remote open and save plugins ([798fc93](https://github.com/OMICRONEnergyOSS/oscd-shell/commit/798fc93333408bf56d350e5130734c5d60d5657c))
* edit multiple open files ([88bd287](https://github.com/OMICRONEnergyOSS/oscd-shell/commit/88bd2878e093763d4d848ed2dd0a0baa8421ae47))
* **editing:** add editing user interface elements ([e834e4d](https://github.com/OMICRONEnergyOSS/oscd-shell/commit/e834e4d0853e3cd2e2a2ce9d74120c4d06ce92bd))
* **editing:** insert and remove nodes ([65c99da](https://github.com/OMICRONEnergyOSS/oscd-shell/commit/65c99da931aa88c527504a362353da0ac443a23e))
* **editing:** open documents ([e3a3199](https://github.com/OMICRONEnergyOSS/oscd-shell/commit/e3a31999046a29a7aa44467f9b7a7fde784b982f))
* **editing:** update elements' attributes ([b29eff0](https://github.com/OMICRONEnergyOSS/oscd-shell/commit/b29eff04cdc9d14d9f002f183eeb51f7f6adaac9))
* export open-scd and mixin types ([5415d2b](https://github.com/OMICRONEnergyOSS/oscd-shell/commit/5415d2b283e15870fb3d4eec32ec630fd174b28b))
* **foundation:** export cyrb64 hash function ([5b13d94](https://github.com/OMICRONEnergyOSS/oscd-shell/commit/5b13d9466becc2f0922164b806f77d8f01a234ab))
* migrated UI to new oscd-ui ([ae99e24](https://github.com/OMICRONEnergyOSS/oscd-shell/commit/ae99e24fda427e81bfd6088f5889ea44aa410478))
* **open-scd:** pass editCount to editor and menu plugins ([2be53ab](https://github.com/OMICRONEnergyOSS/oscd-shell/commit/2be53ab8de8bad176097153240441db521b99ce8))
* **plugging:** load menu and editor plugins ([e3fe982](https://github.com/OMICRONEnergyOSS/oscd-shell/commit/e3fe98223cefd7b3a9abd49c444f5bfba3c527a8))
* switch shell to using scoped components ([4ec3ffa](https://github.com/OMICRONEnergyOSS/oscd-shell/commit/4ec3ffa2fa9a454646bcda314abe168da6693337))


### Bug Fixes

* **open-scd:** allow menu plugins to show content ([c7dc849](https://github.com/OMICRONEnergyOSS/oscd-shell/commit/c7dc849fa84419ab605ffafd2b0ec7ce40136fc3))
* **open-scd:** hide menu plugin element container ([02b026e](https://github.com/OMICRONEnergyOSS/oscd-shell/commit/02b026e645ebfa9c26f54afd5f292a10b56af7ef))
* **open-scd:** import locales from relative URL ([5877314](https://github.com/OMICRONEnergyOSS/oscd-shell/commit/5877314f5e2de4c3613324e51328cb463dec2d5d))
* **package:** localize as part of bundle script ([653a506](https://github.com/OMICRONEnergyOSS/oscd-shell/commit/653a50667163e9a9381d26ccb10e927f0758ec73))
* **plugging:** import relative paths from origin ([abb5074](https://github.com/OMICRONEnergyOSS/oscd-shell/commit/abb50749877ce611e4eb58bcde2e39280c429150))


### Styles

* disable quirks mode in demo and tests ([db1b6c8](https://github.com/OMICRONEnergyOSS/oscd-shell/commit/db1b6c858a97f6842526aa624311d9d1842dfc49))

## [0.0.4](https://github.com/OMICRONEnergyOSS/open-scd-core/compare/open-scd-core-v0.0.3...open-scd-core-v0.0.4) (2025-04-22)


### Bug Fixes

* **package:** localize as part of bundle script ([653a506](https://github.com/OMICRONEnergyOSS/open-scd-core/commit/653a50667163e9a9381d26ccb10e927f0758ec73))

## [0.0.3](https://github.com/OMICRONEnergyOSS/open-scd-core/compare/open-scd-core-v0.0.2...open-scd-core-v0.0.3) (2025-04-22)


### Features

* add theming ([9f44494](https://github.com/OMICRONEnergyOSS/open-scd-core/commit/9f4449421ca1f8e6b2ea0225bf8f25dbf3163b99))
* add UpdateNS edit type ([4e36a57](https://github.com/OMICRONEnergyOSS/open-scd-core/commit/4e36a575e468aa9867050ddc0b4402494e4a6205))
* **demo:** add remote open and save plugins ([798fc93](https://github.com/OMICRONEnergyOSS/open-scd-core/commit/798fc93333408bf56d350e5130734c5d60d5657c))
* edit multiple open files ([88bd287](https://github.com/OMICRONEnergyOSS/open-scd-core/commit/88bd2878e093763d4d848ed2dd0a0baa8421ae47))
* **editing:** add editing user interface elements ([e834e4d](https://github.com/OMICRONEnergyOSS/open-scd-core/commit/e834e4d0853e3cd2e2a2ce9d74120c4d06ce92bd))
* **editing:** insert and remove nodes ([65c99da](https://github.com/OMICRONEnergyOSS/open-scd-core/commit/65c99da931aa88c527504a362353da0ac443a23e))
* **editing:** open documents ([e3a3199](https://github.com/OMICRONEnergyOSS/open-scd-core/commit/e3a31999046a29a7aa44467f9b7a7fde784b982f))
* **editing:** update elements' attributes ([b29eff0](https://github.com/OMICRONEnergyOSS/open-scd-core/commit/b29eff04cdc9d14d9f002f183eeb51f7f6adaac9))
* export open-scd and mixin types ([5415d2b](https://github.com/OMICRONEnergyOSS/open-scd-core/commit/5415d2b283e15870fb3d4eec32ec630fd174b28b))
* **foundation:** export cyrb64 hash function ([5b13d94](https://github.com/OMICRONEnergyOSS/open-scd-core/commit/5b13d9466becc2f0922164b806f77d8f01a234ab))
* **open-scd:** pass editCount to editor and menu plugins ([2be53ab](https://github.com/OMICRONEnergyOSS/open-scd-core/commit/2be53ab8de8bad176097153240441db521b99ce8))
* **plugging:** load menu and editor plugins ([e3fe982](https://github.com/OMICRONEnergyOSS/open-scd-core/commit/e3fe98223cefd7b3a9abd49c444f5bfba3c527a8))


### Bug Fixes

* **open-scd:** allow menu plugins to show content ([c7dc849](https://github.com/OMICRONEnergyOSS/open-scd-core/commit/c7dc849fa84419ab605ffafd2b0ec7ce40136fc3))
* **open-scd:** hide menu plugin element container ([02b026e](https://github.com/OMICRONEnergyOSS/open-scd-core/commit/02b026e645ebfa9c26f54afd5f292a10b56af7ef))
* **open-scd:** import locales from relative URL ([5877314](https://github.com/OMICRONEnergyOSS/open-scd-core/commit/5877314f5e2de4c3613324e51328cb463dec2d5d))
* **plugging:** import relative paths from origin ([abb5074](https://github.com/OMICRONEnergyOSS/open-scd-core/commit/abb50749877ce611e4eb58bcde2e39280c429150))


### Styles

* disable quirks mode in demo and tests ([db1b6c8](https://github.com/OMICRONEnergyOSS/open-scd-core/commit/db1b6c858a97f6842526aa624311d9d1842dfc49))
