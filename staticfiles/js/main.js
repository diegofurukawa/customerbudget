// Função para realizar pesquisa em tabelas
function performSearch(inputId, tableId, columnIndices) {
    const searchInput = document.getElementById(inputId);
    const table = document.getElementById(tableId);
    const searchTerm = searchInput.value.toLowerCase();
    const rows = table.getElementsByTagName('tr');

    for (let i = 1; i < rows.length; i++) {
        let found = false;
        for (let index of columnIndices) {
            const cellContent = rows[i].getElementsByTagName('td')[index].textContent.toLowerCase();
            if (cellContent.includes(searchTerm)) {
                found = true;
                break;
            }
        }
        rows[i].style.display = found ? '' : 'none';
    }
}

// Função para atualizar o estado do botão de edição
function updateEditButton(selectClass, editBtnId) {
    const selectedItems = document.querySelectorAll(`.${selectClass}:checked`);
    document.getElementById(editBtnId).disabled = selectedItems.length !== 1;
}

// Função para adicionar evento de seleção em todos os checkboxes
function setupSelectAll(selectAllId, itemClass) {
    const selectAll = document.getElementById(selectAllId);
    selectAll.addEventListener('change', function() {
        const checkboxes = document.getElementsByClassName(itemClass);
        for (let checkbox of checkboxes) {
            checkbox.checked = selectAll.checked;
        }
        updateEditButton(itemClass, `edit${itemClass.charAt(0).toUpperCase() + itemClass.slice(1)}Btn`);
    });
}

// Função para configurar o formulário modal
function setupModalForm(formId, modalId, url) {
    const form = document.getElementById(formId);
    const modal = new bootstrap.Modal(document.getElementById(modalId));

    form.addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData(form);
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
                modal.hide();
                location.reload();
            } else {
                // Mostrar erros de validação
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
        .catch(error => console.error(`Erro ao salvar: ${error}`));
    });
}

// Função para editar um item (cliente ou material)
function editItem(id, url, modalId, formPrefix) {
    fetch(`${url}${id}/data/`)
        .then(response => response.json())
        .then(data => {
            Object.keys(data).forEach(key => {
                const field = document.getElementById(`${formPrefix}${key}`);
                if (field) {
                    if (field.type === 'checkbox') {
                        field.checked = data[key];
                    } else {
                        field.value = data[key];
                    }
                }
            });
            document.getElementById(`${modalId}Label`).textContent = `Editar ${formPrefix.charAt(0).toUpperCase() + formPrefix.slice(1, -1)}`;
            new bootstrap.Modal(document.getElementById(modalId)).show();
        })
        .catch(error => console.error(`Erro ao carregar dados: ${error}`));
}

// Inicialização geral
document.addEventListener('DOMContentLoaded', function() {
    // Configurar pesquisa
    const searchButton = document.getElementById('searchButton');
    if (searchButton) {
        searchButton.addEventListener('click', () => performSearch('searchInput', 'itemTable', [1, 2]));
    }

    // Configurar select all e atualização do botão de edição
    setupSelectAll('selectAll', 'item-select');

    // Configurar formulário modal
    setupModalForm('itemForm', 'itemModal', '/items/');

    // Configurar botões de edição
    document.querySelectorAll('.edit-item').forEach(button => {
        button.addEventListener('click', function() {
            const itemId = this.getAttribute('data-id');
            editItem(itemId, '/items/', 'itemModal', 'id_');
        });
    });
});

document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const customerTable = document.getElementById('customerTable');
    const selectAll = document.getElementById('selectAll');
    const editCustomerBtn = document.getElementById('editCustomerBtn');
    const customerModal = new bootstrap.Modal(document.getElementById('customerModal'));
    const customerForm = document.getElementById('customerForm');

    function performSearch() {
        const searchTerm = searchInput.value.toLowerCase();
        const rows = customerTable.getElementsByTagName('tr');

        for (let i = 1; i < rows.length; i++) {
            const name = rows[i].getElementsByTagName('td')[1].textContent.toLowerCase();
            const document = rows[i].getElementsByTagName('td')[2].textContent.toLowerCase();
            const email = rows[i].getElementsByTagName('td')[4].textContent.toLowerCase();
            if (name.includes(searchTerm) || document.includes(searchTerm) || email.includes(searchTerm)) {
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
        const checkboxes = document.getElementsByClassName('customer-select');
        for (let checkbox of checkboxes) {
            checkbox.checked = selectAll.checked;
        }
        updateEditButton();
    });

    document.querySelectorAll('.customer-select').forEach(checkbox => {
        checkbox.addEventListener('change', updateEditButton);
    });

    function updateEditButton() {
        const selectedCustomers = document.querySelectorAll('.customer-select:checked');
        editCustomerBtn.disabled = selectedCustomers.length !== 1;
    }

    editCustomerBtn.addEventListener('click', function() {
        const selectedCustomer = document.querySelector('.customer-select:checked');
        if (selectedCustomer) {
            const customerId = selectedCustomer.getAttribute('data-id');
            editCustomer(customerId);
        }
    });

    document.querySelectorAll('.edit-customer').forEach(button => {
        button.addEventListener('click', function() {
            const customerId = this.getAttribute('data-id');
            editCustomer(customerId);
        });
    });

    function editCustomer(customerId) {
        fetch(`/customers/${customerId}/data/`)
            .then(response => response.json())
            .then(data => {
                document.getElementById('customer_id').value = data.id;
                document.getElementById('id_name').value = data.name;
                document.getElementById('id_document').value = data.document;
                document.querySelector(`input[name="customer_type"][value="${data.customer_type}"]`).checked = true;
                document.getElementById('id_birth_date').value = data.birth_date;
                document.getElementById('id_phone').value = data.phone;
                document.getElementById('id_email').value = data.email;
                document.getElementById('id_address').value = data.address;
                document.getElementById('id_address_complement').value = data.address_complement;

                document.getElementById('customerModalLabel').textContent = 'Editar Cliente';
                customerModal.show();
            })
            .catch(error => console.error('Erro ao carregar dados do cliente:', error));
    }

    customerForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData(customerForm);
        fetch('/customers/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': formData.get('csrfmiddlewaretoken')
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                customerModal.hide();
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
        .catch(error => console.error('Erro ao salvar cliente:', error));
    });

    // Limpa o formulário e reseta o título ao abrir o modal para novo cliente
    document.querySelector('[data-bs-target="#customerModal"]').addEventListener('click', function() {
        customerForm.reset();
        document.getElementById('customer_id').value = '';
        document.getElementById('customerModalLabel').textContent = 'Novo Cliente';
    });
});



/* =============================================
    Material_List
=============================================*/
document.addEventListener('DOMContentLoaded', function() {
    const materialTable = document.getElementById('materialTable');
    const selectAll = document.getElementById('selectAll');
    const editMaterialBtn = document.getElementById('editMaterialBtn');
    const materialModal = new bootstrap.Modal(document.getElementById('materialModal'));
    const materialForm = document.getElementById('materialForm');

    // Função para atualizar o botão de edição
    function updateEditButton() {
        const selectedMaterials = document.querySelectorAll('.material-select:checked');
        editMaterialBtn.disabled = selectedMaterials.length !== 1;
    }

    // Evento para o checkbox "Selecionar Todos"
    selectAll.addEventListener('change', function() {
        const checkboxes = document.getElementsByClassName('material-select');
        for (let checkbox of checkboxes) {
            checkbox.checked = selectAll.checked;
        }
        updateEditButton();
    });

    // Evento para os checkboxes individuais
    document.querySelectorAll('.material-select').forEach(checkbox => {
        checkbox.addEventListener('change', updateEditButton);
    });

    // Função para editar material
    function editMaterial(materialId) {
        fetch(`/materials/${materialId}/data/`)
            .then(response => response.json())
            .then(data => {
                document.getElementById('material_id').value = data.id;
                document.getElementById('id_full_name').value = data.full_name;
                document.getElementById('id_nick_name').value = data.nick_name;
                document.getElementById('id_description').value = data.description;
                document.getElementById('id_ean_code').value = data.ean_code;
                document.getElementById('id_active').checked = data.active;

                document.getElementById('materialModalLabel').textContent = 'Editar Material';
                materialModal.show();
            })
            .catch(error => console.error('Erro ao carregar dados do material:', error));
    }

    // Evento para o botão de edição geral
    editMaterialBtn.addEventListener('click', function() {
        const selectedMaterial = document.querySelector('.material-select:checked');
        if (selectedMaterial) {
            editMaterial(selectedMaterial.getAttribute('data-id'));
        }
    });

    // Eventos para os botões de edição individuais
    document.querySelectorAll('.edit-material').forEach(button => {
        button.addEventListener('click', function() {
            editMaterial(this.getAttribute('data-id'));
        });
    });

    // Função para excluir material
    function deleteMaterial(materialId) {
        if (confirm('Tem certeza que deseja excluir este material?')) {
            fetch('/materials/delete/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({ material_ids: [materialId] })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    location.reload();
                } else {
                    alert('Erro ao excluir material: ' + data.error);
                }
            })
            .catch(error => console.error('Erro ao excluir material:', error));
        }
    }

    // Eventos para os botões de exclusão individuais
    document.querySelectorAll('.delete-material').forEach(button => {
        button.addEventListener('click', function() {
            deleteMaterial(this.getAttribute('data-id'));
        });
    });

    // Evento de submissão do formulário
    materialForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData(materialForm);
        fetch('/materials/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': formData.get('csrfmiddlewaretoken')
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                materialModal.hide();
                location.reload();
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
        .catch(error => console.error('Erro ao salvar material:', error));
    });

    // Limpa o formulário ao abrir o modal para novo material
    document.querySelector('[data-bs-toggle="modal"][data-bs-target="#materialModal"]').addEventListener('click', function() {
        materialForm.reset();
        document.getElementById('material_id').value = '';
        document.getElementById('materialModalLabel').textContent = 'Novo Material';
    });

    // Função auxiliar para obter o valor do cookie CSRF
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
});