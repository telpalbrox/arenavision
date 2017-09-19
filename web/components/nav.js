class AppNav extends HTMLElement {
    static get template() {
        return `
            <link rel="stylesheet" href="./styles.css">
            <div class="brand"></div>
            <div class="menu">
                <slot></slot>
            </div>
            <style>
            :host {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                height: 3em;
                padding: 0 .6em;
                background: #fff;
                box-shadow: 0 0 0.2em rgba(17,17,17,0.2);
                z-index: 10000;
                transform-style: preserve-3d;
            }
            .brand {
                float: right;
                position: relative;
                top: 50%;
                transform: translateY(-50%);
                font-weight: 700;
                float: left;
                padding: 0 .6em;
                max-width: 50%;
                white-space: nowrap;
                color: #111;
            }
            .menu {
                float: right;
                position: relative;
                top: 50%;
                transform: translateY(-50%);
            }
            </style>
        `;
    }
    static get observedAttributes() {
        return ['brand'];
    }
    constructor() {
        super();
        this._shadowRoot = this.attachShadow({ mode: 'open' });
        this._shadowRoot.innerHTML = AppNav.template;
        this.brandElement = this._shadowRoot.querySelector('.brand');
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'brand') {
            this.renderBrand(newValue);
        }
    }
    renderBrand(newBrand) {
        this.brandElement.textContent = newBrand;
    }
    get brand() {
        return this.getAttribute('brand');
    }
    set brand(brand) {
        this.setAttribute('brand', brand);
    }
}

window.customElements.define('au-nav', AppNav);
