export class EventItem extends HTMLElement {
    static get template() {
        return `
            <link rel="stylesheet" href="./styles.css">
            <span class="day"></span> - <span class="sport"></span> - <span class="competition"></span> - <span class="title"></span> - <span class="channels"></span>
            <style>
                :host {
                    display: block;
                    text-transform: capitalize;
                    list-style: none;
                    border-radius: 1em;
                    background: #FAFAFA;
                    margin-bottom: 8px;
                }

                a {
                    color: #0074d9;
                    text-decoration: none;
                    box-shadow: none;
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
            if (key === 'channels') {
                return;
            }
            const element = this._shadowRoot.querySelector(`.${key}`);
            if (element) {
                element.textContent = event[key];
            }
        });
        const channelsElement = this._shadowRoot.querySelector('.channels');
        event.channels.forEach((channel, i) => {
            const channelUrlElement = document.createElement('a');
            channelUrlElement.href = channel.url;
            channelUrlElement.textContent = channel.language;
            channelsElement.appendChild(channelUrlElement);
            if (i !== event.channels.length - 1) {
                channelsElement.appendChild(document.createTextNode(' - '));
            }
        });
    }
}

window.customElements.define('au-event-item', EventItem);
