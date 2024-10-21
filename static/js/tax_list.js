document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const taxTable = document.getElementById('taxTable');
    const selectAll = document.getElementById('selectAll');
    const editTaxBtn = document.getElementById('editTaxBtn');
    const taxModal = new bootstrap.Modal(document.getElementById('taxModal'));
    const taxForm = document.getElementById('taxForm');

    function performSearch() {
        const searchTerm = searchInput.value.toLowerCase();
        const rows = taxTable.getElementsByTagName('tr');

        for (let i = 1; i < rows.length; i++) {
            const description = rows[i].getElementsByTagName('td')[1].textContent.toLowerCase();
            const acronym = rows[i].getElementsByTagName('td')[3].textContent.toLowerCase();
            if (description.includes(searchTerm) || acronym.includes(searchTerm)) {
                rows[i].style.display = '';
            } else {
                rows[i].style.display = 'none';
            }
        }
    }

    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            performSearch();
        }
    });

    selectAll.addEventListener('change', function() {
        const checkboxes = document.getElementsByClassName('tax-select');
        for (let checkbox of checkboxes) {
            checkbox.checked = selectAll.checked;
        }
        updateEditButton();
    });

    document.querySelectorAll('.tax-select').forEach(checkbox => {
        checkbox.addEventListener('change', updateEditButton);
    });

    function updateEditButton() {
        const selectedTaxes = document.querySelectorAll('.tax-select:checked');
        editTaxBtn.disabled = selectedTaxes.length !== 1;
    }

    editTaxBtn.addEventListener('click', function() {
        const selectedTax = document.querySelector('.tax-select:checked');
        if (selectedTax) {
            const taxId = selectedTax.getAttribute('data-id');
            editTax(taxId);
        }
    });

    document.querySelectorAll('.edit-tax').forEach(button => {
        button.addEventListener('click', function() {
            const taxId = this.getAttribute('data-id');
            editTax(taxId);
        });
    });

    function editTax(taxId) {
        fetch(`/taxes/${taxId}/update/`)
            .then(response => response.json())
            .then(data => {
                document.getElementById('tax_id').value = data.id;
                document.getElementById('id_description').value = data.description;
                document.getElementById('id_type').value = data.type;
                document.getElementById('id_acronym').value = data.acronym;
                document.getElementById('id_group').value = data.group;
                document.getElementById('id_calc_operator').value = data.calc_operator;
                document.getElementById('id_value').value = data.value;
                document.getElementById('id_enabled').checked = data.enabled;

                document.getElementById('taxModalLabel').textContent = 'Editar Taxa/Imposto';
                taxModal.show();
            })
            .catch(error => console.error('Erro ao carregar dados da taxa/imposto:', error));
    }

    taxForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData(taxForm);
        const taxId = document.getElementById('tax_id').value;
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
                taxModal.hide();
                location.reload(); // Recarrega a página para mostrar as alterações
            } else {
                // Mostra erros de validação
                Object.keys(data.errors).forEach(key => {
                    const field = document.getElementById(`id_${key}`);
                    field.classList.add('is-invalid');
                    const feedback = field.nextElementSibling || document.createElement('div');
                    feedback.className = 'invalid-feedback';
                    feedback.textContent = data.errors[key].join(', ');
                    if (!field.nextElementSibling) {
                        field.parentNode.appendChild(feedback);
                    }
                });
            }
        })
        .catch(error => console.error('Erro ao salvar taxa/imposto:', error));
    });

    // Limpa o formulário e reseta o título ao abrir o modal para nova taxa/imposto
    document.querySelector('[data-bs-target="#taxModal"]').addEventListener('click', function() {
        taxForm.reset();
        document.getElementById('tax_id').value = '';
        document.getElementById('taxModalLabel').textContent = 'Nova Taxa/Imposto';
    });
});