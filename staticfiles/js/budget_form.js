// Constants
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
    SELECTED_CUSTOMER_DOCUMENT: 'selected_customer_document',
    CUSTOMER_ID_INPUT: 'id_customer',
    STATUS_INPUT: 'id_status'
};

class BudgetForm {
    constructor(itemFormsetPrefix) {
        this.itemFormsetPrefix = itemFormsetPrefix;
        this.totalForms = document.getElementById(SELECTORS.TOTAL_FORMS(itemFormsetPrefix));
        if (!this.validateRequiredElements()) {
            throw new Error('Elementos obrigatórios não encontrados');
        }
        this.initializeFormDefaults();
        this.initializeEventListeners();
        this.initializeTotals();
    }

    validateRequiredElements() {
        const requiredElements = [
            SELECTORS.MATERIAL_SELECT,
            SELECTORS.QUANTITY_INPUT,
            SELECTORS.ITEMS_TABLE,
            'subtotal',
            'tax_total',
            'grand_total'
        ];

        return requiredElements.every(id => document.getElementById(id));
    }

    initializeFormDefaults() {
        // Inicializa o status do orçamento
        const statusInput = document.getElementById(SELECTORS.STATUS_INPUT);
        if (statusInput && !statusInput.value) {
            statusInput.value = 'CREATED';
        }

        // Inicializa os campos de valor do orçamento se necessário
        const budgetValueInputs = ['budget_value', 'budget_tax_value', 'budget_value_total'];
        budgetValueInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input && !input.value) {
                input.value = '0.00';
            }
        });
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

        // Material Select Change
        document.getElementById(SELECTORS.MATERIAL_SELECT)?.addEventListener('change', () => this.validateForm());

        // Quantity Input Change
        document.getElementById(SELECTORS.QUANTITY_INPUT)?.addEventListener('input', () => this.validateForm());

        // Customer Search
        this.initializeCustomerSearch();

        // Form Submission
        document.getElementById('budget-form')?.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    initializeTotals() {
        this.updateTotals();
    }

    validateForm() {
        const materialId = document.getElementById(SELECTORS.MATERIAL_SELECT).value;
        const quantity = parseFloat(document.getElementById(SELECTORS.QUANTITY_INPUT).value);
        const addButton = document.getElementById(SELECTORS.ADD_ITEM_BTN);
        
        if (addButton) {
            addButton.disabled = !materialId || !quantity || quantity <= 0;
        }
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
            if (!priceData.success) {
                throw new Error(priceData.error || 'Erro ao obter preço do material');
            }

            this.addItemToTable(materialId, materialName, quantity, priceData);
            this.resetInputs(materialSelect);
            this.updateTotals();
            this.validateForm();

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
            const response = await fetch(`/materials/${materialId}/current-price/`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return {
                success: true,
                ...data
            };
        } catch (error) {
            console.error('Error fetching material price:', error);
            return {
                success: false,
                error: error.message
            };
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
        
        const tbody = document.querySelector(`#${SELECTORS.ITEMS_TABLE} tbody`);
        if (tbody) {
            tbody.querySelectorAll('tr').forEach(row => {
                const quantityInput = row.querySelector('.quantity-input');
                const valueInput = row.querySelector('input[name$="-value"]');
                const taxValueInput = row.querySelector('input[name$="-tax_value"]');
                
                if (quantityInput && valueInput && taxValueInput) {
                    const quantity = parseFloat(quantityInput.value) || 0;
                    const value = parseFloat(valueInput.value) || 0;
                    const taxValue = parseFloat(taxValueInput.value) || 0;
                    
                    subtotal += quantity * value;
                    taxTotal += quantity * taxValue;
                    grandTotal += quantity * (value + taxValue);
                }
            });
        }
        
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
        if (!searchTerm) {
            alert('Por favor, digite um termo para pesquisa');
            return;
        }

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
        
        document.getElementById(SELECTORS.CUSTOMER_RESULTS).style.display = 'block';
    }

    handleCustomerSelection(customerElement) {
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value || '';
        };

        updateElement(SELECTORS.SELECTED_CUSTOMER_NAME, customerElement.dataset.name);
        updateElement(SELECTORS.SELECTED_CUSTOMER_PHONE, customerElement.dataset.phone);
        updateElement(SELECTORS.SELECTED_CUSTOMER_DOCUMENT, customerElement.dataset.document);

        const customerIdInput = document.getElementById(SELECTORS.CUSTOMER_ID_INPUT);
        if (customerIdInput) customerIdInput.value = customerElement.dataset.id;

        document.getElementById(SELECTORS.CUSTOMER_RESULTS).style.display = 'none';
        document.getElementById(SELECTORS.CUSTOMER_SEARCH).value = '';
    }

    handleSubmit(event) {
        event.preventDefault();
        
        // Garante que o status está definido
        const statusInput = document.getElementById(SELECTORS.STATUS_INPUT);
        if (statusInput && !statusInput.value) {
            statusInput.value = 'CREATED';
        }
        
        // Validação básica
        const customerId = document.getElementById(SELECTORS.CUSTOMER_ID_INPUT)?.value;
        if (!customerId) {
            alert('Por favor, selecione um cliente');
            return;
        }

        const items = document.querySelectorAll(`#${SELECTORS.ITEMS_TABLE} tbody tr`);
        if (items.length === 0) {
            alert('Por favor, adicione pelo menos um item ao orçamento');
            return;
        }
// Se tudo estiver ok, submete o formulário
event.target.submit();
}

handleError(message, error) {
    console.error(message, error);
    alert(`${message}. ${error.message || 'Por favor, tente novamente.'}`);
}

resetInputs(materialSelect) {
    materialSelect.value = '';
    document.getElementById(SELECTORS.QUANTITY_INPUT).value = '';
    this.validateForm();
}

formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}
}

// Initialize the form when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
try {
    const budgetForm = document.getElementById('budget-form');
    if (!budgetForm) {
        console.error('Formulário não encontrado');
        return;
    }

    // Define o status inicial no carregamento da página
    const statusInput = document.getElementById(SELECTORS.STATUS_INPUT);
    if (statusInput && !statusInput.value) {
        statusInput.value = 'CREATED';
    }

    const budgetFormInstance = new BudgetForm('items');
    console.log('Budget form initialized successfully');
} catch (error) {
    console.error('Error initializing budget form:', error);
    alert('Erro ao inicializar o formulário. Por favor, recarregue a página.');
}
});