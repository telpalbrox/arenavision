class EventItem extends HTMLElement {
    static get template() {
        return `
            <link rel="stylesheet" href="./styles.css">
            <span class="day"></span> - <span class="sport"></span> - <span class="competition"></span> - <span class="title"></span>
            <style>
                :host {
                    display: block;
                    text-transform: capitalize;
                    list-style: none;
                    border-radius: 1em;
                    background: #FAFAFA;
                    margin-bottom: 8px;
                }
            </style>
        `;
    }

    constructor() {
        super();
        this._shadowRoot = this.attachShadow({ mode: 'open' });
        this._shadowRoot.innerHTML = EventItem.template;
    }

    set event(event) {
        Object.keys(event).forEach((key) => {
            const element = this._shadowRoot.querySelector(`.${key}`);
            if (element) {
                element.textContent = event[key];
            }
        });
    }
}

window.customElements.define('au-event-item', EventItem);
