import './input.js';
import { NavItem } from './nav-item.js';
import './nav.js';
import './event-item.js';

class App extends HTMLElement {
    static get template() {
        return `
            <link rel="stylesheet" href="./styles.css">
            <div class="container">
                <au-nav brand="Arenavision Unofficial">
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
        this._inputElement = this._shadowRoot.querySelector('au-input');
        this._navElement = this._shadowRoot.querySelector('au-nav');
    }
    async connectedCallback() {
        try {
            const response = await fetch('/json');
            this._events = await response.json();
            this.renderEventList(this._events);
            this._inputElement.addEventListener('input', this.inputListener.bind(this));
            this._navElement.addEventListener('click', this.navClickListener.bind(this));
            const sports = [];
            this._events.forEach((event) => {
                if (!sports.includes(event.sport)) {
                    sports.push(event.sport);
                }
            });
            this.renderSports(sports);
        } catch (err) {
            console.error(err);
        }
    }
    inputListener(event) {
        const search = event.target.value;
        this.searchEvents(search);
    }
    navClickListener(event) {
        if (!event.target instanceof NavItem) {
            return;
        }
        const search = event.target.textContent;
        if (search === this._currentSearch) {
            this.renderEventList(this._events);
            this._inputElement.value = '';
            return this._currentSearch = '';
        }
        this._currentSearch = search;
        this.searchEvents(search);
        this._inputElement.value = search;
    }
    searchEvents(search) {
        const lowerCaseSearch = search.toLowerCase();
        this.renderEventList(this._events.filter((event) => {
            return event.sport.toLowerCase().includes(lowerCaseSearch)
                || event.title.toLowerCase().includes(lowerCaseSearch)
                || event.competition.toLowerCase().includes(lowerCaseSearch)
        }));
    }
    renderEventList(events) {
        while (this._eventListElement.firstChild) {
            this._eventListElement.removeChild(this._eventListElement.firstChild);
        }
        if (events.length === 0) {
            return this._eventListElement.textContent = 'No results';
        }
        events.forEach((event) => {
            const eventElement = document.createElement('au-event-item');
            eventElement.event = event;
            this._eventListElement.appendChild(eventElement);
        });
    }
    renderSports(sports) {
        sports.forEach((sport) => {
            const navItemElement = document.createElement('au-nav-item');
            navItemElement.textContent = sport;
            this._navElement.appendChild(navItemElement);
        });
    }
}

window.customElements.define('au-app', App);
