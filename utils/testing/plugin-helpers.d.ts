import { OscdShell, OscdPlugin, PluginGroup, ResolvedPlugin } from '../../oscd-shell.js';
export declare const sampleMenuPlugins: (PluginGroup<OscdPlugin> | OscdPlugin)[];
export declare const sampleEditorPlugins: OscdPlugin[];
export declare function findPluginByTagName(pluginSet: (ResolvedPlugin | PluginGroup<ResolvedPlugin>)[], tagName: string): ResolvedPlugin | undefined;
export declare const isPluginInstanciated: (pluginTagName: string, shell: OscdShell) => boolean;
export declare const waitForPluginInstanciation: (plugin: ResolvedPlugin, shell: OscdShell) => Promise<void>;
export declare const waitForPluginsToInstantiate: (plugins: ResolvedPlugin[], shell: OscdShell) => Promise<void[]>;
/**
 * Convienience function to wait for all applicable plugins to instantiate.
 * If a document is loaded, all plugins are waited for. If no document is loaded,
 * only plugins that do not require a document are waited for.
 * If no document is loaded, only menu and background plugins are considered, as
 * the landing page does not have an editor.
 *
 * @param shell - The instance of the OscdShell to check for plugin instantiation.
 * @returns Empty Promise that resolves when all applicable plugins have been instantiated.
 */
export declare const waitForAllPluginsToInstantiate: (shell: OscdShell) => Promise<void | void[]>;
export declare const registerPlugin: (shell: OscdShell, tagName: string, pluginClass: CustomElementConstructor) => void;
