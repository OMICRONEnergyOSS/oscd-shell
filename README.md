[![Tests](https://github.com/OMICRONEnergyOSS/oscd-shell/actions/workflows/test.yml/badge.svg)](https://github.com/OMICRONEnergyOSS/oscd-shell/actions/workflows/test.yml) ![NPM Version](https://img.shields.io/npm/v/@omicronenergy/oscd-shell)

# OpenSCD Shell

## \<oscd-shell>

## Installation

```sh
npm i @omicronenergy/oscd-shell
```

## Usage

```html
<script type="module">
  import '@omicronenergy/oscd-shell/oscd-shell.js';
</script>

<oscd-shell></oscd-shell>
```

## Linting and formatting

To scan the project for linting and formatting errors, run

```sh
npm run lint
```

To automatically fix linting and formatting errors, run

```sh
npm run format
```

We use ESLint and Prettier for linting and formatting. Plugins for automatic
formatting and linting during editing are available for vim, emacs, VSCode,
and all popular IDEs.

## Testing with Web Test Runner

To execute a single test run:

```sh
npm test
```

To run the tests in interactive watch mode run:

```sh
npm run test:watch
```

## Tooling configs

For most of the tools, the configuration is in the `package.json` to reduce the
amount of files in the project.

## Local Demo with `web-dev-server`

```sh
npm run start
```

To run a local development server that serves the basic demo located in `demo/index.html`

> This webcomponent follows the [open-wc](https://github.com/open-wc/open-wc) recommendation.

## License

This project is licensed under the [Apache License 2.0](LICENSE).

&copy; 2022 OMICRON electronics GmbH
