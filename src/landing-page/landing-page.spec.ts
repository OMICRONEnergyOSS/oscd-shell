import { expect, fixture, html } from '@open-wc/testing';
import type { OscdShell, ResolvedPlugin } from '../oscd-shell.js';

import '../oscd-shell.js';
import { TestMenuPlugin1 } from '../utils/testing/test-plugins.js';
import { LandingPage } from './landing-page.js';
import { newOpenEvent } from '@openscd/oscd-api/utils.js';
import { createSclDocument } from '../utils/testing/test-doc-helpers.js';
import {
  sampleMenuPlugins,
  waitForAllPluginsToInstantiate,
} from '../utils/testing/plugin-helpers.js';
import sinon from 'sinon';
import { OscdTextButton } from '@omicronenergy/oscd-ui/button/OscdTextButton.js';
import { flattenPluginEntries } from '../utils/plugin-utils.js';

const testHeading = 'Test Heading';
const testSubHeading = 'Test Subheading';

describe('default landing-page', () => {
  let oscdShell: OscdShell;
  let landingPage: LandingPage;

  beforeEach(async () => {
    oscdShell = await fixture(
      html`<oscd-shell
        landingPageHeading=${testHeading}
        landingPageSubHeading=${testSubHeading}
      ></oscd-shell>`,
    );
    const testMenuPlugin1TagName = (sampleMenuPlugins[0] as ResolvedPlugin)
      .tagName!;
    expect(testMenuPlugin1TagName).to.not.be.undefined;
    if (oscdShell?.registry?.get(testMenuPlugin1TagName) === undefined) {
      oscdShell?.registry?.define(testMenuPlugin1TagName!, TestMenuPlugin1);
    }
    oscdShell.plugins = {
      menu: sampleMenuPlugins,
    };
    await waitForAllPluginsToInstantiate(oscdShell);
    landingPage = oscdShell.shadowRoot!.querySelector('landing-page')!;
  });

  it('renders the default landing page when no custom slot or document is supplied', async () => {
    expect(landingPage).to.exist;
  });

  it('renders the landingPageHeading', async () => {
    const headingElement = landingPage.shadowRoot!.querySelector('.heading');
    expect(headingElement?.textContent?.trim()).to.equal(testHeading);
  });

  it('renders the landingPageSubHeading', async () => {
    const subHeadingElement =
      landingPage.shadowRoot!.querySelector('.sub-heading');
    expect(subHeadingElement?.textContent?.trim()).to.equal(testSubHeading);
  });

  it('does not load the default landing page as soon as a document is loaded', async () => {
    oscdShell.dispatchEvent(newOpenEvent(createSclDocument(), 'test.scd'));
    await oscdShell.updateComplete;
    const landingPageAfterOpen =
      oscdShell.shadowRoot!.querySelector('landing-page');
    expect(landingPageAfterOpen).to.be.null;
  });

  it('renders one menu tile per resolved plugin that does not require a document', async () => {
    const menuPluginsNotRequiringDoc = flattenPluginEntries(
      oscdShell._resolvedPlugins.menu,
    ).filter(plugin => !plugin.requireDoc);
    const menuPluginElements =
      landingPage.shadowRoot!.querySelectorAll('.menu-plugin-item');

    expect(menuPluginElements.length).to.equal(
      menuPluginsNotRequiringDoc.length,
    );
  });

  it('triggers the run method of the plugin when a menu tile is clicked', async () => {
    const testMenuPlugin1Def = sampleMenuPlugins.find(
      plugin => (plugin as ResolvedPlugin).tagName === 'test-menu-plugin1',
    );
    const menuPluginElements =
      landingPage.shadowRoot!.querySelectorAll('.menu-plugin-item');

    const testMenuPlugin1Instance = oscdShell.shadowRoot?.querySelector(
      'test-menu-plugin1',
    ) as TestMenuPlugin1;
    const menuPluginSpy = sinon.spy(testMenuPlugin1Instance, 'run');

    const testMenuPlugin1Button = Array.from(menuPluginElements).find(
      element =>
        element
          .querySelector('.menu-plugin-item-content span')
          ?.textContent?.trim() === testMenuPlugin1Def?.name,
    ) as OscdTextButton;
    testMenuPlugin1Button.click();
    await oscdShell.updateComplete;

    expect(menuPluginSpy.calledOnce).to.be.true;
  });
});

describe('custom landing-page', () => {
  let oscdShell: OscdShell;
  // let landingPage: LandingPage;

  beforeEach(async () => {
    oscdShell = <OscdShell>await fixture(
      html`<oscd-shell>
        <div slot="landing-page" class="my-custom-landing-page">
          <h1>Custom Landing Page</h1>
        </div>
      </oscd-shell>`,
    );
    await waitForAllPluginsToInstantiate(oscdShell);
  });

  it('loads a custom landing page if no document is loaded', async () => {
    const landingPageSlot = oscdShell.shadowRoot!.querySelector(
      'slot[name="landing-page"]',
    ) as HTMLSlotElement;
    expect(landingPageSlot).to.exist;
    expect(landingPageSlot?.assignedElements().length).to.equal(1);
    const customLandingPage = landingPageSlot?.assignedElements()[0];
    expect(customLandingPage).to.exist;
  });

  it('omits the default landing page when a custom landing-page slot is supplied', async () => {
    const defaultLandingPage =
      oscdShell.shadowRoot!.querySelector('landing-page');
    expect(defaultLandingPage).to.be.null;
  });
});
