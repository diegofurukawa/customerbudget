document.addEventListener('DOMContentLoaded', function() {
    const priceTable = document.getElementById('priceTable');
    const selectAll = document.getElementById('selectAll');
    const editPriceBtn = document.getElementById('editPriceBtn');
    const priceModal = new bootstrap.Modal(document.getElementById('priceModal'));
    const priceForm = document.getElementById('priceForm');

    // Seleção de linhas e atualização do botão de edição
    selectAll.addEventListener('change', function() {
        const checkboxes = document.getElementsByClassName('price-select');
        for (let checkbox of checkboxes) {
            checkbox.checked = selectAll.checked;
        }
        updateEditButton();
    });

    document.querySelectorAll('.price-select').forEach(checkbox => {
        checkbox.addEventListener('change', updateEditButton);
    });

    function updateEditButton() {
        const selectedPrices = document.querySelectorAll('.price-select:checked');
        editPriceBtn.disabled = selectedPrices.length !== 1;
    }

    // Edição de preço
    editPriceBtn.addEventListener('click', function() {
        const selectedPrice = document.querySelector('.price-select:checked');
        if (selectedPrice) {
            const priceId = selectedPrice.getAttribute('data-id');
            editPrice(priceId);
        }
    });

    document.querySelectorAll('.edit-price').forEach(button => {
        button.addEventListener('click', function() {
            const priceId = this.getAttribute('data-id');
            editPrice(priceId);
        });
    });

    function editPrice(priceId) {
        fetch(`/price-list/${priceId}/data/`)
            .then(response => response.json())
            .then(data => {
                document.getElementById('price_list_id').value = data.id;
                document.getElementById('id_material').value = data.material;
                document.getElementById('id_value').value = data.value;
                document.getElementById('id_tax').value = data.tax || '';
                document.getElementById('id_type_tax').value = data.type_tax;
                document.getElementById('id_start_date').value = data.start_date;
                document.getElementById('id_end_date').value = data.end_date || '';
                document.getElementById('id_active').checked = data.active;

                document.getElementById('priceModalLabel').textContent = 'Editar Preço';
                priceModal.show();
            })
            .catch(error => console.error('Erro ao carregar dados do preço:', error));
    }

    // Salvar preço (novo ou editado)
    priceForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData(priceForm);
        fetch('/price-list/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': formData.get('csrfmiddlewaretoken')
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                priceModal.hide();
                updateOrAddTableRow(data);
                showAlert('Preço salvo com sucesso!', 'success');
            } else {
                showFormErrors(data.errors);
            }
        })
        .catch(error => {
            console.error('Erro ao salvar preço:', error);
            showAlert('Erro ao salvar preço. Por favor, tente novamente.', 'danger');
        });
    });

    // Exclusão de preço
    document.querySelectorAll('.delete-price').forEach(button => {
        button.addEventListener('click', function() {
            const priceId = this.getAttribute('data-id');
            if (confirm('Tem certeza que deseja excluir este preço?')) {
                deletePrice(priceId);
            }
        });
    });

    function deletePrice(priceId) {
        fetch(`/price-list/${priceId}/delete/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const row = document.querySelector(`tr[data-id="${priceId}"]`);
                if (row) row.remove();
                showAlert('Preço excluído com sucesso!', 'success');
            } else {
                showAlert('Erro ao excluir preço. Por favor, tente novamente.', 'danger');
            }
        })
        .catch(error => {
            console.error('Erro ao excluir preço:', error);
            showAlert('Erro ao excluir preço. Por favor, tente novamente.', 'danger');
        });
    }

    // Funções auxiliares
    function updateOrAddTableRow(data) {
        const existingRow = document.querySelector(`tr[data-id="${data.id}"]`);
        const newRow = `
            <tr data-id="${data.id}">
                <td><input type="checkbox" class="price-select" data-id="${data.id}"></td>
                <td>${data.material}</td>
                <td>R$ ${data.value.toFixed(2)}</td>
                <td>${data.tax ? data.tax : '-'}</td>
                <td>R$ ${data.value_total.toFixed(2)}</td>
                <td>${data.start_date}</td>
                <td>${data.end_date}</td>
                <td>${data.active ? 'Sim' : 'Não'}</td>
                <td>
                    <button class="btn btn-edit btn-sm edit-price" data-id="${data.id}">Editar</button>
                    <button class="btn btn-danger btn-sm delete-price" data-id="${data.id}">Excluir</button>
                </td>
            </tr>
        `;
        if (existingRow) {
            existingRow.outerHTML = newRow;
        } else {
            const tbody = priceTable.querySelector('tbody');
            tbody.insertAdjacentHTML('afterbegin', newRow);
        }
    }

    function showFormErrors(errors) {
        Object.keys(errors).forEach(key => {
            const field = document.getElementById(`id_${key}`);
            field.classList.add('is-invalid');
            const feedback = field.nextElementSibling || document.createElement('div');
            feedback.className = 'invalid-feedback';
            feedback.textContent = errors[key].join(', ');
            if (!field.nextElementSibling) {
                field.parentNode.appendChild(feedback);
            }
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
        document.querySelector('.messages').appendChild(alertDiv);
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }

    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    // Limpar formulário ao abrir modal para novo preço
    document.querySelector('[data-bs-target="#priceModal"]').addEventListener('click', function() {
        priceForm.reset();
        document.getElementById('price_list_id').value = '';
        document.getElementById('priceModalLabel').textContent = 'Novo Preço';
        document.querySelectorAll('.is-invalid').forEach(field => field.classList.remove('is-invalid'));
        document.querySelectorAll('.invalid-feedback').forEach(feedback => feedback.textContent = '');
    });
});