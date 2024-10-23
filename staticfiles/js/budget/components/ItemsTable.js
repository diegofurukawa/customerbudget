// components/ItemsTable.js
import { SELECTORS } from '../constants.js';
import { APIService } from '../services/APIService.js';
import { BudgetCalculator } from '../utils/Calculator.js';
import { UIHelper } from '../utils/UIHelper.js';


export class ItemsTable {
    constructor(formsetPrefix) {
        this.formsetPrefix = formsetPrefix;
        this.totalForms = document.getElementById(SELECTORS.TOTAL_FORMS(formsetPrefix));
        this.table = document.getElementById(SELECTORS.ITEMS_TABLE);
        this.tbody = this.table?.querySelector('tbody');
        
        if (!this.totalForms || !this.table || !this.tbody) {
            throw new Error('Elementos necessários da tabela não encontrados');
        }

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Adicionar Item
        document.getElementById(SELECTORS.ADD_ITEM_BTN)?.addEventListener('click', 
            () => this.handleAddItem());

        // Remover Item
        this.table.addEventListener('click', e => {
            if (e.target.matches('.remove-item')) {
                this.handleRemoveItem(e.target);
            }
        });

        // Alteração de Quantidade
        this.table.addEventListener('change', e => {
            if (e.target.matches('.quantity-input')) {
                this.handleQuantityChange(e.target);
            }
        });

        // Validação do Material e Quantidade
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
            this.resetInputs(materialSelect, quantityInput);
            this.updateTotals();

        } catch (error) {
            UIHelper.showError('Erro ao adicionar item', error);
        }
    }

    validateAddItemInputs(materialSelect, quantityInput) {
        if (!materialSelect?.value) {
            UIHelper.showError('Selecione um material');
            return false;
        }

        const quantity = parseFloat(quantityInput?.value);
        if (!quantity || quantity <= 0) {
            UIHelper.showError('Digite uma quantidade válida');
            return false;
        }

        return true;
    }

    validateAddItemForm() {
        const materialSelect = document.getElementById(SELECTORS.MATERIAL_SELECT);
        const quantityInput = document.getElementById(SELECTORS.QUANTITY_INPUT);
        const addButton = document.getElementById(SELECTORS.ADD_ITEM_BTN);
        
        if (addButton) {
            const materialSelected = materialSelect?.value;
            const quantityValid = parseFloat(quantityInput?.value) > 0;
            addButton.disabled = !materialSelected || !quantityValid;
        }
    }

    addItemToTable(materialId, materialName, quantity, priceData) {
        const newIndex = parseInt(this.totalForms.value);
        const values = BudgetCalculator.calculateItemValues(
            quantity,
            parseFloat(priceData.value),
            parseFloat(priceData.tax_value)
        );
        
        const template = this.createItemTemplate(materialId, materialName, quantity, priceData, values, newIndex);
        this.tbody.insertAdjacentHTML('beforeend', template);
        
        this.totalForms.value = newIndex + 1;
        this.updateTotals();
    }

    createItemTemplate(materialId, materialName, quantity, priceData, values, newIndex) {
        return `
            <tr>
                <td>
                    <input type="hidden" name="${this.formsetPrefix}-${newIndex}-material" value="${materialId}">
                    <input type="hidden" name="${this.formsetPrefix}-${newIndex}-id" value="">
                    <input type="hidden" name="${this.formsetPrefix}-${newIndex}-value" value="${priceData.value}">
                    <input type="hidden" name="${this.formsetPrefix}-${newIndex}-tax_value" value="${priceData.tax_value}">
                    <input type="hidden" name="${this.formsetPrefix}-${newIndex}-value_total" value="${values.itemTotal}">
                    ${materialName}
                </td>
                <td>
                    <input type="number" name="${this.formsetPrefix}-${newIndex}-quantity" 
                           value="${quantity}" step="0.01" min="0.01" class="form-control quantity-input">
                </td>
                <td class="text-end">${UIHelper.formatCurrency(priceData.value)}</td>
                <td class="text-end">${UIHelper.formatCurrency(priceData.tax_value)}</td>
                <td class="text-end">${UIHelper.formatCurrency(values.itemTotal)}</td>
                <td>
                    <button type="button" class="btn btn-danger btn-sm remove-item">
                        <i class="fas fa-trash"></i> Remover
                    </button>
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
        const itemTotalCell = row.querySelector('td:nth-last-child(2)');
        
        if (!valueInput || !taxValueInput || !valueTotalInput || !itemTotalCell) return;

        const value = parseFloat(valueInput.value) || 0;
        const taxValue = parseFloat(taxValueInput.value) || 0;
        
        const values = BudgetCalculator.calculateItemValues(quantity, value, taxValue);
        
        valueTotalInput.value = values.itemTotal.toFixed(2);
        itemTotalCell.textContent = UIHelper.formatCurrency(values.itemTotal);
        
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
        const totals = BudgetCalculator.calculateBudgetTotals(this.tbody.querySelectorAll('tr'));
        
        // Atualiza os displays de totais
        ['subtotal', 'tax_total', 'grand_total'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                const value = id === 'subtotal' ? totals.value :
                            id === 'tax_total' ? totals.taxValue :
                            totals.valueTotal;
                element.textContent = UIHelper.formatCurrency(value);
            }
        });

        // Atualiza os campos hidden
        ['budget_value', 'budget_tax_value', 'budget_value_total'].forEach((id, index) => {
            const element = document.getElementById(id);
            if (element) {
                const value = index === 0 ? totals.value :
                            index === 1 ? totals.taxValue :
                            totals.valueTotal;
                element.value = value.toFixed(2);
            }
        });
    }

    resetInputs(materialSelect, quantityInput) {
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

    validate() {
        const items = this.getItems();
        if (items.length === 0) {
            UIHelper.showError('Adicione pelo menos um item ao orçamento');
            return false;
        }

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item.material || item.quantity <= 0 || item.value <= 0) {
                UIHelper.showError(`Item ${i + 1} está com dados inválidos`);
                return false;
            }
        }

        return true;
    }
}