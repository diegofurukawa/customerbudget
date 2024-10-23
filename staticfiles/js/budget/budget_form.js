// static/js/budget/budget_form.js
import { SELECTORS } from './constants.js';
import { CustomerSearch } from './components/CustomerSearch.js';
import { ItemsTable } from './components/ItemsTable.js';
import { APIService } from './services/APIService.js';
import { UIHelper } from './utils/UIHelper.js';
import { BudgetCalculator } from './utils/Calculator.js';

class BudgetForm {
    constructor() {
        this.initializeForm();
        this.initializeComponents();
    }

    initializeForm() {
        this.form = document.querySelector(SELECTORS.FORM);
        if (!this.form) {
            throw new Error('Formulário não encontrado');
        }

        // Inicializa o status do orçamento
        const statusInput = document.getElementById(SELECTORS.STATUS_INPUT);
        if (statusInput && !statusInput.value) {
            statusInput.value = 'CREATED';
        }

        // Event listeners principais
        this.form.addEventListener('submit', e => this.handleSubmit(e));
        this.setupValidation();
    }

    initializeComponents() {
        try {
            // Inicializa a tabela de itens
            this.itemsTable = new ItemsTable('items', {
                onItemAdded: () => this.validateForm(),
                onItemRemoved: () => this.validateForm(),
                onTotalsUpdated: totals => this.handleTotalsUpdate(totals)
            });

            // Inicializa a busca de clientes
            this.customerSearch = new CustomerSearch(this.handleCustomerSelection.bind(this));

            console.log('Componentes inicializados com sucesso');
        } catch (error) {
            console.error('Erro ao inicializar componentes:', error);
            throw error;
        }
    }

    setupValidation() {
        // Validação em tempo real dos campos principais
        const validateInputs = () => this.validateForm();
        
        ['material_select', 'quantity_input'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', validateInputs);
                element.addEventListener('input', validateInputs);
            }
        });
    }

    handleCustomerSelection(customerData) {
        console.log('Cliente selecionado:', customerData);

        // Atualiza o input hidden do cliente
        const customerIdInput = document.getElementById(SELECTORS.CUSTOMER_ID_INPUT);
        if (customerIdInput) {
            customerIdInput.value = customerData.id;
        }

        // Atualiza as informações exibidas
        const elements = {
            [SELECTORS.SELECTED_CUSTOMER_NAME]: customerData.name,
            [SELECTORS.SELECTED_CUSTOMER_PHONE]: customerData.phone,
            [SELECTORS.SELECTED_CUSTOMER_DOCUMENT]: customerData.document
        };

        Object.entries(elements).forEach(([selector, value]) => {
            const element = document.getElementById(selector);
            if (element) {
                element.textContent = value || '';
            }
        });

        // Atualiza o estado do formulário
        this.validateForm();

        // Exibe feedback visual
        UIHelper.showSuccess(`Cliente ${customerData.name} selecionado com sucesso`);
    }

    handleTotalsUpdate(totals) {
        // Atualiza os campos de totais visíveis
        const updateTotal = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = UIHelper.formatCurrency(value);
            }
        };

        updateTotal('subtotal', totals.value);
        updateTotal('tax_total', totals.taxValue);
        updateTotal('grand_total', totals.valueTotal);

        // Atualiza os inputs hidden
        const updateHiddenInput = (id, value) => {
            const input = document.getElementById(id);
            if (input) {
                input.value = value.toFixed(2);
            }
        };

        updateHiddenInput('budget_value', totals.value);
        updateHiddenInput('budget_tax_value', totals.taxValue);
        updateHiddenInput('budget_value_total', totals.valueTotal);
    }

    validateForm() {
        let isValid = true;
        const errors = [];

        // Validação do cliente
        const customerIdInput = document.getElementById(SELECTORS.CUSTOMER_ID_INPUT);
        if (!customerIdInput?.value) {
            errors.push('Selecione um cliente');
            isValid = false;
        }

        // Validação dos itens
        if (!this.itemsTable?.validate()) {
            errors.push('Verifique os itens do orçamento');
            isValid = false;
        }

        // Atualiza estado dos botões e campos
        const submitButton = this.form.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = !isValid;
        }

        // Limpa erros anteriores e exibe novos se houver
        UIHelper.clearFormErrors(this.form);
        if (errors.length > 0) {
            UIHelper.displayFormErrors(this.form, { general: errors });
        }

        return isValid;
    }

    async handleSubmit(event) {
        event.preventDefault();

        try {
            if (!this.validateForm()) {
                return;
            }

            const formData = new FormData(this.form);
            
            // Adiciona o status se não estiver presente
            if (!formData.get('status')) {
                formData.append('status', 'CREATED');
            }

            // Exibe indicador de carregamento
            UIHelper.showLoading('Salvando orçamento...');

            const response = await APIService.submitBudget(formData);

            if (response.success) {
                UIHelper.showSuccess('Orçamento salvo com sucesso!');
                // Redireciona após um breve delay para mostrar a mensagem de sucesso
                setTimeout(() => {
                    window.location.href = '/budgets/';
                }, 1000);
            } else {
                throw new Error(response.error || 'Erro ao salvar orçamento');
            }
        } catch (error) {
            console.error('Erro ao salvar orçamento:', error);
            UIHelper.showError('Erro ao salvar orçamento', error);
            
            if (error.errors) {
                UIHelper.displayFormErrors(this.form, error.errors);
            }
        } finally {
            UIHelper.hideLoading();
        }
    }

    reset() {
        // Limpa o formulário
        this.form.reset();

        // Reseta componentes
        this.itemsTable?.reset();
        
        // Limpa as informações do cliente
        const elements = [
            SELECTORS.SELECTED_CUSTOMER_NAME,
            SELECTORS.SELECTED_CUSTOMER_PHONE,
            SELECTORS.SELECTED_CUSTOMER_DOCUMENT,
            SELECTORS.CUSTOMER_ID_INPUT
        ];

        elements.forEach(selector => {
            const element = document.getElementById(selector);
            if (element) {
                if (element.tagName === 'INPUT') {
                    element.value = '';
                } else {
                    element.textContent = '';
                }
            }
        });

        // Reseta validação
        this.validateForm();
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.budgetForm = new BudgetForm();
        console.log('Formulário de orçamento inicializado com sucesso');
    } catch (error) {
        console.error('Erro ao inicializar formulário:', error);
        UIHelper.showError('Erro ao inicializar o formulário. Por favor, recarregue a página.', error);
    }
});

// Exporta a classe para uso externo se necessário
export default BudgetForm;