import { LitElement } from 'lit';
import { OscdIcon } from '@omicronenergy/oscd-ui/icon/OscdIcon.js';
import { OscdMenu } from '@omicronenergy/oscd-ui/menu/OscdMenu.js';
import { OscdMenuItem } from '@omicronenergy/oscd-ui/menu/OscdMenuItem.js';
import { OscdTextButton } from '@omicronenergy/oscd-ui/button/OscdTextButton.js';
import { LocaleTag } from '../localization.js';
declare global {
    interface HTMLElementTagNameMap {
        'files-menu': FilesMenu;
    }
}
declare const FilesMenu_base: typeof LitElement & import("@open-wc/scoped-elements/lit-element.js").ScopedElementsHostConstructor;
export declare class FilesMenu extends FilesMenu_base {
    static scopedElements: {
        'oscd-text-button': typeof OscdTextButton;
        'oscd-icon': typeof OscdIcon;
        'oscd-menu': typeof OscdMenu;
        'oscd-menu-item': typeof OscdMenuItem;
    };
    editableDocs: string[];
    selectedDocName: string | undefined;
    locale: LocaleTag;
    menu: OscdMenu;
    render(): import("lit-html").TemplateResult<1>;
    static styles: import("lit").CSSResult;
}
export {};
