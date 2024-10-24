export class APIService {
    static async submitBudget(formData) {
        try {
            const response = await fetch('/api/budgets/save/', {  // URL atualizada
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': this.getCsrfToken()
                }
            });

            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Erro ao salvar orçamento');
                } else {
                    throw new Error('Erro ao salvar orçamento');
                }
            }

            return await response.json();
        } catch (error) {
            console.error('Error submitting budget:', error);
            throw error;
        }
    }

    static async fetchMaterialPrice(materialId) {
        try {
            const response = await fetch(`/api/materials/${materialId}/price/`);
            if (!response.ok) throw new Error('Erro ao obter preço do material');
            return await response.json();
        } catch (error) {
            console.error('Error fetching material price:', error);
            throw error;
        }
    }

    static async searchCustomers(term) {
        try {
            const response = await fetch(`/api/customers/search/?term=${encodeURIComponent(term)}`);
            if (!response.ok) throw new Error('Erro na busca de clientes');
            return await response.json();
        } catch (error) {
            console.error('Error searching customers:', error);
            throw error;
        }
    }

    static getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
    }
}