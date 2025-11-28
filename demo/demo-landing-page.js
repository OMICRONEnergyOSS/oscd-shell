import { LitElement, html, css } from 'lit';
import { newOpenEvent } from '@openscd/oscd-api/utils.js';

const sclDocString = `<?xml version="1.0" encoding="UTF-8"?>
  <SCL version="2007" revision="B" xmlns="http://www.iec.ch/61850/2003/SCL">
  <Substation name="A1" desc="test substation"></Substation>
</SCL>`;

export class DemoLandingPage extends LitElement {
  rows = 100;

  handleLoadDocClick() {
    const doc = new DOMParser().parseFromString(
      sclDocString,
      'application/xml',
    );
    const openEvent = newOpenEvent(doc, 'sample.scd');
    this.dispatchEvent(openEvent);
  }

  handleMenuPluginClick(plugin) {
    const oscdShell = this.closest('oscd-shell');
    if (oscdShell) {
      const menuPluginInstance = oscdShell.shadowRoot.querySelector(
        plugin.tagName,
      );
      if (menuPluginInstance) {
        menuPluginInstance.run();
      }
    }
  }

  getMenuPlugins() {
    const menuPlugins = this.closest('oscd-shell').plugins.menu;
    return menuPlugins.filter(plugin => plugin.requireDoc !== true);
  }

  render() {
    return html`
      <div>
        <h2>Custom Landing Page</h2>
        <p>
          This page is onl displayed as long as no documents are loaded.
          Clicking the buttom below will trigger a "oscd-open" event which the
          oscd-shell will intecept, then display the standard view.
        </p>
        <button @click=${() => this.handleLoadDocClick()}>
          Load Sample Document
        </button>
        ${this.getMenuPlugins().map(
          plugin =>
            html`<button @click=${() => this.handleMenuPluginClick(plugin)}>
              ${plugin.name}
            </button>`,
        )}
      </div>
    `;
  }

  static styles = css`
    :host > div {
      color: var(--md-sys-color-on-surface);
      /* background-color: var(--md-sys-color-surface-variant); */
      font-family: 'Roboto', sans-serif;
      font-weight: 300;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
  `;
}

customElements.define('demo-landing-page', DemoLandingPage);
export default DemoLandingPage;
