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

const BudgetFormCalculator = {
    calculateItemValues(quantity, value, taxValue) {
        const safeQuantity = parseFloat(quantity) || 0;
        const safeValue = parseFloat(value) || 0;
        const safeTaxValue = parseFloat(taxValue) || 0;

        const itemValue = safeQuantity * safeValue;
        const itemTaxValue = safeQuantity * safeTaxValue;
        const itemTotal = itemValue + itemTaxValue;
        
        return {
            itemValue,
            itemTaxValue,
            itemTotal
        };
    },

    getSafeValue(element, selector) {
        if (!element) return 0;
        const input = element.querySelector(selector);
        return input ? (parseFloat(input.value) || 0) : 0;
    },

    updateBudgetItemValues(row) {
        if (!row) return { quantity: 0, value: 0, taxValue: 0, valueTotal: 0 };

        const quantity = this.getSafeValue(row, '.quantity-input');
        const value = this.getSafeValue(row, 'input[name$="-value"]');
        const taxValue = this.getSafeValue(row, 'input[name$="-tax_value"]');
        
        const valueTotal = quantity * (value + taxValue);
        
        const valueTotalInput = row.querySelector('input[name$="-value_total"]');
        if (valueTotalInput) {
            valueTotalInput.value = valueTotal.toFixed(2);
        }
        
        return {
            quantity,
            value,
            taxValue,
            valueTotal
        };
    },

    calculateBudgetTotals(itemsTable) {
        let budgetTotals = {
            value: 0,
            taxValue: 0,
            valueTotal: 0
        };

        if (!itemsTable) return budgetTotals;

        const rows = itemsTable.querySelectorAll('tbody tr');
        if (!rows || rows.length === 0) return budgetTotals;

        rows.forEach(row => {
            if (!row) return;
            const itemValues = this.updateBudgetItemValues(row);
            budgetTotals.value += itemValues.quantity * itemValues.value;
            budgetTotals.taxValue += itemValues.quantity * itemValues.taxValue;
            budgetTotals.valueTotal += itemValues.valueTotal;
        });

        return budgetTotals;
    }
};

class BudgetForm {
    constructor(itemFormsetPrefix) {
        this.itemFormsetPrefix = itemFormsetPrefix;
        this.totalForms = document.getElementById(SELECTORS.TOTAL_FORMS(itemFormsetPrefix));
        this.errorHandler = {
            handleError: (message, error) => {
                console.error(message, error);
                alert(`${message}. ${error.message || 'Por favor, tente novamente.'}`);
            },
            showWarning: (message) => {
                alert(message);
            },
            showValidationError: (message) => {
                alert(message);
                return false;
            }
        };

        if (!this.validateRequiredElements()) {
            throw new Error('Elementos obrigatórios não encontrados');
        }
        this.initializeFormDefaults();
        this.initializeTable(); // Nova chamada para inicializar a tabela
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
        const statusInput = document.getElementById(SELECTORS.STATUS_INPUT);
        if (statusInput && !statusInput.value) {
            statusInput.value = 'CREATED';
        }

        const budgetValueInputs = ['budget_value', 'budget_tax_value', 'budget_value_total'];
        budgetValueInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input && !input.value) {
                input.value = '0.00';
            }
        });
    }

    // Novo método para inicializar a tabela
    initializeTable() {
        const itemsTable = document.getElementById(SELECTORS.ITEMS_TABLE);
        if (!itemsTable) return;

        // Remove a linha vazia inicial se existir
        const tbody = itemsTable.querySelector('tbody');
        if (tbody) {
            const emptyRows = tbody.querySelectorAll('tr').forEach(row => {
                const materialInput = row.querySelector('input[name*="-material"]');
                const quantityInput = row.querySelector('input[name*="-quantity"]');
                
                if (!materialInput?.value && (!quantityInput?.value || quantityInput.value === '0')) {
                    row.remove();
                }
            });
        }

        // Atualiza o contador de forms
        if (this.totalForms) {
            const actualRows = tbody.querySelectorAll('tr').length;
            this.totalForms.value = actualRows;
        }
    }

    initializeEventListeners() {
        document.getElementById(SELECTORS.ADD_ITEM_BTN)?.addEventListener('click', () => this.handleAddItem());

        document.addEventListener('click', (e) => {
            if (e.target.matches('.remove-item')) {
                this.handleRemoveItem(e.target);
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target.matches('.quantity-input')) {
                this.handleQuantityChange(e.target);
            }
        });

        document.getElementById(SELECTORS.MATERIAL_SELECT)?.addEventListener('change', () => this.validateForm());
        document.getElementById(SELECTORS.QUANTITY_INPUT)?.addEventListener('input', () => this.validateForm());
        this.initializeCustomerSearch();
        document.getElementById('budget-form')?.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    initializeTotals() {
        this.updateTotals();
    }

    validateForm() {
        const materialId = document.getElementById(SELECTORS.MATERIAL_SELECT)?.value;
        const quantity = parseFloat(document.getElementById(SELECTORS.QUANTITY_INPUT)?.value);
        const addButton = document.getElementById(SELECTORS.ADD_ITEM_BTN);
        
        if (addButton) {
            addButton.disabled = !materialId || !quantity || quantity <= 0;
        }
    }

    // Método de validação melhorado
    validateBudgetItems(items) {
        const validations = {
            material: {
                selector: 'input[name*="-material"]',
                validate: value => !!value,
                message: index => `Material do item ${index + 1} não foi selecionado`
            },
            quantity: {
                selector: 'input[name*="-quantity"]',
                validate: value => parseFloat(value) > 0,
                message: index => `Quantidade do item ${index + 1} deve ser maior que zero`
            },
            value: {
                selector: 'input[name$="-value"]',
                validate: value => parseFloat(value) > 0,
                message: index => `Valor do item ${index + 1} deve ser maior que zero`
            },
            valueTotal: {
                selector: 'input[name$="-value_total"]',
                validate: (value, row) => {
                    const quantity = parseFloat(row.querySelector('input[name*="-quantity"]').value) || 0;
                    const unitValue = parseFloat(row.querySelector('input[name$="-value"]').value) || 0;
                    const taxValue = parseFloat(row.querySelector('input[name$="-tax_value"]').value) || 0;
                    const expectedTotal = quantity * (unitValue + taxValue);
                    return Math.abs(parseFloat(value) - expectedTotal) < 0.01;
                },
                message: index => `Valor total do item ${index + 1} está inconsistente`
            }
        };

        let hasErrors = false;
        const errors = [];
        let validItemCount = 0;

        items.forEach((row, index) => {
            // Verifica se a linha está vazia
            const materialInput = row.querySelector('input[name*="-material"]');
            const quantityInput = row.querySelector('input[name*="-quantity"]');
            
            // Pula a validação se for uma linha vazia
            if (!materialInput?.value && (!quantityInput?.value || quantityInput.value === '0')) {
                return; // Continua para a próxima iteração
            }

            validItemCount++;
            
            for (const [field, validation] of Object.entries(validations)) {
                const input = row.querySelector(validation.selector);
                if (!input || !validation.validate(input.value, row)) {
                    errors.push(validation.message(validItemCount));
                    hasErrors = true;
                    break;
                }
            }
        });

        // Verifica se há pelo menos um item válido
        if (validItemCount === 0) {
            this.showValidationErrors(['Por favor, adicione pelo menos um item ao orçamento']);
            return false;
        }

        if (hasErrors) {
            this.showValidationErrors(errors);
            return false;
        }

        return true;
    }

    showValidationErrors(errors) {
        const errorMessage = errors.join('\n');
        alert('Por favor, corrija os seguintes erros:\n\n' + errorMessage);
    }

    validateBudgetForm() {
        const customerIdInput = document.getElementById(SELECTORS.CUSTOMER_ID_INPUT);
        if (!customerIdInput || !customerIdInput.value) {
            this.showValidationErrors(['Por favor, selecione um cliente']);
            return false;
        }

        const itemsTable = document.getElementById(SELECTORS.ITEMS_TABLE);
        if (!itemsTable) {
            this.showValidationErrors(['Tabela de itens não encontrada']);
            return false;
        }

        const items = itemsTable.querySelectorAll('tbody tr');
        return this.validateBudgetItems(items);
    }

    async handleAddItem() {
        try {
            const materialSelect = document.getElementById(SELECTORS.MATERIAL_SELECT);
            const materialId = materialSelect?.value;
            const materialName = materialSelect?.options[materialSelect.selectedIndex]?.text;
            const quantityInput = document.getElementById(SELECTORS.QUANTITY_INPUT);
            const quantity = quantityInput ? parseFloat(quantityInput.value) : 0;

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
            this.errorHandler.handleError('Erro ao adicionar item', error);
        }
    }

    validateItemInput(materialId, quantity) {
        if (!materialId) {
            this.errorHandler.showWarning("Por favor, selecione um material.");
            return false;
        }
        if (!quantity || quantity <= 0) {
            this.errorHandler.showWarning("Por favor, insira uma quantidade válida maior que zero.");
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

    // Método addItemToTable modificado para prevenir linhas vazias
    addItemToTable(materialId, materialName, quantity, priceData) {
        if (!materialId || !quantity) {
            console.warn('Tentativa de adicionar item sem material ou quantidade');
            return;
        }

        const newIndex = parseInt(this.totalForms.value);
        const values = BudgetFormCalculator.calculateItemValues(
            quantity,
            parseFloat(priceData.value),
            parseFloat(priceData.tax_value)
        );
        
        const template = this.createItemTemplate(materialId, materialName, quantity, priceData, values, newIndex);
        const tbody = document.querySelector(`#${SELECTORS.ITEMS_TABLE} tbody`);
        tbody.insertAdjacentHTML('beforeend', template);
        
        this.totalForms.value = newIndex + 1;
        this.updateTotals();
    }

    createItemTemplate(materialId, materialName, quantity, priceData, values, newIndex) {
        return `
            <tr>
                <td>
                    <input type="hidden" name="${this.itemFormsetPrefix}-${newIndex}-material" value="${materialId}">
                    <input type="hidden" name="${this.itemFormsetPrefix}-${newIndex}-id" value="">
                    <input type="hidden" name="${this.itemFormsetPrefix}-${newIndex}-value" value="${priceData.value}">
                    <input type="hidden" name="${this.itemFormsetPrefix}-${newIndex}-tax_value" value="${priceData.tax_value}">
                    <input type="hidden" name="${this.itemFormsetPrefix}-${newIndex}-value_total" value="${values.itemTotal}">
                    ${materialName}
                </td>
                <td>
                    <input type="number" name="${this.itemFormsetPrefix}-${newIndex}-quantity" 
                           value="${quantity}" step="0.01" min="0.01" class="form-control quantity-input">
                </td>
                <td class="text-end">R$ <span class="item-value">${parseFloat(priceData.value).toFixed(2)}</span></td>
                <td class="text-end">R$ <span class="item-tax">${parseFloat(priceData.tax_value).toFixed(2)}</span></td>
                <td class="text-end">R$ <span class="item-total">${values.itemTotal.toFixed(2)}</span></td>
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
        if (!row) return;

        const quantity = parseFloat(input.value) || 0;
        const valueInput = row.querySelector('input[name$="-value"]');
        const taxValueInput = row.querySelector('input[name$="-tax_value"]');
        const valueTotalInput = row.querySelector('input[name$="-value_total"]');
        const itemTotalSpan = row.querySelector('.item-total');
        
        if (!valueInput || !taxValueInput || !valueTotalInput || !itemTotalSpan) return;

        const value = parseFloat(valueInput.value) || 0;
        const taxValue = parseFloat(taxValueInput.value) || 0;
        
        const values = BudgetFormCalculator.calculateItemValues(quantity, value, taxValue);
        
        valueTotalInput.value = values.itemTotal.toFixed(2);
        itemTotalSpan.textContent = values.itemTotal.toFixed(2);
        
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
        const itemsTable = document.getElementById(SELECTORS.ITEMS_TABLE);
        if (!itemsTable) return;

        const totals = BudgetFormCalculator.calculateBudgetTotals(itemsTable);
        this.updateTotalDisplays(totals.value, totals.taxValue, totals.valueTotal);
    }

    updateTotalDisplays(subtotal, taxTotal, grandTotal) {
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (!element) return;

            if (element.tagName === 'INPUT') {
                element.value = value.toFixed(2);
            } else {
                element.textContent = value.toFixed(2);
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
        const searchTerm = document.getElementById(SELECTORS.CUSTOMER_SEARCH)?.value;
        if (!searchTerm) {
            this.errorHandler.showWarning('Por favor, digite um termo para pesquisa');
            return;
        }

        try {
            const response = await fetch(`/customers/search/?term=${encodeURIComponent(searchTerm)}`);
            if (!response.ok) throw new Error('Erro na busca');
            
            const data = await response.json();
            this.renderCustomerResults(data);
        } catch (error) {
            this.errorHandler.handleError('Erro ao pesquisar clientes', error);
        }
    }

    renderCustomerResults(customers) {
        const customerList = document.getElementById(SELECTORS.CUSTOMER_LIST);
        if (!customerList) return;
        
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
        if (!customerElement) return;

        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value || '';
        };

        updateElement(SELECTORS.SELECTED_CUSTOMER_NAME, customerElement.dataset.name);
        updateElement(SELECTORS.SELECTED_CUSTOMER_PHONE, customerElement.dataset.phone);
        updateElement(SELECTORS.SELECTED_CUSTOMER_DOCUMENT, customerElement.dataset.document);

        const customerIdInput = document.getElementById(SELECTORS.CUSTOMER_ID_INPUT);
        if (customerIdInput) customerIdInput.value = customerElement.dataset.id;

        const customerResults = document.getElementById(SELECTORS.CUSTOMER_RESULTS);
        const customerSearch = document.getElementById(SELECTORS.CUSTOMER_SEARCH);
        
        if (customerResults) customerResults.style.display = 'none';
        if (customerSearch) customerSearch.value = '';
    }

    async updateFormValuesBeforeSubmit(form) {
        if (!form) {
            throw new Error('Formulário não encontrado');
        }

        const itemsTable = document.getElementById(SELECTORS.ITEMS_TABLE);
        if (!itemsTable) {
            throw new Error('Tabela de itens não encontrada');
        }

        const rows = itemsTable.querySelectorAll('tbody tr');
        if (!rows || rows.length === 0) {
            throw new Error('Nenhum item encontrado no orçamento');
        }

        rows.forEach((row, index) => {
            if (!row) return;

            const quantityInput = row.querySelector('input[name*="-quantity"]');
            const valueInput = row.querySelector('input[name*="-value"]:not([name*="-tax_value"]):not([name*="-value_total"])');
            const taxValueInput = row.querySelector('input[name*="-tax_value"]');
            const valueTotalInput = row.querySelector('input[name*="-value_total"]');

            if (!quantityInput || !valueInput || !taxValueInput || !valueTotalInput) {
                console.warn(`Campos incompletos para o item ${index + 1}`, {
                    quantity: quantityInput?.name,
                    value: valueInput?.name,
                    taxValue: taxValueInput?.name,
                    valueTotal: valueTotalInput?.name
                });
                return;
            }

            const quantity = parseFloat(quantityInput.value) || 0;
            const value = parseFloat(valueInput.value) || 0;
            const taxValue = parseFloat(taxValueInput.value) || 0;
            const itemTotal = quantity * (value + taxValue);

            valueTotalInput.value = itemTotal.toFixed(2);
        });

        const totals = BudgetFormCalculator.calculateBudgetTotals(itemsTable);
        
        const budgetFields = {
            'budget_value': totals.value,
            'budget_tax_value': totals.taxValue,
            'budget_value_total': totals.valueTotal
        };

        Object.entries(budgetFields).forEach(([fieldId, value]) => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = value.toFixed(2);
            }
        });
    }

    async handleSubmit(event) {
        event.preventDefault();
        
        try {
            if (!this.validateBudgetForm()) {
                return;
            }

            const statusInput = document.getElementById(SELECTORS.STATUS_INPUT);
            if (statusInput && !statusInput.value) {
                statusInput.value = 'CREATED';
            }

            await this.updateFormValuesBeforeSubmit(event.target);
            const formData = new FormData(event.target);
            
            const csrfToken = formData.get('csrfmiddlewaretoken');
            if (!csrfToken) {
                throw new Error('Token CSRF não encontrado');
            }

            const response = await fetch(event.target.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': csrfToken
                }
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                window.location.href = '/budgets/';
            } else {
                throw new Error(result.error || 'Erro ao salvar orçamento');
            }
        } catch (error) {
            this.errorHandler.handleError('Erro ao salvar orçamento', error);
        }
    }

    resetInputs(materialSelect) {
        if (materialSelect) materialSelect.value = '';
        const quantityInput = document.getElementById(SELECTORS.QUANTITY_INPUT);
        if (quantityInput) quantityInput.value = '';
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