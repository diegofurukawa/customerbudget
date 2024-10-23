// components/ItemsTable.js
import { SELECTORS } from '../constants.js';
import { APIService } from '../services/APIService.js';
import { BudgetCalculator } from '../utils/Calculator.js';
import { UIHelper } from '../utils/UIHelper.js';

export class ItemsTable {
    constructor(formsetPrefix, callbacks = {}) {
        this.formsetPrefix = formsetPrefix;
        this.callbacks = callbacks;
        this.totalForms = document.getElementById(SELECTORS.TOTAL_FORMS(formsetPrefix));
        this.table = document.getElementById(SELECTORS.ITEMS_TABLE);
        this.tbody = this.table?.querySelector('tbody');
        
        if (!this.totalForms || !this.table || !this.tbody) {
            throw new Error('Elementos necessários da tabela não encontrados');
        }

        // Remove qualquer linha vazia inicial
        this.removeEmptyInitialRows();
        this.initializeEventListeners();
    }

    removeEmptyInitialRows() {
        const rows = this.tbody.querySelectorAll('tr');
        rows.forEach(row => {
            const materialInput = row.querySelector(`input[name$="-material"]`);
            const quantityInput = row.querySelector(`input[name$="-quantity"]`);
            
            // Se não tem material ou quantidade, remove a linha
            if (!materialInput?.value || !quantityInput?.value) {
                row.remove();
            }
        });

        // Atualiza o contador de forms
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

        // Validação em tempo real
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

            // Notifica sobre adição de item
            if (this.callbacks.onItemAdded) {
                this.callbacks.onItemAdded();
            }

        } catch (error) {
            UIHelper.showError('Erro ao adicionar item', error);
        }
    }

    validate() {
        const rows = this.tbody.querySelectorAll('tr');
        
        // Verifica se há itens
        if (rows.length === 0) {
            UIHelper.showError('Adicione pelo menos um item ao orçamento');
            return false;
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
                UIHelper.showError(`Item ${index + 1} está com dados inválidos`);
            }
        });

        return isValid;
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

    handleRemoveItem(button) {
        const row = button.closest('tr');
        row.remove();
        this.updateFormIndexes();
        this.updateTotals();

        // Notifica sobre remoção de item
        if (this.callbacks.onItemRemoved) {
            this.callbacks.onItemRemoved();
        }
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

    reset() {
        // Limpa todas as linhas
        this.tbody.innerHTML = '';
        
        // Reseta o contador de forms
        this.totalForms.value = '0';
        
        // Atualiza totais
        this.updateTotals();
    }
}