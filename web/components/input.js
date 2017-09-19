class Input extends HTMLElement {
    static get template() {
        return `
            <link rel="stylesheet" href="./styles.css">
            <input type="text">
            <style>
                input {
                    line-height: 1.5;
                    margin: 0;
                    height: 2.1em;
                    padding: .3em .6em;
                    border: 1px solid #ccc;
                    background: #fff;
                    border-radius: .2em;
                    transition: all 0.3s;
                    width: 100%;
                    font-size: 1.1em;
                }
            </style>
        `;
    }
    static get observedAttributes() {
        return ['placeholder'];
    }
    constructor() {
        super();
        this._shadowRoot = this.attachShadow({ mode: 'open' });
        this._shadowRoot.innerHTML = Input.template;
        this.inputElement = this._shadowRoot.querySelector('input');
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'placeholder') {
            this.renderPlaceholder(newValue);
        }
    }
    renderPlaceholder(newPlaceholder) {
        this.inputElement.placeholder = newPlaceholder;
    }
    get placeholder() {
        return this.getAttribute('placeholder');
    }
    set placeholder(placeholder) {
        this.setAttribute('placeholder', brand);
    }
}

window.customElements.define('au-input', Input);
