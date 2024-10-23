// components/CustomerSearch.js
import { SELECTORS } from '../constants.js';
import { APIService } from '../services/APIService.js';
import { UIHelper } from '../utils/UIHelper.js';

export class CustomerSearch {
    constructor(onCustomerSelected) {
        this.onCustomerSelected = onCustomerSelected;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Botão de pesquisa
        const searchBtn = document.getElementById('search_customer_btn');
        const searchInput = document.getElementById(SELECTORS.CUSTOMER_SEARCH);

        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.handleSearch());
        }

        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleSearch();
                }
            });
        }

        // Lista de resultados
        const customerList = document.getElementById(SELECTORS.CUSTOMER_LIST);
        if (customerList) {
            customerList.addEventListener('click', (e) => this.handleCustomerClick(e));
        }
    }

    async handleSearch() {
        const searchInput = document.getElementById(SELECTORS.CUSTOMER_SEARCH);
        const term = searchInput?.value?.trim();
        
        if (!term) {
            UIHelper.showError('Digite um termo para pesquisa');
            return;
        }

        try {
            const customers = await APIService.searchCustomers(term);
            this.renderResults(customers);
        } catch (error) {
            UIHelper.showError('Erro ao pesquisar clientes', error);
        }
    }

    renderResults(customers) {
        const customerList = document.getElementById(SELECTORS.CUSTOMER_LIST);
        const resultsContainer = document.getElementById(SELECTORS.CUSTOMER_RESULTS);
        
        if (!customerList || !resultsContainer) return;
        
        customerList.innerHTML = '';
        
        if (customers.length > 0) {
            customers.forEach(customer => {
                const li = document.createElement('li');
                li.className = 'list-group-item customer-result';
                li.dataset.id = customer.id;
                li.dataset.name = customer.name;
                li.dataset.phone = customer.phone || '';
                li.dataset.document = customer.document || '';
                li.innerHTML = `
                    <strong>${customer.name}</strong>
                    ${customer.document ? `<br>Documento: ${customer.document}` : ''}
                    ${customer.phone ? `<br>Telefone: ${customer.phone}` : ''}
                `;
                customerList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.textContent = 'Nenhum cliente encontrado';
            customerList.appendChild(li);
        }
        
        resultsContainer.style.display = 'block';
    }

    handleCustomerClick(event) {
        const customerElement = event.target.closest('.customer-result');
        if (!customerElement) return;

        const customerData = {
            id: customerElement.dataset.id,
            name: customerElement.dataset.name,
            phone: customerElement.dataset.phone,
            document: customerElement.dataset.document
        };

        this.updateCustomerDisplay(customerData);
        
        if (this.onCustomerSelected) {
            this.onCustomerSelected(customerData);
        }
    }

    updateCustomerDisplay(customerData) {
        // Atualiza os elementos de exibição
        const updateElement = (selector, value) => {
            const element = document.getElementById(selector);
            if (element) {
                element.textContent = value || '';
            }
        };

        updateElement(SELECTORS.SELECTED_CUSTOMER_NAME, customerData.name);
        updateElement(SELECTORS.SELECTED_CUSTOMER_PHONE, customerData.phone);
        updateElement(SELECTORS.SELECTED_CUSTOMER_DOCUMENT, customerData.document);

        // Atualiza o input hidden do cliente
        const customerIdInput = document.getElementById(SELECTORS.CUSTOMER_ID_INPUT);
        if (customerIdInput) {
            customerIdInput.value = customerData.id;
        }

        // Limpa a pesquisa
        const resultsContainer = document.getElementById(SELECTORS.CUSTOMER_RESULTS);
        const searchInput = document.getElementById(SELECTORS.CUSTOMER_SEARCH);
        
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }
        if (searchInput) {
            searchInput.value = '';
        }
    }
}