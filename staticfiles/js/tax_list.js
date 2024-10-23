document.addEventListener('DOMContentLoaded', function() {
    // Funções auxiliares
    function $(id) {
        return document.getElementById(id);
    }

    function $$(selector) {
        return document.querySelectorAll(selector);
    }

    // Elementos DOM
    const elements = {
        searchInput: $('searchInput'),
        searchButton: $('searchButton'),
        taxTable: $('taxTable'),
        selectAll: $('selectAll'),
        editTaxBtn: $('editTaxBtn'),
        taxModalElement: $('taxModal'),
        taxForm: $('taxForm')
    };

    // Inicialização do Modal usando Bootstrap se disponível
    let taxModal;
    if (elements.taxModalElement) {
        try {
            taxModal = new bootstrap.Modal(elements.taxModalElement, {
                keyboard: false
            });
        } catch (error) {
            console.warn('Bootstrap Modal não está disponível, usando fallback:', error);
            // Fallback simples para modal
            taxModal = {
                show: () => elements.taxModalElement.style.display = 'block',
                hide: () => elements.taxModalElement.style.display = 'none'
            };
        }
    }

    function initializeSearchListeners() {
        console.log('Initializing search listeners');
        
        const searchInput = $('searchInput');
        const searchButton = $('searchButton');
    
        if (!searchInput || !searchButton) {
            console.error('Search elements not found during initialization:', {
                searchInput: !!searchInput,
                searchButton: !!searchButton
            });
            return;
        }
    
        searchButton.addEventListener('click', () => {
            console.log('Search button clicked');
            performSearch();
        });
    
        searchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                console.log('Enter key pressed in search input');
                performSearch();
            }
        });
    
        console.log('Search listeners initialized successfully');
    }
    
    function performSearch() {
        console.log('Performing search...');
        const searchInput = elements.searchInput;
        const taxTable = elements.taxTable;
        
        if (!searchInput || !taxTable) {
            console.warn('Search elements not found:', {
                searchInput: !!searchInput,
                taxTable: !!taxTable
            });
            return;
        }
    
        const searchTerm = searchInput.value.toLowerCase().trim();
        console.log('Search term:', searchTerm);
    
        // Seleciona apenas as linhas do tbody
        const rows = taxTable.querySelectorAll('tbody tr');
        console.log('Number of rows found:', rows.length);
    
        let found = false;
        rows.forEach(row => {
            // Pega todas as células exceto a primeira (checkbox) e a última (ações)
            const cells = Array.from(row.cells).slice(1, -1);
            const rowText = cells
                .map(cell => cell.textContent.toLowerCase().trim())
                .join(' ');
    
            const shouldShow = rowText.includes(searchTerm);
            row.style.display = shouldShow ? '' : 'none';
            if (shouldShow) found = true;
            
            console.log('Row text:', rowText, 'Visible:', shouldShow);
        });
    
        updateSearchFeedback(found);
        console.log('Search complete. Results found:', found);
    }

    function updateSearchFeedback(found) {
        // Remove feedback anterior se existir
        const existingFeedback = document.querySelector('.search-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }

        // Cria novo feedback
        const feedback = document.createElement('div');
        feedback.className = `alert alert-${found ? 'success' : 'warning'} search-feedback mt-2`;
        feedback.textContent = found ? 'Resultados encontrados.' : 'Nenhum resultado encontrado.';
        
        // Insere o feedback após o campo de busca
        const searchContainer = elements.searchInput.closest('.search-container');
        if (searchContainer) {
            searchContainer.appendChild(feedback);
            
            // Remove o feedback após 3 segundos
            setTimeout(() => feedback.remove(), 3000);
        }
    }

    if (elements.selectAll) {
        elements.selectAll.addEventListener('change', toggleSelectAll);
    }

    // Adiciona listeners para checkboxes de taxa existentes
    $$('.tax-select').forEach(checkbox => {
        checkbox.addEventListener('change', updateEditButton);
    });

    // Adiciona listeners para botões de edição existentes
    $$('.edit-tax').forEach(button => {
        button.addEventListener('click', function() {
            const taxId = this.getAttribute('data-id');
            editTax(taxId);
        });
    });

    // Event listener para o botão "Novo"
    const newTaxBtn = document.querySelector('[data-bs-target="#taxModal"]');
    if (newTaxBtn) {
        newTaxBtn.addEventListener('click', function(e) {
            e.preventDefault();
            resetTaxForm();
            if (taxModal) taxModal.show();
        });
    }

    // Event listener para o formulário
    if (elements.taxForm) {
        elements.taxForm.addEventListener('submit', handleFormSubmit);
    }

    function toggleSelectAll() {
        if (!elements.selectAll) return;
        $$('.tax-select').forEach(checkbox => {
            checkbox.checked = elements.selectAll.checked;
        });
        updateEditButton();
    }

    function updateEditButton() {
        if (!elements.editTaxBtn) return;
        const selectedTaxes = $$('.tax-select:checked');
        elements.editTaxBtn.disabled = selectedTaxes.length !== 1;
    }

    function editTax(taxId) {
        fetch(`/taxes/${taxId}/update/`)
            .then(response => response.json())
            .then(data => {
                Object.keys(data).forEach(key => {
                    const field = $(`id_${key}`);
                    if (field) {
                        if (field.type === 'checkbox') {
                            field.checked = data[key];
                        } else {
                            field.value = data[key];
                        }
                    }
                });
                $('tax_id').value = data.id;
                $('taxModalLabel').textContent = 'Editar Taxa/Imposto';
                if (taxModal) taxModal.show();
            })
            .catch(error => {
                console.error('Erro ao carregar dados da taxa:', error);
                showAlert('Erro ao carregar dados da taxa. Por favor, tente novamente.', 'danger');
            });
    }

    function handleFormSubmit(event) {
        event.preventDefault();
        const formData = new FormData(elements.taxForm);
        const taxId = $('tax_id')?.value;
        const url = taxId ? `/taxes/${taxId}/update/` : '/taxes/create/';

        fetch(url, {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': formData.get('csrfmiddlewaretoken')
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (taxModal) taxModal.hide();
                location.reload();
            } else {
                showFormErrors(data.errors);
            }
        })
        .catch(error => {
            console.error('Erro ao salvar taxa:', error);
            showAlert('Erro ao salvar taxa. Por favor, tente novamente.', 'danger');
        });
    }

    function resetTaxForm() {
        if (!elements.taxForm) return;
        elements.taxForm.reset();
        $('tax_id').value = '';
        $('taxModalLabel').textContent = 'Nova Taxa/Imposto';
        clearFormErrors();
    }

    function showFormErrors(errors) {
        clearFormErrors();
        Object.keys(errors).forEach(key => {
            const field = $(`id_${key}`);
            if (field) {
                field.classList.add('is-invalid');
                const feedback = document.createElement('div');
                feedback.className = 'invalid-feedback';
                feedback.textContent = errors[key].join(', ');
                field.parentNode.appendChild(feedback);
            }
        });
    }

    function clearFormErrors() {
        $$('.is-invalid').forEach(field => {
            field.classList.remove('is-invalid');
            const feedback = field.parentNode.querySelector('.invalid-feedback');
            if (feedback) feedback.remove();
        });
    }

    function showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.role = 'alert';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        const messagesContainer = document.querySelector('.messages');
        if (messagesContainer) {
            messagesContainer.appendChild(alertDiv);
            setTimeout(() => alertDiv.remove(), 5000);
        }
    }

    // Inicializa os listeners de pesquisa
    initializeSearchListeners();
});