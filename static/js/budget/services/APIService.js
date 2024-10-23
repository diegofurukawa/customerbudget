// services/APIService.js
export class APIService {
    static async fetchMaterialPrice(materialId) {
        try {
            const response = await fetch(`/materials/${materialId}/current-price/`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching material price:', error);
            throw error;
        }
    }

    static async searchCustomers(term) {
        try {
            const response = await fetch(`/customers/search/?term=${encodeURIComponent(term)}`);
            if (!response.ok) throw new Error('Erro na busca de clientes');
            return await response.json();
        } catch (error) {
            console.error('Error searching customers:', error);
            throw error;
        }
    }

    static async submitBudget(formData) {
        try {
            const response = await fetch('/budgets/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': formData.get('csrfmiddlewaretoken')
                }
            });

            if (response.headers.get('content-type')?.includes('text/html')) {
                throw new Error('O servidor retornou uma página de erro');
            }

            return await response.json();
        } catch (error) {
            console.error('Error submitting budget:', error);
            throw error;
        }
    }
}