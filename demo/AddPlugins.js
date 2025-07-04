/* eslint-disable no-alert */
export default class AddPlugins extends HTMLElement {
  /* eslint-disable-next-line class-methods-use-this */
  run() {
    const editor = this.getRootNode().host;
    const kind = window.confirm(
      `Add a menu type plugin?
If you choose 'Cancel', an editor type plugin will be added instead.`,
    )
      ? 'menu'
      : 'editor';
    const requireDoc = window.confirm(
      'Does the plugin require a loaded document? (OK=yes, Cancel=no)',
    );
    const name =
      window.prompt('Plugin name', 'My plugin') || 'Default plugin name';
    const icon =
      window.prompt('Plugin icon (material icon name)', 'extension') ||
      'extension';
    const src =
      window.prompt(
        'Plugin source URI',
        `/demo/DemoPluginSrc.js?${Date.now()}`,
      ) || 'data:text/javascript,';
    const plugin = { name, src, icon, requireDoc };
    if (
      !window.confirm(
        `Add ${kind} plugin ${JSON.stringify(plugin, null, ' ')}?`,
      )
    ) {
      return;
    }
    editor.plugins = {
      ...editor.plugins,
      [kind]: [...(editor.plugins[kind] || []), plugin],
    };
    editor.requestUpdate('plugins');
  }
}
