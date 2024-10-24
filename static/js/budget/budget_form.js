// static/js/budget/budget_form.js
import { SELECTORS } from './constants.js';
import { CustomerSearch } from './components/CustomerSearch.js';
import { ItemsTable } from './components/ItemsTable.js';
import { APIService } from './services/APIService.js';
import { UIHelper } from '/static/js/budget/utils/UIHelper.js';
import { BudgetCalculator } from './utils/Calculator.js';

class BudgetForm {
    constructor() {
        this.initializeForm();
        this.initializeComponents();
        this.isSubmitting = false;
        this.setupEventListeners();
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
    }

    initializeComponents() {
        try {
            // Inicializa a tabela de itens
            this.itemsTable = new ItemsTable('items', {
                onItemAdded: () => this.handleItemChange(),
                onItemRemoved: () => this.handleItemChange(),
                onTotalsUpdated: totals => this.handleTotalsUpdate(totals)
            });

            // Inicializa a busca de clientes
            this.customerSearch = new CustomerSearch(this.handleCustomerSelection.bind(this));

            console.log('Componentes inicializados com sucesso');
        } catch (error) {
            console.error('Erro ao inicializar componentes:', error);
            UIHelper.showError('Erro ao inicializar componentes do formulário', error);
        }
    }

    setupEventListeners() {
        // Event listener para submissão do formulário
        this.form.addEventListener('submit', e => this.handleSubmit(e));

        // Event listener para cancelamento
        const cancelButton = this.form.querySelector('.btn-secondary');
        if (cancelButton) {
            cancelButton.addEventListener('click', () => this.handleCancel());
        }

        // Event listeners para campos que afetam a validação
        const customerInput = document.getElementById(SELECTORS.CUSTOMER_ID_INPUT);
        if (customerInput) {
            customerInput.addEventListener('change', () => this.validateForm());
        }
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

        UIHelper.showSuccess(`Cliente ${customerData.name} selecionado com sucesso`);
        document.querySelector('.customer-info').style.display = 'block';
    }

    handleItemChange() {
        if (this.isSubmitting) {
            this.validateForm();
        }
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
        const updateHiddenInput = (name, value) => {
            let input = this.form.querySelector(`input[name="${name}"]`);
            if (!input) {
                input = document.createElement('input');
                input.type = 'hidden';
                input.name = name;
                this.form.appendChild(input);
            }
            input.value = value.toFixed(2);
        };

        updateHiddenInput('value', totals.value);
        updateHiddenInput('tax_value', totals.taxValue);
        updateHiddenInput('value_total', totals.valueTotal);
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

        // Validação dos itens apenas durante a submissão
        if (this.isSubmitting && this.itemsTable) {
            const items = this.itemsTable.getItems();
            if (items.length === 0) {
                errors.push('Adicione pelo menos um item ao orçamento');
                isValid = false;
            }
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
        this.isSubmitting = true;

        try {
            if (!this.validateForm()) {
                return;
            }

            // Habilita validação da tabela de itens
            if (this.itemsTable) {
                this.itemsTable.enableValidation();
                
                const items = this.itemsTable.getItems();
                if (items.length === 0) {
                    UIHelper.showError('Adicione pelo menos um item ao orçamento');
                    return;
                }
            }

            UIHelper.showLoading('Salvando orçamento...');
            const formData = new FormData(this.form);
            const response = await APIService.submitBudget(formData);

            if (response.success) {
                UIHelper.showSuccess('Orçamento salvo com sucesso!');
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
            this.isSubmitting = false;
            if (this.itemsTable) {
                this.itemsTable.disableValidation();
            }
        }
    }

    handleCancel() {
        if (confirm('Tem certeza que deseja cancelar? Todas as alterações serão perdidas.')) {
            window.location.href = '/budgets/';
        }
    }

    reset() {
        // Limpa o formulário
        this.form.reset();

        // Reseta os componentes
        if (this.itemsTable) {
            this.itemsTable.reset();
        }
        
        // Limpa as informações do cliente
        const elements = [
            SELECTORS.SELECTED_CUSTOMER_NAME,
            SELECTORS.SELECTED_CUSTOMER_PHONE,
            SELECTORS.SELECTED_CUSTOMER_DOCUMENT
        ];

        elements.forEach(selector => {
            const element = document.getElementById(selector);
            if (element) {
                element.textContent = '';
            }
        });

        // Limpa o input hidden do cliente
        const customerIdInput = document.getElementById(SELECTORS.CUSTOMER_ID_INPUT);
        if (customerIdInput) {
            customerIdInput.value = '';
        }

        // Esconde a seção de informações do cliente
        const customerInfo = document.querySelector('.customer-info');
        if (customerInfo) {
            customerInfo.style.display = 'none';
        }

        // Reseta os totais
        this.handleTotalsUpdate({
            value: 0,
            taxValue: 0,
            valueTotal: 0
        });

        // Reseta a validação
        this.isSubmitting = false;
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

export default BudgetForm;