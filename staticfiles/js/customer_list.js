document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const customerTable = document.getElementById('customerTable');
    const selectAll = document.getElementById('selectAll');
    const editCustomerBtn = document.getElementById('editCustomerBtn');
    const deleteCustomersBtn = document.getElementById('deleteCustomersBtn');
    const customerForm = document.getElementById('customerForm');
    const customerModalElement = document.getElementById('customerModal');
    const newCustomerBtn = document.querySelector('[data-bs-target="#customerModal"]');

    let customerModal;
    if (customerModalElement) {
      try {
        customerModal = new bootstrap.Modal(customerModalElement);
      } catch (error) {
        console.error("Error initializing modal:", error);
        // Fallback: basic show/hide methods
        customerModal = {
          show: () => customerModalElement.style.display = 'block',
          hide: () => customerModalElement.style.display = 'none'
        };
      }
    } else {
      console.error("Modal element not found");
    }

    // Event listeners
    if (searchButton) {
        searchButton.addEventListener('click', performSearch);
    }
    if (searchInput) {
        searchInput.addEventListener('keyup', function(event) {
            if (event.key === 'Enter') performSearch();
        });
    }
    if (selectAll) {
        selectAll.addEventListener('change', toggleSelectAll);
    }
    if (editCustomerBtn) {
        editCustomerBtn.addEventListener('click', editSelectedCustomer);
    }
    if (deleteCustomersBtn) {
        deleteCustomersBtn.addEventListener('click', deleteSelectedCustomers);
    }
    if (customerForm) {
        customerForm.addEventListener('submit', handleFormSubmit);
    }
    if (newCustomerBtn) {
        newCustomerBtn.addEventListener('click', function(event) {
            event.preventDefault();
            console.log("Botão 'Novo' clicado");
            try {
                resetCustomerForm();
                console.log("Formulário resetado");
                if (customerModal) {
                    customerModal.show();
                    console.log("Modal aberto");
                } else {
                    console.error("Objeto modal não inicializado");
                }
            } catch (error) {
                console.error("Erro ao abrir o modal:", error);
            }
        });
    } else {
        console.error("Botão 'Novo' não encontrado");
    }

    document.querySelectorAll('.edit-customer').forEach(btn => 
        btn.addEventListener('click', () => editCustomer(btn.getAttribute('data-id')))
    );
    document.querySelectorAll('.delete-customer').forEach(btn => 
        btn.addEventListener('click', () => deleteCustomer(btn.getAttribute('data-id')))
    );

    // Functions
    function performSearch() {
        if (!searchInput || !customerTable) return;
        const searchTerm = searchInput.value.toLowerCase();
        Array.from(customerTable.getElementsByTagName('tr'))
            .slice(1)
            .forEach(row => {
                const [_, name, type, document, email, phone] = Array.from(row.cells).map(cell => cell.textContent.toLowerCase());
                row.style.display = [name, type, document, email, phone].some(text => text.includes(searchTerm)) ? '' : 'none';
            });
    }

    function toggleSelectAll() {
        if (!selectAll) return;
        document.querySelectorAll('.customer-select').forEach(checkbox => checkbox.checked = selectAll.checked);
        updateActionButtons();
    }

    function updateActionButtons() {
        if (!editCustomerBtn || !deleteCustomersBtn) return;
        const selectedCount = document.querySelectorAll('.customer-select:checked').length;
        editCustomerBtn.disabled = selectedCount !== 1;
        deleteCustomersBtn.disabled = selectedCount === 0;
    }

    function editSelectedCustomer() {
        const selectedCustomer = document.querySelector('.customer-select:checked');
        if (selectedCustomer) editCustomer(selectedCustomer.getAttribute('data-id'));
    }

    function editCustomer(customerId) {
        fetch(`/customers/${customerId}/data/`)
            .then(response => response.json())
            .then(data => {
                Object.entries(data).forEach(([key, value]) => {
                    const field = document.getElementById(`id_${key}`);
                    if (field) {
                        if (field.type === 'checkbox') {
                            field.checked = value;
                        } else if (field.type === 'radio') {
                            document.querySelector(`input[name="${key}"][value="${value}"]`).checked = true;
                        } else {
                            field.value = value || '';
                        }
                    }
                });
                document.getElementById('customer_id').value = data.id;
                document.getElementById('customerModalLabel').textContent = 'Editar Cliente';
                customerModal.show();
            })
            .catch(error => console.error('Erro ao carregar dados do cliente:', error));
    }

    // function deleteSelectedCustomers() {
    //     const selectedCustomers = document.querySelectorAll('.customer-select:checked');
    //     if (selectedCustomers.length > 0 && confirm(`Tem certeza que deseja excluir ${selectedCustomers.length} cliente(s)?`)) {
    //         const customerIds = Array.from(selectedCustomers).map(checkbox => checkbox.getAttribute('data-id'));
    //         deleteCustomers(customerIds);
    //     }
    // }

    // function deleteCustomers(customerIds) {
    //     fetch('/customers/delete/', {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/json',
    //             'X-CSRFToken': getCookie('csrftoken')
    //         },
    //         body: JSON.stringify({ customer_ids: customerIds })
    //     })
    //     .then(response => response.json())
    //     .then(data => {
    //         if (data.success) {
    //             customerIds.forEach(id => document.querySelector(`tr[data-id="${id}"]`)?.remove());
    //             showAlert('Clientes excluídos com sucesso!', 'success');
    //             updateActionButtons();
    //         } else {
    //             showAlert('Erro ao excluir clientes. Por favor, tente novamente.', 'danger');
    //         }
    //     })
    //     .catch(error => {
    //         console.error('Erro ao excluir clientes:', error);
    //         showAlert('Erro ao excluir clientes. Por favor, tente novamente.', 'danger');
    //     });
    // }

    function deleteCustomer(customerId) {
        if (confirm('Tem certeza que deseja excluir este cliente?')) {
            fetch(`/customers/${customerId}/delete/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken')
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    document.querySelector(`tr[data-id="${customerId}"]`)?.remove();
                    showAlert('Cliente excluído com sucesso!', 'success');
                } else {
                    showAlert('Erro ao excluir cliente. Por favor, tente novamente.', 'danger');
                }
            })
            .catch(error => {
                console.error('Erro ao excluir cliente:', error);
                showAlert('Erro ao excluir cliente. Por favor, tente novamente.', 'danger');
            });
        }
    }

    function handleFormSubmit(event) {
        event.preventDefault();
        const formData = new FormData(customerForm);
        
        // Remove non-numeric characters from document field
        const documentField = document.getElementById('id_document');
        if (documentField) {
            const cleanDocument = documentField.value.replace(/\D/g, '');
            formData.set('document', cleanDocument);
        }

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
                location.reload();
            } else {
                showFormErrors(data.errors);
            }
        })
        .catch(error => console.error('Erro ao salvar cliente:', error));
    }

    function resetCustomerForm() {
        console.log("Iniciando reset do formulário");
        if (customerForm) {
            customerForm.reset();
            const customerIdField = document.getElementById('customer_id');
            if (customerIdField) customerIdField.value = '';
            const modalLabel = document.getElementById('customerModalLabel');
            if (modalLabel) modalLabel.textContent = 'Novo Cliente';
            clearFormErrors();
            console.log("Formulário resetado com sucesso");
        } else {
            console.error("Formulário não encontrado");
        }
    }

    function showFormErrors(errors) {
        clearFormErrors();
        Object.entries(errors).forEach(([key, messages]) => {
            const field = document.getElementById(`id_${key}`);
            if (field) {
                field.classList.add('is-invalid');
                const feedback = document.createElement('div');
                feedback.className = 'invalid-feedback';
                feedback.textContent = messages.join(', ');
                field.parentNode.appendChild(feedback);
            }
        });
    }

    function clearFormErrors() {
        if (!customerForm) return;
        customerForm.querySelectorAll('.is-invalid').forEach(field => {
            field.classList.remove('is-invalid');
            field.parentNode.querySelector('.invalid-feedback')?.remove();
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
        setTimeout(() => alertDiv.remove(), 5000);
    }

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }
});