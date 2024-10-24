// components/ItemsTable.js
import { SELECTORS } from '../constants.js';
import { APIService } from '../services/APIService.js';
import { BudgetCalculator } from '../utils/Calculator.js';
import { UIHelper } from '/static/js/budget/utils/UIHelper.js';

export class ItemsTable {
    constructor(formsetPrefix, callbacks = {}) {
        this.formsetPrefix = formsetPrefix;
        this.callbacks = callbacks;
        this.totalForms = document.getElementById(SELECTORS.TOTAL_FORMS(formsetPrefix));
        this.table = document.getElementById(SELECTORS.ITEMS_TABLE);
        this.tbody = this.table?.querySelector('tbody');
        this.isValidationEnabled = false;
        
        if (!this.totalForms || !this.table || !this.tbody) {
            throw new Error('Elementos necessários da tabela não encontrados');
        }

        this.removeEmptyInitialRows();
        this.initializeEventListeners();
    }

    removeEmptyInitialRows() {
        const rows = this.tbody.querySelectorAll('tr');
        rows.forEach(row => {
            const materialInput = row.querySelector(`input[name$="-material"]`);
            const quantityInput = row.querySelector(`input[name$="-quantity"]`);
            
            if (!materialInput?.value || !quantityInput?.value) {
                row.remove();
            }
        });

        this.updateFormIndexes();
    }

    initializeEventListeners() {
        document.getElementById(SELECTORS.ADD_ITEM_BTN)?.addEventListener('click', 
            () => this.handleAddItem());

        this.table.addEventListener('click', e => {
            if (e.target.matches('.remove-item')) {
                this.handleRemoveItem(e.target);
            }
        });

        this.table.addEventListener('change', e => {
            if (e.target.matches('.quantity-input')) {
                this.handleQuantityChange(e.target);
            }
        });

        document.getElementById(SELECTORS.MATERIAL_SELECT)?.addEventListener('change', 
            () => this.validateAddItemForm());
        document.getElementById(SELECTORS.QUANTITY_INPUT)?.addEventListener('input', 
            () => this.validateAddItemForm());
    }

    async handleAddItem() {
        try {
            const materialSelect = document.getElementById(SELECTORS.MATERIAL_SELECT);
            const quantityInput = document.getElementById(SELECTORS.QUANTITY_INPUT);
            
            if (!this.validateAddItemInputs(materialSelect, quantityInput)) {
                return;
            }

            const materialId = materialSelect.value;
            const materialName = materialSelect.options[materialSelect.selectedIndex].text;
            const quantity = parseFloat(quantityInput.value);

            const priceData = await APIService.fetchMaterialPrice(materialId);
            
            if (!priceData.success) {
                throw new Error(priceData.error || 'Erro ao obter preço do material');
            }

            this.addItemToTable(materialId, materialName, quantity, priceData);
            this.resetAddItemForm(materialSelect, quantityInput);
            this.updateTotals();

            if (this.callbacks.onItemAdded) {
                this.callbacks.onItemAdded();
            }

        } catch (error) {
            UIHelper.showError('Erro ao adicionar item', error);
        }
    }

    addItemToTable(materialId, materialName, quantity, priceData) {
        const newIndex = parseInt(this.totalForms.value);
        const { value, tax_value: taxValue, value_total: valueTotal } = priceData;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <input type="hidden" name="${this.formsetPrefix}-${newIndex}-material" value="${materialId}">
                <input type="hidden" name="${this.formsetPrefix}-${newIndex}-id" value="">
                <input type="hidden" name="${this.formsetPrefix}-${newIndex}-value" value="${value}">
                <input type="hidden" name="${this.formsetPrefix}-${newIndex}-tax_value" value="${taxValue}">
                <input type="hidden" name="${this.formsetPrefix}-${newIndex}-value_total" value="${valueTotal}">
                ${materialName}
            </td>
            <td>
                <input type="number" name="${this.formsetPrefix}-${newIndex}-quantity" 
                       value="${quantity}" step="0.01" min="0.01" class="form-control quantity-input">
            </td>
            <td class="text-end">R$ ${value.toFixed(2)}</td>
            <td class="text-end">R$ ${taxValue.toFixed(2)}</td>
            <td class="text-end">R$ ${(valueTotal * quantity).toFixed(2)}</td>
            <td>
                <button type="button" class="btn btn-danger btn-sm remove-item">Remover</button>
            </td>
        `;

        this.tbody.appendChild(row);
        this.totalForms.value = newIndex + 1;
    }

    handleRemoveItem(button) {
        const row = button.closest('tr');
        row.remove();
        this.updateFormIndexes();
        this.updateTotals();

        if (this.callbacks.onItemRemoved) {
            this.callbacks.onItemRemoved();
        }
    }

    handleQuantityChange(input) {
        const row = input.closest('tr');
        const quantity = parseFloat(input.value) || 0;
        const value = parseFloat(row.querySelector('input[name$="-value"]').value) || 0;
        const taxValue = parseFloat(row.querySelector('input[name$="-tax_value"]').value) || 0;
        
        const totalValue = quantity * (value + taxValue);
        row.querySelector('input[name$="-value_total"]').value = totalValue;
        
        // Atualiza o valor total exibido na linha
        row.querySelector('td:nth-last-child(2)').textContent = `R$ ${totalValue.toFixed(2)}`;
        
        this.updateTotals();
    }

    updateFormIndexes() {
        const rows = this.tbody.querySelectorAll('tr');
        rows.forEach((row, index) => {
            row.querySelectorAll('input').forEach(input => {
                const name = input.getAttribute('name');
                if (name) {
                    const newName = name.replace(/-\d+-/, `-${index}-`);
                    input.setAttribute('name', newName);
                }
            });
        });
        this.totalForms.value = rows.length;
    }

    updateTotals() {
        const totals = {
            value: 0,
            taxValue: 0,
            valueTotal: 0
        };

        this.tbody.querySelectorAll('tr').forEach(row => {
            const quantity = parseFloat(row.querySelector('input[name$="-quantity"]').value) || 0;
            const value = parseFloat(row.querySelector('input[name$="-value"]').value) || 0;
            const taxValue = parseFloat(row.querySelector('input[name$="-tax_value"]').value) || 0;

            totals.value += quantity * value;
            totals.taxValue += quantity * taxValue;
            totals.valueTotal += quantity * (value + taxValue);
        });

        if (this.callbacks.onTotalsUpdated) {
            this.callbacks.onTotalsUpdated(totals);
        }
    }

    validateAddItemForm() {
        const materialSelect = document.getElementById(SELECTORS.MATERIAL_SELECT);
        const quantityInput = document.getElementById(SELECTORS.QUANTITY_INPUT);
        const addButton = document.getElementById(SELECTORS.ADD_ITEM_BTN);

        const isValid = this.validateAddItemInputs(materialSelect, quantityInput, false);
        if (addButton) {
            addButton.disabled = !isValid;
        }

        return isValid;
    }

    validateAddItemInputs(materialSelect, quantityInput, showErrors = true) {
        if (!materialSelect?.value) {
            if (showErrors && this.isValidationEnabled) {
                UIHelper.showError('Selecione um material');
            }
            return false;
        }

        const quantity = parseFloat(quantityInput?.value);
        if (!quantity || quantity <= 0) {
            if (showErrors && this.isValidationEnabled) {
                UIHelper.showError('Digite uma quantidade válida');
            }
            return false;
        }

        return true;
    }

    validate() {
        if (!this.isValidationEnabled) {
            return true;
        }

        const rows = this.tbody.querySelectorAll('tr');
        
        if (rows.length === 0) {
            return true;
        }

        let isValid = true;
        rows.forEach((row, index) => {
            const materialInput = row.querySelector(`input[name$="-material"]`);
            const quantityInput = row.querySelector(`input[name$="-quantity"]`);
            const valueInput = row.querySelector(`input[name$="-value"]`);

            const materialValue = materialInput?.value;
            const quantity = parseFloat(quantityInput?.value);
            const value = parseFloat(valueInput?.value);

            if (!materialValue || !quantity || quantity <= 0 || !value || value <= 0) {
                isValid = false;
                if (this.isValidationEnabled) {
                    UIHelper.showError(`Item ${index + 1} está com dados inválidos`);
                }
            }
        });

        return isValid;
    }

    resetAddItemForm(materialSelect, quantityInput) {
        if (materialSelect) materialSelect.value = '';
        if (quantityInput) quantityInput.value = '';
        this.validateAddItemForm();
    }

    getItems() {
        return Array.from(this.tbody.querySelectorAll('tr')).map(row => {
            const materialInput = row.querySelector('input[name$="-material"]');
            const quantityInput = row.querySelector('input[name$="-quantity"]');
            const valueInput = row.querySelector('input[name$="-value"]');
            const taxValueInput = row.querySelector('input[name$="-tax_value"]');
            const valueTotalInput = row.querySelector('input[name$="-value_total"]');

            return {
                material: materialInput?.value,
                quantity: parseFloat(quantityInput?.value) || 0,
                value: parseFloat(valueInput?.value) || 0,
                taxValue: parseFloat(taxValueInput?.value) || 0,
                valueTotal: parseFloat(valueTotalInput?.value) || 0
            };
        });
    }

    enableValidation() {
        this.isValidationEnabled = true;
    }

    disableValidation() {
        this.isValidationEnabled = false;
    }

    reset() {
        this.tbody.innerHTML = '';
        this.totalForms.value = '0';
        this.updateTotals();
        this.disableValidation();
    }
}