import { LitElement } from 'lit';
import { OscdFilledIconButton } from '@omicronenergy/oscd-ui/iconbutton/OscdFilledIconButton.js';
import { OscdIcon } from '@omicronenergy/oscd-ui/icon/OscdIcon.js';
import { OscdMenu } from '@omicronenergy/oscd-ui/menu/OscdMenu.js';
import { OscdMenuItem } from '@omicronenergy/oscd-ui/menu/OscdMenuItem.js';
import { LocaleTag } from '../localization.js';
import { PluginEntry } from '../oscd-shell.js';
declare global {
    interface HTMLElementTagNameMap {
        'plugin-menu': PluginsMenu;
    }
}
declare const PluginsMenu_base: typeof LitElement & import("@open-wc/scoped-elements/lit-element.js").ScopedElementsHostConstructor;
export declare class PluginsMenu extends PluginsMenu_base {
    static scopedElements: {
        'oscd-filled-icon-button': typeof OscdFilledIconButton;
        'oscd-icon': typeof OscdIcon;
        'oscd-menu': typeof OscdMenu;
        'oscd-menu-item': typeof OscdMenuItem;
    };
    editableDocs: string[];
    menuPlugins: PluginEntry[];
    appIcon: string;
    appTitle: string;
    locale: LocaleTag;
    open: () => void;
    menu: OscdMenu;
    renderMenuItem(plugin: PluginEntry, disabled: boolean): import("lit-html").TemplateResult<1>;
    render(): import("lit-html").TemplateResult<1>;
    static styles: import("lit").CSSResult;
}
export {};
