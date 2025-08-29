import { hmrPlugin, presets } from '@open-wc/dev-server-hmr';

// eslint-disable-next-line no-undef
const hmr = process.argv.includes('--hmr');

//Details & options: https://modern-web.dev/docs/dev-server/overview/
export default /** @type {import('@web/dev-server').DevServerConfig} */ ({
  rootDir: 'dist',
  open: 'demo/index.html',
  /** Use regular watch mode if HMR is not enabled. */
  watch: !hmr,

  plugins: [
    /** Use Hot Module Replacement by uncommenting. Requires @open-wc/dev-server-hmr plugin */
    hmr &&
      //Details & options: https://open-wc.org/docs/development/hot-module-replacement/
      hmrPlugin({
        exclude: ['**/*/node_modules/**/*'],
        presets: [presets.lit],
      }),
  ],
});
