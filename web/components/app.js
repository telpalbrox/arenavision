import './input.js';
import './nav-item.js';
import './nav.js';
import './event-item.js';

class App extends HTMLElement {
    static get template() {
        return `
            <link rel="stylesheet" href="./styles.css">
            <div class="container">
                <au-nav brand="Arenavision Unofficial">
                    <au-nav-item>Boxing</au-nav-item>
                    <au-nav-item>Soccer</au-nav-item>
                    <au-nav-item>Mma</au-nav-item>
                    <au-nav-item>Formula 1</au-nav-item>
                </au-nav>
                <au-input placeholder="Search"></au-input>
                <div class="event-list">
                    Loading...
                </div>
            </div>
            <style>
                .container {
                    padding: 60px 8px 8px;
                }
            </style>
        `;
    }
    constructor() {
        super();
        this._shadowRoot = this.attachShadow({ mode: 'open' });
        this._shadowRoot.innerHTML = App.template;
        this._eventListElement = this._shadowRoot.querySelector('.event-list');
    }

    async connectedCallback() {
        try {
            const response = await fetch('/json');
            const jsonResponse = await response.json();
            this.renderEventList(jsonResponse);
        } catch (err) {
            console.error(err);
        }
    }

    renderEventList(events) {
        while (this._eventListElement.firstChild) {
            this._eventListElement.removeChild(this._eventListElement.firstChild);
        }
        events.forEach((event) => {
            const eventElement = document.createElement('au-event-item');
            eventElement.event = event;
            this._eventListElement.appendChild(eventElement);
        });
    }
}

window.customElements.define('au-app', App);
