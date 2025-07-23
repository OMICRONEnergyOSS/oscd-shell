// import { hmrPlugin, presets } from '@open-wc/dev-server-hmr';

/** Use Hot Module replacement by adding --hmr to the start command */
const hmr = process.argv.includes('--hmr');

export default /** @type {import('@web/dev-server').DevServerConfig} */ ({
  rootDir: 'dist',
  open: 'demo/',
  /** Use regular watch mode if HMR is not enabled. */
  watch: !hmr,
  /** nodeResolve commented out here because we ONLY want it to resolve running wds in development.
   * When running wds with the bundle (start:bundle) command, wds must not resolve node modules.
   */
  /** Resolve bare module imports */
  // nodeResolve: {
  //   exportConditions: ['browser', 'development'],
  // },

  /** Compile JS for older browsers. Requires @web/dev-server-esbuild plugin */
  // esbuildTarget: 'auto'

  plugins: [
    /** Use Hot Module Replacement by uncommenting. Requires @open-wc/dev-server-hmr plugin */
    // hmr && hmrPlugin({ exclude: ['**/*/node_modules/**/*'], presets: [presets.litElement] }),
  ],

  // See documentation for all available options
});
