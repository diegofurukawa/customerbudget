// Constants for DOM selectors
const SELECTORS = {
    TOTAL_FORMS: (prefix) => `id_${prefix}-TOTAL_FORMS`,
    ADD_ITEM_BTN: 'add_item_btn',
    MATERIAL_SELECT: 'material_select',
    QUANTITY_INPUT: 'quantity_input',
    ITEMS_TABLE: 'items_table',
    CUSTOMER_SEARCH: 'customer_search',
    CUSTOMER_LIST: 'customer_list',
    CUSTOMER_RESULTS: 'customer_results',
    SELECTED_CUSTOMER_NAME: 'selected_customer_name',
    SELECTED_CUSTOMER_PHONE: 'selected_customer_phone',
    SELECTED_CUSTOMER_DOCUMENT: 'selected_customer_document'
};

class BudgetForm {
    constructor(itemFormsetPrefix) {
        this.itemFormsetPrefix = itemFormsetPrefix;
        this.totalForms = document.getElementById(SELECTORS.TOTAL_FORMS(itemFormsetPrefix));
        this.initializeEventListeners();
        this.initializeTotals();
    }

    initializeEventListeners() {
        // Add Item Button
        document.getElementById(SELECTORS.ADD_ITEM_BTN)?.addEventListener('click', () => this.handleAddItem());

        // Remove Item Buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.remove-item')) {
                this.handleRemoveItem(e.target);
            }
        });

        // Quantity Change
        document.addEventListener('change', (e) => {
            if (e.target.matches('.quantity-input')) {
                this.handleQuantityChange(e.target);
            }
        });

        // Customer Search
        this.initializeCustomerSearch();

        // Material Selection
        const materialSelect = document.getElementById(SELECTORS.MATERIAL_SELECT);
        materialSelect?.addEventListener('change', () => this.validateForm());

        // Quantity Input
        const quantityInput = document.getElementById(SELECTORS.QUANTITY_INPUT);
        quantityInput?.addEventListener('change', () => this.validateForm());
    }

    initializeTotals() {
        this.updateTotals();
    }

    async handleAddItem() {
        try {
            const materialSelect = document.getElementById(SELECTORS.MATERIAL_SELECT);
            const materialId = materialSelect.value;
            const materialName = materialSelect.options[materialSelect.selectedIndex]?.text;
            const quantity = parseFloat(document.getElementById(SELECTORS.QUANTITY_INPUT).value);

            if (!this.validateItemInput(materialId, quantity)) {
                return;
            }

            const priceData = await this.fetchMaterialPrice(materialId);
            console.log('Price data:', priceData); // Debug log

            if (priceData && priceData.success !== false) {
                this.addItemToTable(materialId, materialName, quantity, priceData);
                this.resetInputs(materialSelect);
                this.updateTotals();
            } else {
                throw new Error(priceData.error || 'Erro ao obter preço do material');
            }
        } catch (error) {
            this.handleError('Erro ao adicionar item', error);
        }
    }

    validateItemInput(materialId, quantity) {
        if (!materialId) {
            alert("Por favor, selecione um material.");
            return false;
        }
        if (!quantity || quantity <= 0) {
            alert("Por favor, insira uma quantidade válida maior que zero.");
            return false;
        }
        return true;
    }

    async fetchMaterialPrice(materialId) {
        try {
            console.log(`Fetching price for material ID: ${materialId}`);
            const response = await fetch(`/materials/${materialId}/current-price/`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Price data received:', data);

            return {
                value: data.value || 0,
                tax_value: data.tax_value || 0,
                value_total: data.value_total || data.value || 0
            };
        } catch (error) {
            console.error('Error fetching material price:', error);
            throw new Error('Erro ao obter preço do material');
        }
    }

    addItemToTable(materialId, materialName, quantity, priceData) {
        const newIndex = parseInt(this.totalForms.value);
        const valueTotal = quantity * (parseFloat(priceData.value_total) || parseFloat(priceData.value));
        
        const template = this.createItemTemplate(materialId, materialName, quantity, priceData, valueTotal, newIndex);
        const tbody = document.querySelector(`#${SELECTORS.ITEMS_TABLE} tbody`);
        tbody.insertAdjacentHTML('beforeend', template);
        
        this.totalForms.value = newIndex + 1;
    }

    createItemTemplate(materialId, materialName, quantity, priceData, valueTotal, newIndex) {
        return `
            <tr>
                <td>
                    <input type="hidden" name="${this.itemFormsetPrefix}-${newIndex}-material" value="${materialId}">
                    <input type="hidden" name="${this.itemFormsetPrefix}-${newIndex}-id" value="">
                    <input type="hidden" name="${this.itemFormsetPrefix}-${newIndex}-value" value="${priceData.value}">
                    <input type="hidden" name="${this.itemFormsetPrefix}-${newIndex}-tax_value" value="${priceData.tax_value}">
                    <input type="hidden" name="${this.itemFormsetPrefix}-${newIndex}-value_total" value="${valueTotal}">
                    ${materialName}
                </td>
                <td>
                    <input type="number" name="${this.itemFormsetPrefix}-${newIndex}-quantity" 
                           value="${quantity}" step="0.01" min="0.01" class="form-control quantity-input">
                </td>
                <td class="text-end">R$ <span class="item-value">${parseFloat(priceData.value).toFixed(2)}</span></td>
                <td class="text-end">R$ <span class="item-tax">${parseFloat(priceData.tax_value).toFixed(2)}</span></td>
                <td class="text-end">R$ <span class="item-total">${valueTotal.toFixed(2)}</span></td>
                <td>
                    <button type="button" class="btn btn-danger btn-sm remove-item">Remover</button>
                </td>
            </tr>
        `;
    }

    handleRemoveItem(button) {
        const row = button.closest('tr');
        row.remove();
        this.updateFormIndexes();
        this.updateTotals();
    }

    handleQuantityChange(input) {
        const row = input.closest('tr');
        const quantity = parseFloat(input.value) || 0;
        const value = parseFloat(row.querySelector('input[name$="-value"]').value);
        const taxValue = parseFloat(row.querySelector('input[name$="-tax_value"]').value);
        
        const valueTotal = quantity * (value + taxValue);
        row.querySelector('input[name$="-value_total"]').value = valueTotal;
        row.querySelector('.item-total').textContent = valueTotal.toFixed(2);
        
        this.updateTotals();
    }

    updateFormIndexes() {
        const rows = document.querySelectorAll(`#${SELECTORS.ITEMS_TABLE} tbody tr`);
        rows.forEach((row, index) => {
            row.querySelectorAll('input').forEach(input => {
                const name = input.getAttribute('name').replace(/-\d+-/, `-${index}-`);
                input.setAttribute('name', name);
            });
        });
        this.totalForms.value = rows.length;
    }

    updateTotals() {
        let subtotal = 0;
        let taxTotal = 0;
        let grandTotal = 0;
        
        document.querySelectorAll(`#${SELECTORS.ITEMS_TABLE} tbody tr`).forEach(row => {
            const quantity = parseFloat(row.querySelector('.quantity-input').value) || 0;
            const value = parseFloat(row.querySelector('input[name$="-value"]').value) || 0;
            const taxValue = parseFloat(row.querySelector('input[name$="-tax_value"]').value) || 0;
            
            subtotal += quantity * value;
            taxTotal += quantity * taxValue;
            grandTotal += quantity * (value + taxValue);
        });
        
        this.updateTotalDisplays(subtotal, taxTotal, grandTotal);
    }

    updateTotalDisplays(subtotal, taxTotal, grandTotal) {
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                if (element.tagName === 'INPUT') {
                    element.value = value.toFixed(2);
                } else {
                    element.textContent = value.toFixed(2);
                }
            }
        };

        updateElement('subtotal', subtotal);
        updateElement('tax_total', taxTotal);
        updateElement('grand_total', grandTotal);
        updateElement('budget_value', subtotal);
        updateElement('budget_tax_value', taxTotal);
        updateElement('budget_value_total', grandTotal);
    }

    initializeCustomerSearch() {
        const searchBtn = document.getElementById('search_customer_btn');
        const searchInput = document.getElementById(SELECTORS.CUSTOMER_SEARCH);

        searchBtn?.addEventListener('click', () => this.handleCustomerSearch());
        searchInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleCustomerSearch();
            }
        });

        document.getElementById(SELECTORS.CUSTOMER_LIST)?.addEventListener('click', (e) => {
            const customerResult = e.target.closest('.customer-result');
            if (customerResult) {
                this.handleCustomerSelection(customerResult);
            }
        });
    }

    async handleCustomerSearch() {
        const searchTerm = document.getElementById(SELECTORS.CUSTOMER_SEARCH).value;
        if (!searchTerm) return;

        try {
            const response = await fetch(`/customers/search/?term=${encodeURIComponent(searchTerm)}`);
            if (!response.ok) throw new Error('Erro na busca');
            const data = await response.json();
            this.renderCustomerResults(data);
        } catch (error) {
            this.handleError('Erro ao pesquisar clientes', error);
        }
    }

    renderCustomerResults(customers) {
        const customerList = document.getElementById(SELECTORS.CUSTOMER_LIST);
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
                    ${customer.name}<br>
                    ${customer.document ? `Documento: ${customer.document}<br>` : ''}
                    ${customer.phone ? `Telefone: ${customer.phone}` : ''}
                `;
                customerList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.textContent = 'Nenhum cliente encontrado';
            customerList.appendChild(li);
        }
        
        document.getElementById(SELECTORS.CUSTOMER_RESULTS).style.display = 'block';
    }

    handleCustomerSelection(customerElement) {
        const customerId = customerElement.dataset.id;
        const name = customerElement.dataset.name;
        const phone = customerElement.dataset.phone;
        const document = customerElement.dataset.document;

        document.getElementById('id_customer').value = customerId;
        document.getElementById(SELECTORS.SELECTED_CUSTOMER_NAME).textContent = name;
        document.getElementById(SELECTORS.SELECTED_CUSTOMER_PHONE).textContent = phone;
        document.getElementById(SELECTORS.SELECTED_CUSTOMER_DOCUMENT).textContent = document;
        
        document.getElementById(SELECTORS.CUSTOMER_RESULTS).style.display = 'none';
        document.getElementById(SELECTORS.CUSTOMER_SEARCH).value = '';
    }

    handleError(message, error) {
        console.error(message, error);
        alert(`${message}. Detalhes: ${error.message}`);
    }

    resetInputs(materialSelect) {
        materialSelect.value = '';
        document.getElementById(SELECTORS.QUANTITY_INPUT).value = '';
    }

    validateForm() {
        const materialId = document.getElementById(SELECTORS.MATERIAL_SELECT).value;
        const quantity = parseFloat(document.getElementById(SELECTORS.QUANTITY_INPUT).value);
        const addButton = document.getElementById(SELECTORS.ADD_ITEM_BTN);
        
        if (addButton) {
            addButton.disabled = !materialId || !quantity || quantity <= 0;
        }
    }
}

// Initialize the form when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        const budgetForm = new BudgetForm('items');
        console.log('Budget form initialized successfully');
    } catch (error) {
        console.error('Error initializing budget form:', error);
        alert('Erro ao inicializar o formulário. Por favor, recarregue a página.');
    }
});