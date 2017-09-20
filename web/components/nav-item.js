export class NavItem extends HTMLElement {
    static get template() {
        return `
            <link rel="stylesheet" href="./styles.css">
            <slot></slot>
            <style>
                :host {
                    overflow: visible;
                    display: inline-block;
                    text-align: center;
                    padding: .3em .9em;
                    vertical-align: middle;
                    border: 0;
                    width: auto;
                    user-select: none;
                    margin: .3em 0;
                    cursor: pointer;
                    border-radius: .2em;
                    height: auto;
                    box-shadow: 0 0 transparent inset;
                    margin-right: .6em;
                    background: transparent;
                    color: #111;
                }
            </style>
        `;
    }
    constructor() {
        super();
        this._shadowRoot = this.attachShadow({ mode: 'open' });
        this._shadowRoot.innerHTML = NavItem.template;
    }
}

window.customElements.define('au-nav-item', NavItem);
