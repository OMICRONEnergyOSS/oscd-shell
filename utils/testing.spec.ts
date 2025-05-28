import { expect, fixture, html } from '@open-wc/testing';
import sinon from 'sinon';

import {
  findButtonByIcon,
  getFirstTextNodeContent,
  querySelectorContainingText,
  simulateKeypressOnElement,
  waitForDialogState,
} from './testing.js';

describe('querySelectorContainingText', () => {
  it('returns the element matching selector and exact text', async () => {
    const el = await fixture<HTMLDivElement>(html`
      <div>
        <span class="item">Apple</span>
        <span class="item">Banana</span>
        <span class="item">Cherry</span>
      </div>
    `);

    const result = querySelectorContainingText(el, '.item', 'Banana');
    expect(result).to.exist;
    expect(result?.textContent?.trim()).to.equal('Banana');
  });

  it('returns undefined if no element matches the text', async () => {
    const el = await fixture<HTMLDivElement>(html`
      <div>
        <span class="item">Apple</span>
        <span class="item">Banana</span>
      </div>
    `);

    const result = querySelectorContainingText(el, '.item', 'Orange');
    expect(result).to.be.undefined;
  });

  it('returns undefined if no element matches the selector', async () => {
    const el = await fixture<HTMLDivElement>(html`
      <div>
        <span class="item">Apple</span>
      </div>
    `);

    const result = querySelectorContainingText(el, '.notfound', 'Apple');
    expect(result).to.be.undefined;
  });

  it('matches only the first text node content', async () => {
    const el = await fixture<HTMLDivElement>(html`
      <div>
        <span class="item">Apple <b>Bold</b></span>
        <span class="item">Banana</span>
      </div>
    `);

    const result = querySelectorContainingText(el, '.item', 'Apple');
    expect(result).to.exist;
    expect(result?.textContent?.includes('Apple')).to.be.true;
  });

  it('ignores whitespace differences in text nodes', async () => {
    const el = await fixture<HTMLDivElement>(html`
      <div>
        <span class="item"> Apple </span>
      </div>
    `);

    const result = querySelectorContainingText(el, '.item', 'Apple');
    expect(result).to.exist;
  });
});
describe('getFirstTextNodeContent', () => {
  it('returns the trimmed text content of the first text node', async () => {
    const el = document.createElement('div');
    el.appendChild(document.createTextNode('  Hello  '));
    el.appendChild(document.createElement('span'));
    expect(getFirstTextNodeContent(el)).to.equal('Hello');
  });

  it('returns undefined if there are no text nodes', () => {
    const el = document.createElement('div');
    el.appendChild(document.createElement('span'));
    expect(getFirstTextNodeContent(el)).to.be.undefined;
  });

  it('returns empty string if element is null', () => {
    expect(getFirstTextNodeContent(null)).to.equal('');
  });

  it('ignores empty text nodes', () => {
    const el = document.createElement('div');
    el.appendChild(document.createTextNode('   '));
    el.appendChild(document.createTextNode('Text'));
    expect(getFirstTextNodeContent(el)).to.equal('Text');
  });

  it('returns an empty string if no element is passed in', () => {
    expect(getFirstTextNodeContent(null)).to.equal('');
  });
});

describe('simulateKeypressOnElement', () => {
  it('dispatches a keydown event with the correct key and ctrlKey', () => {
    const spy = sinon.spy();
    document.addEventListener('keydown', spy, { once: true });
    simulateKeypressOnElement('a', true);
    expect(spy.calledOnce).to.be.true;
    const event = spy.firstCall.args[0];
    expect(event).to.have.property('key', 'a');
    expect(event).to.have.property('ctrlKey', true);
  });
});

describe('waitForDialogState', () => {
  it('resolves immediately if dialog is already open', async () => {
    const dialog = document.createElement('dialog');
    dialog.setAttribute('open', '');
    let resolved = false;
    await waitForDialogState(dialog, 'open').then(() => {
      resolved = true;
    });
    expect(resolved).to.be.true;
  });

  it('waits for dialog to become open', async () => {
    const dialog = document.createElement('dialog');
    setTimeout(() => dialog.setAttribute('open', ''), 10);
    await waitForDialogState(dialog, 'open');
    expect(dialog.hasAttribute('open')).to.be.true;
  });

  it('resolves immediately if dialog is already closed', async () => {
    const dialog = document.createElement('dialog');
    let resolved = false;
    await waitForDialogState(dialog, 'closed').then(() => {
      resolved = true;
    });
    expect(resolved).to.be.true;
  });

  it('waits for dialog to emit closed event', async () => {
    const dialog = document.createElement('dialog');
    dialog.setAttribute('open', '');
    setTimeout(() => {
      dialog.removeAttribute('open');
      dialog.dispatchEvent(new Event('closed'));
    }, 10);
    await waitForDialogState(dialog, 'closed');
    expect(dialog.hasAttribute('open')).to.be.false;
  });
});

describe('findButtonByIcon', () => {
  it('returns the button with the matching icon name', () => {
    const root = document.createElement('div');
    const btn1 = document.createElement('button');
    btn1.classList.add('icon-btn');
    const icon1 = document.createElement('oscd-icon');
    icon1.textContent = 'foo';
    btn1.appendChild(icon1);

    const btn2 = document.createElement('button');
    btn2.classList.add('icon-btn');
    const icon2 = document.createElement('oscd-icon');
    icon2.textContent = 'bar';
    btn2.appendChild(icon2);

    root.appendChild(btn1);
    root.appendChild(btn2);

    const found = findButtonByIcon(root, '.icon-btn', 'bar');
    expect(found).to.equal(btn2);
  });

  it('returns null if no button matches the icon name', () => {
    const root = document.createElement('div');
    const btn = document.createElement('oscd-icon-button');
    const icon = document.createElement('oscd-icon');
    icon.textContent = 'foo';
    btn.appendChild(icon);
    root.appendChild(btn);

    const found = findButtonByIcon(root, 'oscd-icon-button', 'bar');
    expect(found).to.be.undefined;
  });

  it('returns null if no button matches the selector', () => {
    const root = document.createElement('div');
    const btn = document.createElement('oscd-text-button');
    const icon = document.createElement('oscd-icon');
    icon.textContent = 'foo';
    root.appendChild(btn);

    const found = findButtonByIcon(root, 'oscd-icon-button', 'foo');
    expect(found).to.be.undefined;
  });

  it('returns null if oscd-icon is missing', () => {
    const root = document.createElement('div');
    const btn = document.createElement('oscd-text-button');
    const icon = document.createElement('oscd-emoji');
    icon.textContent = 'foo';
    root.appendChild(btn);

    const found = findButtonByIcon(root, 'oscd-text-button', 'foo');
    expect(found).to.be.undefined;
  });
});
