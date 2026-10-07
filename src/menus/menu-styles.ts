import { css } from 'lit';

export const menuStyles = css`
  oscd-menu-item {
    margin-inline: var(--plugins-menu-padding);
    border-radius: var(--md-menu-container-shape);
  }

  :is(oscd-menu-item, oscd-sub-menu) + :is(oscd-menu-item, oscd-sub-menu) {
    margin-top: 6px;
  }

  .menu-heading {
    padding: 6px calc(var(--plugins-menu-padding) + 8px);
    font-family: var(--oscd-text-font, Roboto), sans-serif;
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
    letter-spacing: 0.1px;
    color: var(--editor-plugins-panel-flyout-header-text-color);
  }

  oscd-divider.menu-divider {
    --md-divider-color: var(--plugins-menu-divider-color);
    width: calc(100% - 2 * var(--plugins-menu-padding));
    margin: 6px var(--plugins-menu-padding);
  }
`;
