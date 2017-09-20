export class Input extends HTMLElement {
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
        this._inputElement = this._shadowRoot.querySelector('input');
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'placeholder') {
            this.renderPlaceholder(newValue);
        }
    }
    renderPlaceholder(newPlaceholder) {
        this._inputElement.placeholder = newPlaceholder;
    }
    get placeholder() {
        return this.getAttribute('placeholder');
    }
    set placeholder(placeholder) {
        this.setAttribute('placeholder', brand);
    }
    get value() {
        return this._inputElement.value;
    }
    set value(value) {
        this._inputElement.value = value;
    }
}

window.customElements.define('au-input', Input);
