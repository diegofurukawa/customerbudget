// utils/UIHelper.js
export class UIHelper {
    static showError(message, error = null) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show';
        alertDiv.innerHTML = `
            ${message}
            ${error ? `<br>${error.message}` : ''}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.querySelector('.messages') || document.body;
        container.insertBefore(alertDiv, container.firstChild);
        setTimeout(() => alertDiv.remove(), 5000);
    }

    static formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    static clearFormErrors(form) {
        form.querySelectorAll('.is-invalid').forEach(element => {
            element.classList.remove('is-invalid');
        });
        
        form.querySelectorAll('.invalid-feedback').forEach(element => {
            element.remove();
        });
    }

    static displayFormErrors(form, errors) {
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
    }
}
