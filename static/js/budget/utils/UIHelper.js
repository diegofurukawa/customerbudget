// utils/UIHelper.js

// Versão com módulos ES6
export const UIHelper = {
    showLoading(message = 'Carregando...') {
        // Remove loading existente se houver
        this.hideLoading();

        // Cria o elemento de loading
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-overlay';
        loadingDiv.innerHTML = `
            <div class="loading-content">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Carregando...</span>
                </div>
                <div class="loading-message mt-2">${message}</div>
            </div>
        `;

        document.body.appendChild(loadingDiv);
        this.loadingElement = loadingDiv;
    },

    hideLoading() {
        if (this.loadingElement) {
            this.loadingElement.remove();
            this.loadingElement = null;
        }
    },

    showSuccess(message) {
        this.showAlert(message, 'success');
    },

    showError(message, error = null) {
        let fullMessage = message;
        if (error) {
            fullMessage += error.message ? `<br>${error.message}` : '<br>Ocorreu um erro inesperado';
        }
        this.showAlert(fullMessage, 'danger');
    },

    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        let container = document.querySelector('.messages');
        if (!container) {
            container = document.createElement('div');
            container.className = 'messages';
            document.body.insertBefore(container, document.body.firstChild);
        }

        container.insertBefore(alertDiv, container.firstChild);

        setTimeout(() => alertDiv.remove(), 5000);
    },

    clearFormErrors(form) {
        if (!form) return;
        
        form.querySelectorAll('.is-invalid').forEach(element => {
            element.classList.remove('is-invalid');
        });
        
        form.querySelectorAll('.invalid-feedback').forEach(element => {
            element.remove();
        });
    },

    displayFormErrors(form, errors) {
        this.clearFormErrors(form);
        
        Object.entries(errors).forEach(([field, messages]) => {
            const inputElement = form.querySelector(`[name="${field}"]`);
            if (inputElement) {
                inputElement.classList.add('is-invalid');
                
                const errorDiv = document.createElement('div');
                errorDiv.className = 'invalid-feedback';
                errorDiv.textContent = Array.isArray(messages) ? messages.join(', ') : messages;
                
                inputElement.parentNode.appendChild(errorDiv);
            }
        });
    },

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }
};

// Versão sem módulos ES6 (alternativa)
// window.UIHelper = UIHelper;